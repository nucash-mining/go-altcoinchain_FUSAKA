const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let gethProcess = null;
let splashWindow = null;

// Paths
const isPackaged = app.isPackaged;
const appPath = isPackaged ? path.dirname(app.getPath('exe')) : path.join(__dirname, '..');
const dataDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'Altcoinchain')
    : path.join(process.env.HOME, '.altcoinchain');
const walletsDir = path.join(dataDir, 'wallets');
const tokensFile = path.join(dataDir, 'tokens.json');

// Ensure directories exist
if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true });
}

// Geth path
function getGethPath() {
    const gethName = process.platform === 'win32' ? 'geth.exe' : 'geth';

    // Check multiple locations
    const locations = [
        path.join(appPath, 'build', 'bin', gethName),
        path.join(appPath, gethName),
        path.join(__dirname, '..', 'build', 'bin', gethName),
        gethName // System PATH
    ];

    for (const loc of locations) {
        if (fs.existsSync(loc)) {
            return loc;
        }
    }
    return gethName;
}

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadURL(`data:text/html,
        <html>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:20px;font-family:system-ui;">
            <div style="text-align:center;color:white;">
                <div style="width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:20px;"></div>
                <h2 style="margin:0 0 10px;">Altcoinchain Wallet</h2>
                <p style="opacity:0.7;margin:0;">Starting node...</p>
                <div style="margin-top:20px;width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:20px auto 0;"></div>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        </body>
        </html>
    `);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 850,
        minWidth: 1000,
        minHeight: 700,
        frame: false,
        show: false,
        backgroundColor: '#0f172a',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
        mainWindow.show();
    });

    // Create menu
    const template = [
        {
            label: 'File',
            submenu: [
                { label: 'New Wallet', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-action', 'new-wallet') },
                { label: 'Import Wallet', accelerator: 'CmdOrCtrl+I', click: () => mainWindow.webContents.send('menu-action', 'import-wallet') },
                { type: 'separator' },
                { label: 'Backup Wallet', click: () => backupWallet() },
                { type: 'separator' },
                { label: 'Open Data Directory', click: () => shell.openPath(dataDir) },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Node',
            submenu: [
                { label: 'Start Node', click: () => startGeth() },
                { label: 'Stop Node', click: () => stopGeth() },
                { type: 'separator' },
                { label: 'Connect to Local', click: () => mainWindow.webContents.send('connect-rpc', 'http://127.0.0.1:8545') },
                { label: 'Connect to Mainnet', click: () => mainWindow.webContents.send('connect-rpc', 'https://alt-rpc2.minethepla.net') }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                { label: 'Altcoinchain Website', click: () => shell.openExternal('https://altcoinchain.org') },
                { label: 'Block Explorer', click: () => shell.openExternal('https://explorer.altcoinchain.org') },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Altcoinchain Wallet',
                            message: 'Altcoinchain Wallet v1.0.0',
                            detail: 'Hybrid PoW/PoS Desktop Wallet\n\nChain ID: 2330\nHybrid Fork: Block 7,000,000\n\nStaking Contract:\n0x87f0bd245507e5a94cdb03472501a9f522a9e0f1'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function checkExistingNode() {
    try {
        const http = require('http');
        return new Promise((resolve) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 8545,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeout: 2000
            }, (res) => {
                resolve(true);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.write(JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }));
            req.end();
        });
    } catch (e) {
        return false;
    }
}

async function startGeth() {
    // Check if node is already running externally
    const nodeRunning = await checkExistingNode();
    if (nodeRunning) {
        console.log('External geth node detected, using existing instance');
        if (mainWindow) {
            mainWindow.webContents.send('node-status', { running: true, message: 'Connected to existing node' });
        }
        return;
    }

    if (gethProcess) {
        if (mainWindow) {
            mainWindow.webContents.send('node-status', { running: true, message: 'Node already running' });
        }
        return;
    }

    const gethPath = getGethPath();
    console.log('Starting geth from:', gethPath);

    const args = [
        '--datadir', dataDir,
        '--networkid', '2330',
        '--http',
        '--http.addr', '127.0.0.1',
        '--http.port', '8545',
        '--http.api', 'eth,net,web3,personal,miner,txpool,admin',
        '--http.corsdomain', '*',
        '--syncmode', 'full',
        '--verbosity', '3'
    ];

    try {
        gethProcess = spawn(gethPath, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        gethProcess.stdout.on('data', (data) => {
            const log = data.toString();
            console.log('geth:', log);
            if (mainWindow) {
                mainWindow.webContents.send('node-log', log);
            }
        });

        gethProcess.stderr.on('data', (data) => {
            const log = data.toString();
            console.log('geth:', log);
            if (mainWindow) {
                mainWindow.webContents.send('node-log', log);
            }
        });

        gethProcess.on('close', (code) => {
            console.log(`geth exited with code ${code}`);
            gethProcess = null;
            if (mainWindow) {
                mainWindow.webContents.send('node-status', { running: false, message: `Node stopped (code ${code})` });
            }
        });

        gethProcess.on('error', (err) => {
            console.error('Failed to start geth:', err);
            gethProcess = null;
            if (mainWindow) {
                mainWindow.webContents.send('node-status', { running: false, message: `Failed: ${err.message}` });
                mainWindow.webContents.send('node-log', `Error: ${err.message}`);
            }
        });

        if (mainWindow) {
            mainWindow.webContents.send('node-status', { running: true, message: 'Node starting...' });
        }

    } catch (err) {
        console.error('Failed to start geth:', err);
        if (mainWindow) {
            mainWindow.webContents.send('node-log', `Error: ${err.message}`);
        }
    }
}

function stopGeth() {
    if (gethProcess) {
        gethProcess.kill('SIGTERM');
        gethProcess = null;
        if (mainWindow) {
            mainWindow.webContents.send('node-status', { running: false, message: 'Node stopped' });
        }
    }
}

function backupWallet() {
    dialog.showSaveDialog(mainWindow, {
        title: 'Backup Wallets',
        defaultPath: `altcoinchain-wallets-backup-${Date.now()}.zip`,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    }).then(result => {
        if (!result.canceled && result.filePath) {
            // Simple copy for now
            const files = fs.readdirSync(walletsDir);
            mainWindow.webContents.send('show-message', {
                type: 'info',
                message: `Found ${files.length} wallet files. Manual backup: ${walletsDir}`
            });
        }
    });
}

// IPC Handlers
ipcMain.handle('get-node-status', () => {
    return { running: gethProcess !== null };
});

ipcMain.handle('start-node', () => {
    startGeth();
    return { success: true };
});

ipcMain.handle('stop-node', () => {
    stopGeth();
    return { success: true };
});

ipcMain.handle('get-wallets', () => {
    try {
        const files = fs.readdirSync(walletsDir);
        return files.filter(f => f.endsWith('.json')).map(f => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(walletsDir, f), 'utf8'));
                return {
                    filename: f,
                    address: content.address ? (content.address.startsWith('0x') ? content.address : '0x' + content.address) : null,
                    name: content.name || f.replace('.json', '')
                };
            } catch (e) {
                return { filename: f, address: null, name: f };
            }
        });
    } catch (e) {
        return [];
    }
});

ipcMain.handle('save-wallet', (event, { filename, content }) => {
    try {
        fs.writeFileSync(path.join(walletsDir, filename), JSON.stringify(content, null, 2));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('load-wallet', (event, filename) => {
    try {
        const content = fs.readFileSync(path.join(walletsDir, filename), 'utf8');
        return { success: true, content: JSON.parse(content) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('delete-wallet', (event, filename) => {
    try {
        fs.unlinkSync(path.join(walletsDir, filename));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-tokens', () => {
    try {
        if (fs.existsSync(tokensFile)) {
            return JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        }
        return [];
    } catch (e) {
        return [];
    }
});

ipcMain.handle('save-tokens', (event, tokens) => {
    try {
        fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('window-action', (event, action) => {
    switch (action) {
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
            break;
        case 'close':
            mainWindow.close();
            break;
    }
});

ipcMain.handle('open-data-dir', () => {
    shell.openPath(dataDir);
});

ipcMain.handle('get-data-dir', () => {
    return dataDir;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('write-file', (event, { path: filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// App lifecycle
app.whenReady().then(() => {
    createSplashWindow();

    // Start node automatically (like Bitcoin-Qt)
    setTimeout(() => {
        startGeth();
        createWindow();
    }, 1000);
});

app.on('window-all-closed', () => {
    stopGeth();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    stopGeth();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
