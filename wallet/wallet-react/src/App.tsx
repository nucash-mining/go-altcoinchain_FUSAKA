import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import MatrixRain from './components/MatrixRain';
import Scanlines from './components/Scanlines';
import GlitchOverlay from './components/GlitchOverlay';
import WebGPUMiner from './components/WebGPUMiner';
import NativeMinerInstaller from './components/NativeMinerInstaller';
import {
  Wallet, Send, Download, Plus, Trash2, Copy, Eye, EyeOff,
  RefreshCw, Zap, Coins, Globe, Server, X, Check, AlertTriangle,
  ChevronRight, Database, Activity, Image, ArrowLeftRight, Search,
  ExternalLink, TrendingUp, TrendingDown, MoreHorizontal, Cpu, Play, Square,
  Sun, Moon, Monitor
} from 'lucide-react';
import './index.css';

// Constants
const CHAIN_ID = 2330;
const RPC_URL = 'http://127.0.0.1:8332';
const STAKING_CONTRACT = '0x87f0bd245507e5a94cdb03472501a9f522a9e0f1';
const MIN_STAKE = 32;
const TOKENS_STORAGE_KEY = 'altcoinchain_tokens';
const NFTS_STORAGE_KEY = 'altcoinchain_nfts';

// Known tokens on Altcoinchain - these will be auto-scanned
const KNOWN_TOKENS: Token[] = [
  {
    address: '0x6645143e49B3a15d8F205658903a55E520444698',
    symbol: 'WATT',
    name: 'WATT Token',
    decimals: 18,
  }
];

// Default tokens to always show
const DEFAULT_TOKENS: Token[] = [...KNOWN_TOKENS];

// Known NFT collections on Altcoinchain
const KNOWN_NFT_COLLECTIONS = [
  {
    address: '0xf9670e5D46834561813CA79854B3d7147BBbFfb2',
    name: 'Mining Game',
    maxTokenId: 6, // Check token IDs 1-6
  }
];

// Default NFT collection
const DEFAULT_NFT_CONTRACT = '0xf9670e5D46834561813CA79854B3d7147BBbFfb2';
const DEFAULT_NFT_IDS = ['1', '2', '3', '4', '5', '6'];

// Types
interface WalletData {
  filename: string;
  address: string;
  name: string;
  keystore?: any;
}

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  price?: number;
  change24h?: number;
  logo?: string;
}

interface NFT {
  address: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  collection?: string;
}

// ERC20 ABI for token interactions
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// ERC721 ABI for NFT interactions
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function balanceOf(address owner) view returns (uint256)'
];

// Electron API interface
declare global {
  interface Window {
    electronAPI?: {
      getWallets: () => Promise<WalletData[]>;
      saveWallet: (filename: string, content: any) => Promise<{success: boolean}>;
      loadWallet: (filename: string) => Promise<{success: boolean; content: any}>;
      deleteWallet: (filename: string) => Promise<{success: boolean}>;
      getTokens: () => Promise<Token[]>;
      saveTokens: (tokens: Token[]) => Promise<{success: boolean}>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      platform: string;
    };
  }
}

// LocalStorage fallback for browser mode
const WALLETS_STORAGE_KEY = 'altcoinchain_wallets';

const localStorageAPI = {
  getWallets: (): WalletData[] => {
    try {
      const data = localStorage.getItem(WALLETS_STORAGE_KEY);
      if (!data) return [];
      const wallets = JSON.parse(data);
      return wallets.map((w: any) => ({
        filename: w.filename,
        address: w.keystore?.address ? `0x${w.keystore.address}` : w.address,
        name: w.keystore?.name || w.name || 'Wallet',
        keystore: w.keystore
      }));
    } catch {
      return [];
    }
  },
  saveWallet: (filename: string, content: any): boolean => {
    try {
      const wallets = localStorageAPI.getWallets();
      const existing = wallets.findIndex(w => w.filename === filename);
      const walletData = {
        filename,
        address: content.address ? `0x${content.address}` : '',
        name: content.name || 'Wallet',
        keystore: content
      };
      if (existing >= 0) {
        wallets[existing] = walletData;
      } else {
        wallets.push(walletData);
      }
      // Store the full keystore data
      const storageData = wallets.map(w => ({
        filename: w.filename,
        address: w.address,
        name: w.name,
        keystore: w.keystore
      }));
      localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(storageData));
      return true;
    } catch {
      return false;
    }
  },
  loadWallet: (filename: string): { success: boolean; content: any } => {
    try {
      const data = localStorage.getItem(WALLETS_STORAGE_KEY);
      if (!data) return { success: false, content: null };
      const wallets = JSON.parse(data);
      const wallet = wallets.find((w: any) => w.filename === filename);
      if (wallet?.keystore) {
        return { success: true, content: wallet.keystore };
      }
      return { success: false, content: null };
    } catch {
      return { success: false, content: null };
    }
  },
  deleteWallet: (filename: string): boolean => {
    try {
      const wallets = localStorageAPI.getWallets().filter(w => w.filename !== filename);
      localStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets));
      return true;
    } catch {
      return false;
    }
  }
};

// Token localStorage API
const tokenStorageAPI = {
  getTokens: (): Token[] => {
    try {
      const data = localStorage.getItem(TOKENS_STORAGE_KEY);
      if (!data) {
        // Initialize with default tokens
        localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(DEFAULT_TOKENS));
        return DEFAULT_TOKENS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TOKENS;
    }
  },
  saveTokens: (tokens: Token[]): boolean => {
    try {
      localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
      return true;
    } catch {
      return false;
    }
  },
  addToken: (token: Token): boolean => {
    try {
      const tokens = tokenStorageAPI.getTokens();
      if (tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase())) {
        return false; // Already exists
      }
      tokens.push(token);
      return tokenStorageAPI.saveTokens(tokens);
    } catch {
      return false;
    }
  },
  removeToken: (address: string): boolean => {
    try {
      const tokens = tokenStorageAPI.getTokens().filter(
        t => t.address.toLowerCase() !== address.toLowerCase()
      );
      return tokenStorageAPI.saveTokens(tokens);
    } catch {
      return false;
    }
  }
};

// NFT localStorage API
const nftStorageAPI = {
  getNFTs: (): NFT[] => {
    try {
      const data = localStorage.getItem(NFTS_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },
  saveNFTs: (nfts: NFT[]): boolean => {
    try {
      localStorage.setItem(NFTS_STORAGE_KEY, JSON.stringify(nfts));
      return true;
    } catch {
      return false;
    }
  }
};

function App() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'send' | 'receive' | 'stake' | 'tokens' | 'mine'>('dashboard');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [currentWallet, setCurrentWallet] = useState<WalletData | null>(null);
  const [balance, setBalance] = useState<string>('0.0000');
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [password, setPassword] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [newWalletData, setNewWalletData] = useState<{address: string; privateKey: string} | null>(null);

  // Mining state
  const [isMining, setIsMining] = useState(false);
  const [hashrate, setHashrate] = useState<string>('0');
  const [coinbase, setCoinbase] = useState<string>('');
  const [miningThreads, setMiningThreads] = useState<number>(1);
  const [miningMode, setMiningMode] = useState<'cpu' | 'gpu'>('cpu');
  const [gpuType, setGpuType] = useState<'nvidia' | 'amd' | 'both'>('nvidia');
  const [stratumPort, setStratumPort] = useState<number>(3333);

  // Node stats
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [nodeVersion, setNodeVersion] = useState<string>('');
  const [networkId, setNetworkId] = useState<number>(0);
  const [pendingTxCount, setPendingTxCount] = useState<number>(0);

  // NFT state
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [tokenSubTab, setTokenSubTab] = useState<'tokens' | 'nfts'>('tokens');

  // Theme state
  const [theme, setTheme] = useState<'matrix' | 'dark' | 'light'>(() => {
    const saved = localStorage.getItem('altcoinchain-theme');
    return (saved as 'matrix' | 'dark' | 'light') || 'matrix';
  });

  // Form states
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletPassword, setNewWalletPassword] = useState('');
  const [newWalletPassword2, setNewWalletPassword2] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');

  // Token form states
  const [newTokenAddress, setNewTokenAddress] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenSymbol, setNewTokenSymbol] = useState('');
  const [newTokenDecimals, setNewTokenDecimals] = useState('18');
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);

  // Token send/receive states
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokenSendTo, setTokenSendTo] = useState('');
  const [tokenSendAmount, setTokenSendAmount] = useState('');
  const [sendingToken, setSendingToken] = useState(false);

  // RPC Call helper
  const rpcCall = useCallback(async (method: string, params: any[] = []) => {
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
      });
      const data = await res.json();
      return data.error ? null : data.result;
    } catch (e) {
      return null;
    }
  }, []);

  // RPC Call that returns full response (for methods that return null on success)
  const rpcCallRaw = useCallback(async (method: string, params: any[] = []): Promise<{success: boolean; result: any; error?: string}> => {
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
      });
      const data = await res.json();
      if (data.error) {
        return { success: false, result: null, error: data.error.message };
      }
      return { success: true, result: data.result };
    } catch (e: any) {
      return { success: false, result: null, error: e.message };
    }
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load wallets
  const loadWallets = useCallback(async () => {
    let w: WalletData[] = [];
    if (window.electronAPI) {
      w = await window.electronAPI.getWallets();
    } else {
      // Fallback to localStorage for browser mode
      w = localStorageAPI.getWallets();
    }
    setWallets(w);
    if (w.length > 0 && !currentWallet) {
      setCurrentWallet(w[0]);
    }
  }, [currentWallet]);

  // Update network info
  const updateNetworkInfo = useCallback(async () => {
    const block = await rpcCall('eth_blockNumber');
    if (block) setBlockNumber(parseInt(block, 16));

    const peers = await rpcCall('net_peerCount');
    if (peers) setPeerCount(parseInt(peers, 16));

    const syncStatus = await rpcCall('eth_syncing');
    if (syncStatus === false) {
      setSyncing(false);
      setSyncProgress(100);
    } else if (syncStatus) {
      setSyncing(true);
      const current = parseInt(syncStatus.currentBlock, 16);
      const highest = parseInt(syncStatus.highestBlock, 16);
      setSyncProgress((current / highest) * 100);
    }

    // Check mining status
    const mining = await rpcCall('eth_mining');
    setIsMining(mining === true);

    const hr = await rpcCall('eth_hashrate');
    if (hr) {
      const hrNum = parseInt(hr, 16);
      if (hrNum > 1000000000) {
        setHashrate((hrNum / 1000000000).toFixed(2) + ' GH/s');
      } else if (hrNum > 1000000) {
        setHashrate((hrNum / 1000000).toFixed(2) + ' MH/s');
      } else if (hrNum > 1000) {
        setHashrate((hrNum / 1000).toFixed(2) + ' KH/s');
      } else {
        setHashrate(hrNum + ' H/s');
      }
    }

    const cb = await rpcCall('eth_coinbase');
    if (cb) setCoinbase(cb);

    // Additional node stats
    const gp = await rpcCall('eth_gasPrice');
    if (gp) {
      const gpGwei = parseInt(gp, 16) / 1e9;
      setGasPrice(gpGwei.toFixed(2));
    }

    const netId = await rpcCall('net_version');
    if (netId) setNetworkId(parseInt(netId));

    const pending = await rpcCall('eth_getBlockTransactionCountByNumber', ['pending']);
    if (pending) setPendingTxCount(parseInt(pending, 16));

    const nodeInfo = await rpcCall('web3_clientVersion');
    if (nodeInfo) setNodeVersion(nodeInfo);
  }, [rpcCall]);

  // Start mining
  const startMining = async () => {
    if (!currentWallet?.address) {
      showToast('Please select a wallet first', 'error');
      return;
    }

    // Set coinbase to current wallet
    const setResult = await rpcCallRaw('miner_setEtherbase', [currentWallet.address]);
    if (!setResult.success) {
      showToast('Failed to set mining address: ' + (setResult.error || 'Unknown error'), 'error');
      return;
    }

    // Start miner with specified threads
    const startResult = await rpcCallRaw('miner_start', [miningThreads]);
    if (!startResult.success) {
      showToast('Failed to start mining: ' + (startResult.error || 'Make sure node has miner API enabled'), 'error');
      return;
    }

    showToast(`Mining started with ${miningThreads} thread(s)!`);
    setIsMining(true);
  };

  // Stop mining
  const stopMining = async () => {
    const result = await rpcCallRaw('miner_stop');
    if (!result.success) {
      showToast('Failed to stop mining: ' + (result.error || 'Unknown error'), 'error');
      return;
    }
    showToast('Mining stopped');
    setIsMining(false);
  };

  // Set coinbase address
  const setCoinbaseAddress = async (address: string) => {
    if (!ethers.isAddress(address)) {
      showToast('Invalid address', 'error');
      return;
    }
    const result = await rpcCall('miner_setEtherbase', [address]);
    if (result) {
      showToast('Mining address updated');
      setCoinbase(address);
    } else {
      showToast('Failed to set mining address', 'error');
    }
  };

  // Update balance
  const updateBalance = useCallback(async () => {
    if (!currentWallet?.address) return;
    const bal = await rpcCall('eth_getBalance', [currentWallet.address, 'latest']);
    if (bal) {
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    }
  }, [currentWallet, rpcCall]);

  // Load tokens from storage, auto-scan known tokens, and update balances
  const loadTokens = useCallback(async () => {
    let storedTokens = tokenStorageAPI.getTokens();

    if (currentWallet?.address) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);

      // Auto-scan known tokens and add any with balance
      for (const knownToken of KNOWN_TOKENS) {
        const alreadyAdded = storedTokens.find(
          t => t.address.toLowerCase() === knownToken.address.toLowerCase()
        );
        if (!alreadyAdded) {
          try {
            const contract = new ethers.Contract(knownToken.address, ERC20_ABI, provider);
            const balance = await contract.balanceOf(currentWallet.address);
            if (BigInt(balance.toString()) > BigInt(0)) {
              // Auto-add token with balance
              tokenStorageAPI.addToken(knownToken);
              storedTokens = tokenStorageAPI.getTokens();
            }
          } catch {
            // Token contract doesn't exist or error
          }
        }
      }

      // Update all token balances
      const updatedTokens = await Promise.all(
        storedTokens.map(async (token) => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const balance = await contract.balanceOf(currentWallet.address);
            return {
              ...token,
              balance: ethers.formatUnits(balance, token.decimals)
            };
          } catch {
            return { ...token, balance: '0' };
          }
        })
      );
      setTokens(updatedTokens);
    } else {
      setTokens(storedTokens);
    }
  }, [currentWallet]);

  // Load NFTs for the current wallet - auto-scan all known collections
  const loadNFTs = useCallback(async () => {
    if (!currentWallet?.address) return;

    setLoadingNFTs(true);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const loadedNFTs: NFT[] = [];

    // Scan all known NFT collections
    for (const collection of KNOWN_NFT_COLLECTIONS) {
      try {
        const nftContract = new ethers.Contract(collection.address, ERC721_ABI, provider);

        // Check each token ID in the collection
        for (let tokenId = 1; tokenId <= collection.maxTokenId; tokenId++) {
          try {
            const owner = await nftContract.ownerOf(tokenId.toString());
            if (owner.toLowerCase() === currentWallet.address.toLowerCase()) {
              let metadata: any = { name: `${collection.name} NFT #${tokenId}` };

              try {
                const tokenURI = await nftContract.tokenURI(tokenId);
                // Handle IPFS URIs
                let uri = tokenURI;
                if (uri.startsWith('ipfs://')) {
                  uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
                const res = await fetch(uri);
                metadata = await res.json();
              } catch {
                // Use default metadata
              }

              let imageUrl = metadata.image || '';
              if (imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }

              loadedNFTs.push({
                address: collection.address,
                tokenId: tokenId.toString(),
                name: metadata.name || `${collection.name} #${tokenId}`,
                description: metadata.description || '',
                image: imageUrl,
                collection: collection.name
              });
            }
          } catch {
            // NFT doesn't exist or not owned
          }
        }
      } catch {
        // Collection contract error
      }
    }

    setNfts(loadedNFTs);
    nftStorageAPI.saveNFTs(loadedNFTs);
    setLoadingNFTs(false);
  }, [currentWallet]);

  // Fetch token info from contract
  const fetchTokenInfo = async (address: string) => {
    if (!ethers.isAddress(address)) {
      showToast('Invalid contract address', 'error');
      return;
    }

    setLoadingTokenInfo(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(address, ERC20_ABI, provider);

      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);

      setNewTokenName(name);
      setNewTokenSymbol(symbol);
      setNewTokenDecimals(decimals.toString());
      showToast('Token info loaded!');
    } catch (e) {
      showToast('Could not fetch token info. Enter manually.', 'error');
    }
    setLoadingTokenInfo(false);
  };

  // Add custom token
  const addToken = async () => {
    if (!ethers.isAddress(newTokenAddress)) {
      showToast('Invalid contract address', 'error');
      return;
    }
    if (!newTokenSymbol || !newTokenName) {
      showToast('Please enter token name and symbol', 'error');
      return;
    }

    const token: Token = {
      address: newTokenAddress,
      name: newTokenName,
      symbol: newTokenSymbol.toUpperCase(),
      decimals: parseInt(newTokenDecimals) || 18
    };

    if (tokenStorageAPI.addToken(token)) {
      showToast(`${token.symbol} added successfully!`);
      setShowModal(null);
      loadTokens();
      // Clear form
      setNewTokenAddress('');
      setNewTokenName('');
      setNewTokenSymbol('');
      setNewTokenDecimals('18');
    } else {
      showToast('Token already exists', 'error');
    }
  };

  // Remove token
  const removeToken = (address: string) => {
    if (tokenStorageAPI.removeToken(address)) {
      showToast('Token removed');
      loadTokens();
    }
  };

  // Send token
  const sendToken = async () => {
    if (!selectedToken || !currentWallet || !tokenSendTo || !tokenSendAmount) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (!ethers.isAddress(tokenSendTo)) {
      showToast('Invalid recipient address', 'error');
      return;
    }

    setShowModal('unlockTokenSend');
  };

  // Execute token send after unlock
  const executeTokenSend = async () => {
    if (!selectedToken || !currentWallet) return;

    setSendingToken(true);
    try {
      let walletFile: { success: boolean; content: any };
      if (window.electronAPI) {
        walletFile = await window.electronAPI.loadWallet(currentWallet.filename);
      } else {
        walletFile = localStorageAPI.loadWallet(currentWallet.filename);
      }

      if (!walletFile.success) {
        showToast('Failed to load wallet', 'error');
        setSendingToken(false);
        return;
      }

      const wallet = await ethers.Wallet.fromEncryptedJson(JSON.stringify(walletFile.content), password);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = wallet.connect(provider);

      const tokenContract = new ethers.Contract(selectedToken.address, ERC20_ABI, signer);
      const amount = ethers.parseUnits(tokenSendAmount, selectedToken.decimals);

      const tx = await tokenContract.transfer(tokenSendTo, amount);
      showToast(`${selectedToken.symbol} sent! TX: ${tx.hash.slice(0, 18)}...`);

      setShowModal(null);
      setTokenSendTo('');
      setTokenSendAmount('');
      setPassword('');
      setSelectedToken(null);

      // Refresh balances after delay
      setTimeout(loadTokens, 3000);
    } catch (e: any) {
      showToast('Transaction failed: ' + e.message, 'error');
    }
    setSendingToken(false);
  };

  // Open token send modal
  const openTokenSend = (token: Token) => {
    setSelectedToken(token);
    setShowModal('sendToken');
  };

  // Open token receive modal
  const openTokenReceive = (token: Token) => {
    setSelectedToken(token);
    setShowModal('receiveToken');
  };

  // Create new wallet
  const createWallet = async () => {
    if (!newWalletPassword || newWalletPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newWalletPassword !== newWalletPassword2) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      const wallet = ethers.Wallet.createRandom();
      const keystore = await wallet.encrypt(newWalletPassword);
      const keystoreObj = JSON.parse(keystore);
      keystoreObj.name = newWalletName || 'My Wallet';

      const filename = `${(newWalletName || 'wallet').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;

      if (window.electronAPI) {
        await window.electronAPI.saveWallet(filename, keystoreObj);
      } else {
        // Fallback to localStorage for browser mode
        localStorageAPI.saveWallet(filename, keystoreObj);
      }

      setNewWalletData({ address: wallet.address, privateKey: wallet.privateKey });
      setShowModal('newWalletCreated');
      loadWallets();

      // Clear form
      setNewWalletName('');
      setNewWalletPassword('');
      setNewWalletPassword2('');
    } catch (e: any) {
      showToast('Error creating wallet: ' + e.message, 'error');
    }
  };

  // Import wallet from private key
  const importWallet = async () => {
    let pk = importPrivateKey.trim();
    if (!pk.startsWith('0x')) pk = '0x' + pk;

    if (!newWalletPassword || newWalletPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      const wallet = new ethers.Wallet(pk);
      const keystore = await wallet.encrypt(newWalletPassword);
      const keystoreObj = JSON.parse(keystore);
      keystoreObj.name = newWalletName || 'Imported Wallet';

      const filename = `${(newWalletName || 'imported').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;

      if (window.electronAPI) {
        await window.electronAPI.saveWallet(filename, keystoreObj);
      } else {
        // Fallback to localStorage for browser mode
        localStorageAPI.saveWallet(filename, keystoreObj);
      }

      showToast('Wallet imported successfully!');
      setShowModal(null);
      loadWallets();

      // Clear form
      setImportPrivateKey('');
      setNewWalletName('');
      setNewWalletPassword('');
    } catch (e: any) {
      showToast('Invalid private key: ' + e.message, 'error');
    }
  };

  // Send transaction
  const sendTransaction = async () => {
    if (!currentWallet || !sendTo || !sendAmount) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (!ethers.isAddress(sendTo)) {
      showToast('Invalid recipient address', 'error');
      return;
    }

    setShowModal('unlockWallet');
  };

  // Execute send after unlock
  const executeSend = async () => {
    try {
      if (!currentWallet) return;

      let walletFile: { success: boolean; content: any };
      if (window.electronAPI) {
        walletFile = await window.electronAPI.loadWallet(currentWallet.filename);
      } else {
        // Fallback to localStorage for browser mode
        walletFile = localStorageAPI.loadWallet(currentWallet.filename);
      }

      if (!walletFile.success) {
        showToast('Failed to load wallet', 'error');
        return;
      }

      const wallet = await ethers.Wallet.fromEncryptedJson(JSON.stringify(walletFile.content), password);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const signer = wallet.connect(provider);

      const tx = await signer.sendTransaction({
        to: sendTo,
        value: ethers.parseEther(sendAmount),
        gasLimit: 21000n
      });

      showToast('Transaction sent: ' + tx.hash.slice(0, 18) + '...');
      setShowModal(null);
      setSendTo('');
      setSendAmount('');
      setPassword('');

      // Refresh balance after a delay
      setTimeout(updateBalance, 3000);
    } catch (e: any) {
      showToast('Transaction failed: ' + e.message, 'error');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('altcoinchain-theme', theme);
  }, [theme]);

  // Effects
  useEffect(() => {
    loadWallets();
    updateNetworkInfo();
    loadTokens();
    const interval = setInterval(() => {
      updateNetworkInfo();
      updateBalance();
      loadTokens();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadWallets, updateNetworkInfo, updateBalance, loadTokens]);

  useEffect(() => {
    if (currentWallet) {
      updateBalance();
      loadTokens();
      loadNFTs();
    }
  }, [currentWallet, updateBalance, loadTokens, loadNFTs]);

  return (
    <div className="min-h-screen bg-background cyber-grid relative overflow-hidden">
      {/* Background Effects - Only show for Matrix theme */}
      {theme === 'matrix' && (
        <>
          <MatrixRain />
          <Scanlines />
          <GlitchOverlay />
        </>
      )}

      {/* Window Controls */}
      <div className="window-controls fixed top-0 left-0 right-0 h-10 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-between px-4 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="ALT" className="w-6 h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="text-primary font-cyber text-sm tracking-wider">ALTCOINCHAIN WALLET</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <div className="flex items-center gap-1 mr-2 bg-surface/50 rounded-lg p-1">
            <button
              onClick={() => setTheme('matrix')}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                theme === 'matrix' ? 'bg-primary/30 text-primary' : 'text-text/50 hover:text-primary hover:bg-primary/10'
              }`}
              title="Matrix Theme"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                theme === 'dark' ? 'bg-primary/30 text-primary' : 'text-text/50 hover:text-primary hover:bg-primary/10'
              }`}
              title="Dark Theme"
            >
              <Moon size={14} />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                theme === 'light' ? 'bg-primary/30 text-primary' : 'text-text/50 hover:text-primary hover:bg-primary/10'
              }`}
              title="Light Theme"
            >
              <Sun size={14} />
            </button>
          </div>
          {/* Window Buttons */}
          <button onClick={() => window.electronAPI?.minimize()} className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors">
            <div className="w-3 h-0.5 bg-text/70" />
          </button>
          <button onClick={() => window.electronAPI?.maximize()} className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 rounded transition-colors">
            <div className="w-3 h-3 border border-text/70" />
          </button>
          <button onClick={() => window.electronAPI?.close()} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/50 rounded transition-colors">
            <X size={14} className="text-text/70" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-12 flex min-h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-surface/50 backdrop-blur-sm border-r border-primary/20 p-4 flex flex-col">
          {/* Wallet Selector */}
          <div className="mb-6">
            <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Active Wallet</label>
            <select
              className="cyber-input text-sm"
              value={currentWallet?.filename || ''}
              onChange={(e) => {
                const w = wallets.find(w => w.filename === e.target.value);
                if (w) setCurrentWallet(w);
              }}
            >
              {wallets.map(w => (
                <option key={w.filename} value={w.filename}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {[
              { id: 'dashboard', icon: Activity, label: 'Dashboard' },
              { id: 'send', icon: Send, label: 'Send' },
              { id: 'receive', icon: Download, label: 'Receive' },
              { id: 'mine', icon: Cpu, label: 'Mine' },
              { id: 'stake', icon: Zap, label: 'Stake' },
              { id: 'tokens', icon: Coins, label: 'Tokens' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-all ${
                  activeTab === item.id
                    ? 'bg-primary/20 text-primary border border-primary/50 neon-box'
                    : 'text-text/70 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <item.icon size={18} />
                <span className="font-body tracking-wide">{item.label}</span>
                {activeTab === item.id && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>

          {/* Wallet Actions */}
          <div className="space-y-2 pt-4 border-t border-primary/20">
            <button onClick={() => setShowModal('createWallet')} className="cyber-btn w-full text-xs flex items-center justify-center gap-2">
              <Plus size={14} /> New Wallet
            </button>
            <button onClick={() => setShowModal('importWallet')} className="cyber-btn cyber-btn-secondary w-full text-xs flex items-center justify-center gap-2">
              <Download size={14} /> Import
            </button>
          </div>

          {/* Network Status */}
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="flex items-center gap-2 text-xs text-text/50 mb-2">
              <Server size={12} />
              <span>Network Status</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text/50">Block</span>
                <span className="text-primary font-mono">{blockNumber.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/50">Peers</span>
                <span className="text-neon-green font-mono">{peerCount}</span>
              </div>
              {syncing && (
                <div className="mt-2">
                  <div className="h-1 bg-surface rounded overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{width: `${syncProgress}%`}} />
                  </div>
                  <span className="text-primary">{syncProgress.toFixed(1)}% synced</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="cyber-card p-6 corner-brackets">
                <div className="text-xs text-text/50 uppercase tracking-wider mb-2">Total Balance</div>
                <div className="balance-display">{balance} ALT</div>
                {currentWallet && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-text/50 font-mono">{currentWallet.address}</span>
                    <button onClick={() => copyToClipboard(currentWallet.address)} className="text-primary hover:text-primary/80">
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setActiveTab('send')} className="cyber-card p-4 hover:border-primary/50 transition-colors group">
                  <Send size={24} className="text-primary mb-2 group-hover:animate-pulse" />
                  <div className="text-sm font-cyber">Send</div>
                </button>
                <button onClick={() => setActiveTab('receive')} className="cyber-card p-4 hover:border-neon-green/50 transition-colors group">
                  <Download size={24} className="text-neon-green mb-2 group-hover:animate-pulse" />
                  <div className="text-sm font-cyber">Receive</div>
                </button>
                <button onClick={() => setActiveTab('stake')} className="cyber-card p-4 hover:border-secondary/50 transition-colors group">
                  <Zap size={24} className="text-secondary mb-2 group-hover:animate-pulse" />
                  <div className="text-sm font-cyber">Stake</div>
                </button>
              </div>

              {/* Network Info */}
              <div className="cyber-card p-6">
                <h3 className="text-sm font-cyber text-primary mb-4 flex items-center gap-2">
                  <Globe size={16} /> Node Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Chain ID</div>
                    <div className="font-mono text-primary text-lg">{CHAIN_ID}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Network ID</div>
                    <div className="font-mono text-primary text-lg">{networkId}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Block Height</div>
                    <div className="font-mono text-primary text-lg">{blockNumber.toLocaleString()}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Connected Peers</div>
                    <div className="font-mono text-neon-green text-lg">{peerCount}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Gas Price</div>
                    <div className="font-mono text-primary text-lg">{gasPrice} Gwei</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Pending TXs</div>
                    <div className="font-mono text-secondary text-lg">{pendingTxCount}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Mining</div>
                    <div className={`font-mono text-lg ${isMining ? 'text-neon-green' : 'text-red-400'}`}>
                      {isMining ? 'Active' : 'Stopped'}
                    </div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Hashrate</div>
                    <div className="font-mono text-primary text-lg">{hashrate}</div>
                  </div>
                  <div className="bg-surface/30 p-3 rounded">
                    <div className="text-text/50 text-xs">Sync Status</div>
                    <div className={`font-mono text-lg ${syncing ? 'text-secondary' : 'text-neon-green'}`}>
                      {syncing ? `${syncProgress.toFixed(1)}%` : 'Synced'}
                    </div>
                  </div>
                </div>
                {nodeVersion && (
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <div className="text-text/50 text-xs mb-1">Node Version</div>
                    <div className="font-mono text-xs text-text/70">{nodeVersion}</div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text/50">Fusaka Fork</span>
                    <span className={`font-mono ${blockNumber >= 6660000 ? 'text-neon-green' : 'text-secondary'}`}>
                      Block 6,660,000 {blockNumber >= 6660000 ? '(Active)' : `(${(6660000 - blockNumber).toLocaleString()} blocks away)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Send Tab */}
          {activeTab === 'send' && (
            <div className="max-w-lg mx-auto">
              <div className="cyber-card p-6">
                <h2 className="text-xl font-cyber text-primary mb-6 flex items-center gap-2">
                  <Send size={20} /> Send ALT
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Recipient Address</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="0x..."
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Amount (ALT)</label>
                    <input
                      type="number"
                      className="cyber-input"
                      placeholder="0.0"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                    />
                    <div className="text-xs text-text/50 mt-1">Available: {balance} ALT</div>
                  </div>
                  <button onClick={sendTransaction} className="cyber-btn w-full mt-4">
                    Send Transaction
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Receive Tab */}
          {activeTab === 'receive' && currentWallet && (
            <div className="max-w-lg mx-auto">
              <div className="cyber-card p-6 text-center">
                <h2 className="text-xl font-cyber text-neon-green mb-6 flex items-center justify-center gap-2">
                  <Download size={20} /> Receive ALT
                </h2>
                <div className="mb-6">
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <QRCodeSVG
                      value={currentWallet.address}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <div className="text-xs text-text/50 uppercase tracking-wider mb-2">Your ALT Receive Address</div>
                <div className="font-mono text-sm text-primary bg-surface p-3 rounded break-all mb-4">
                  {currentWallet.address}
                </div>
                <button onClick={() => copyToClipboard(currentWallet.address)} className="cyber-btn cyber-btn-green">
                  <Copy size={14} className="inline mr-2" /> Copy Address
                </button>
                <div className="text-xs text-text/50 bg-secondary/10 border border-secondary/30 p-3 rounded mt-4">
                  <AlertTriangle size={14} className="inline mr-1 text-secondary" />
                  Only send <span className="text-neon-green font-semibold">ALT</span> to this address on the Altcoinchain network (Chain ID: {CHAIN_ID})
                </div>
              </div>
            </div>
          )}

          {/* Mine Tab */}
          {activeTab === 'mine' && (
            <div className="max-w-lg mx-auto">
              <div className="cyber-card p-6">
                <h2 className="text-xl font-cyber text-primary mb-6 flex items-center gap-2">
                  <Cpu size={20} /> Mining Control
                </h2>

                {/* Mining Status */}
                <div className={`p-4 rounded-lg border mb-6 ${isMining ? 'bg-neon-green/10 border-neon-green/50' : 'bg-surface/50 border-primary/20'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-text/70">Status</span>
                    <span className={`font-mono font-bold ${isMining ? 'text-neon-green' : 'text-red-400'}`}>
                      {isMining ? '⛏️ MINING' : '⏹️ STOPPED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-text/70">Hashrate</span>
                    <span className="font-mono text-primary">{hashrate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text/70">Coinbase</span>
                    <span className="font-mono text-xs text-neon-green">
                      {coinbase ? `${coinbase.slice(0, 8)}...${coinbase.slice(-6)}` : 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Mining Address */}
                <div className="mb-6">
                  <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Mining Reward Address</label>
                  <div className="flex gap-2">
                    <select
                      className="cyber-input flex-1"
                      value={coinbase}
                      onChange={(e) => setCoinbaseAddress(e.target.value)}
                    >
                      <option value="">Select wallet...</option>
                      {wallets.map(w => (
                        <option key={w.address} value={w.address}>
                          {w.name} ({w.address.slice(0, 8)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-text/50 mt-1">Mining rewards will be sent to this address</p>
                </div>

                {/* Mining Mode Selection */}
                <div className="mb-6">
                  <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Mining Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMiningMode('cpu')}
                      className={`flex-1 py-2 px-4 rounded border transition-all ${
                        miningMode === 'cpu'
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-surface/30 border-primary/20 text-text/50 hover:border-primary/50'
                      }`}
                    >
                      <Cpu size={16} className="inline mr-2" />
                      CPU
                    </button>
                    <button
                      onClick={() => setMiningMode('gpu')}
                      className={`flex-1 py-2 px-4 rounded border transition-all ${
                        miningMode === 'gpu'
                          ? 'bg-neon-green/20 border-neon-green text-neon-green'
                          : 'bg-surface/30 border-primary/20 text-text/50 hover:border-neon-green/50'
                      }`}
                    >
                      <Zap size={16} className="inline mr-2" />
                      GPU
                    </button>
                  </div>
                </div>

                {/* CPU Mining Options */}
                {miningMode === 'cpu' && (
                  <div className="mb-6">
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">CPU Threads</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="16"
                        value={miningThreads}
                        onChange={(e) => setMiningThreads(parseInt(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="font-mono text-primary w-8 text-center">{miningThreads}</span>
                    </div>
                    <p className="text-xs text-text/50 mt-1">More threads = more CPU usage</p>
                  </div>
                )}

                {/* GPU Mining Options */}
                {miningMode === 'gpu' && (
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="text-xs text-text/50 uppercase tracking-wider mb-3 block">GPU Type</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-surface/30 rounded border border-primary/20 cursor-pointer hover:border-neon-green/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={gpuType === 'nvidia' || gpuType === 'both'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGpuType(gpuType === 'amd' ? 'both' : 'nvidia');
                              } else {
                                setGpuType(gpuType === 'both' ? 'amd' : 'nvidia');
                              }
                            }}
                            className="w-4 h-4 accent-neon-green"
                          />
                          <span className="text-neon-green font-semibold">NVIDIA (CUDA)</span>
                          <span className="text-xs text-text/50 ml-auto">GeForce GTX/RTX</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-surface/30 rounded border border-primary/20 cursor-pointer hover:border-red-500/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={gpuType === 'amd' || gpuType === 'both'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGpuType(gpuType === 'nvidia' ? 'both' : 'amd');
                              } else {
                                setGpuType(gpuType === 'both' ? 'nvidia' : 'amd');
                              }
                            }}
                            className="w-4 h-4 accent-red-500"
                          />
                          <span className="text-red-400 font-semibold">AMD (OpenCL)</span>
                          <span className="text-xs text-text/50 ml-auto">Radeon RX</span>
                        </label>
                      </div>
                    </div>

                    {/* WebGPU Browser Mining */}
                    <div className="p-4 bg-surface/50 border border-secondary/30 rounded">
                      <h4 className="text-sm font-cyber text-secondary mb-3 flex items-center gap-2">
                        <Zap size={16} /> Browser GPU Mining (WebGPU)
                      </h4>
                      <WebGPUMiner
                        rpcUrl={RPC_URL}
                        walletAddress={currentWallet?.address || ''}
                        onHashrateUpdate={(hr) => console.log('WebGPU hashrate:', hr)}
                        onBlockFound={(block) => showToast(`Block found! #${block}`)}
                      />
                    </div>

                    {/* Native GPU Miner Installer */}
                    <div className="p-4 bg-surface/50 border border-primary/30 rounded">
                      <h4 className="text-sm font-cyber text-primary mb-3 flex items-center gap-2">
                        <Cpu size={16} /> Native GPU Miner (Higher Performance)
                      </h4>
                      <NativeMinerInstaller
                        rpcUrl={RPC_URL}
                        walletAddress={currentWallet?.address || ''}
                        gpuType={gpuType}
                      />
                    </div>
                  </div>
                )}

                {/* Mining Controls */}
                <div className="flex gap-3">
                  {!isMining ? (
                    <button
                      onClick={startMining}
                      disabled={syncing}
                      className="cyber-btn cyber-btn-green flex-1 flex items-center justify-center gap-2"
                    >
                      <Play size={16} /> Start Mining
                    </button>
                  ) : (
                    <button
                      onClick={stopMining}
                      className="cyber-btn flex-1 flex items-center justify-center gap-2 border-red-500 text-red-400 hover:bg-red-500/20"
                    >
                      <Square size={16} /> Stop Mining
                    </button>
                  )}
                </div>

                {syncing && (
                  <div className="mt-4 p-3 bg-secondary/10 border border-secondary/30 rounded text-sm">
                    <AlertTriangle size={14} className="inline mr-2 text-secondary" />
                    Node is still syncing ({syncProgress.toFixed(1)}%). Mining will be less effective until sync is complete.
                  </div>
                )}

                {/* Mining Info */}
                <div className="mt-6 pt-4 border-t border-primary/20">
                  <h3 className="text-sm font-cyber text-text/70 mb-3">Mining Info</h3>
                  <div className="space-y-2 text-xs text-text/50">
                    <p>• Mining uses your {miningMode === 'cpu' ? 'CPU' : 'GPU'} to solve blocks and earn ALT rewards</p>
                    {blockNumber < 6660000 ? (
                      <>
                        <p>• Current block reward: <span className="text-neon-green">2 ALT</span> (100% PoW)</p>
                        <p>• After Fusaka fork (block 6,660,000): 1 ALT PoW + 1 ALT PoS</p>
                      </>
                    ) : (
                      <>
                        <p>• Current block reward: <span className="text-neon-green">1 ALT</span> (PoW) + <span className="text-secondary">1 ALT</span> (PoS)</p>
                        <p>• <span className="text-neon-green">Fusaka fork is active!</span> Hybrid PoW/PoS enabled</p>
                      </>
                    )}
                    <p>• Block time: ~15 seconds</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stake Tab */}
          {activeTab === 'stake' && (
            <div className="max-w-lg mx-auto">
              <div className="cyber-card p-6">
                <h2 className="text-xl font-cyber text-secondary mb-6 flex items-center gap-2">
                  <Zap size={20} /> Validator Staking
                </h2>
                <div className="bg-secondary/10 border border-secondary/30 rounded p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-secondary mt-0.5" />
                    <div className="text-sm">
                      <p className="text-secondary font-semibold">Hybrid Fork Required</p>
                      <p className="text-text/70">Staking will be available after block 7,000,000. Current: {blockNumber.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Stake Amount (Min: {MIN_STAKE} ALT)</label>
                    <input
                      type="number"
                      className="cyber-input"
                      placeholder={MIN_STAKE.toString()}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-text/50">
                    <p>Contract: <span className="font-mono text-primary">{STAKING_CONTRACT}</span></p>
                    <p className="mt-1">Withdrawal delay: 7 days</p>
                  </div>
                  <button className="cyber-btn cyber-btn-secondary w-full" disabled={blockNumber < 7000000}>
                    Stake ALT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tokens Tab */}
          {activeTab === 'tokens' && (
            <div className="max-w-2xl mx-auto">
              {/* Sub-tabs for Tokens/NFTs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setTokenSubTab('tokens')}
                  className={`flex-1 py-3 px-4 rounded-lg font-cyber text-sm transition-all ${
                    tokenSubTab === 'tokens'
                      ? 'bg-neon-green/20 text-neon-green border border-neon-green/50'
                      : 'bg-surface/50 text-text/50 border border-primary/20 hover:border-neon-green/30'
                  }`}
                >
                  <Coins size={16} className="inline mr-2" /> Tokens
                </button>
                <button
                  onClick={() => setTokenSubTab('nfts')}
                  className={`flex-1 py-3 px-4 rounded-lg font-cyber text-sm transition-all ${
                    tokenSubTab === 'nfts'
                      ? 'bg-secondary/20 text-secondary border border-secondary/50'
                      : 'bg-surface/50 text-text/50 border border-primary/20 hover:border-secondary/30'
                  }`}
                >
                  <Image size={16} className="inline mr-2" /> NFTs
                </button>
              </div>

              {/* Tokens Sub-tab */}
              {tokenSubTab === 'tokens' && (
                <div className="cyber-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-cyber text-neon-green flex items-center gap-2">
                      <Coins size={20} /> ERC-20 Tokens
                    </h2>
                    <button
                      onClick={() => loadTokens()}
                      className="text-primary hover:text-primary/80 p-2"
                      title="Refresh balances"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className="space-y-3 mb-6">
                    {tokens.length === 0 ? (
                      <div className="text-center text-text/50 py-8">
                        <Database size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No tokens added yet</p>
                      </div>
                    ) : (
                      tokens.map((token, i) => (
                        <div key={i} className="p-4 bg-surface/50 rounded-lg border border-primary/10 hover:border-neon-green/30 transition-colors group">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-semibold text-text">{token.name}</div>
                                <div className="text-xs text-text/50 font-mono flex items-center gap-2">
                                  {token.symbol}
                                  <span className="text-text/30">|</span>
                                  {token.address.slice(0, 6)}...{token.address.slice(-4)}
                                  <button
                                    onClick={() => copyToClipboard(token.address)}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-neon-green font-mono text-lg">
                                  {parseFloat(token.balance || '0').toFixed(4)}
                                </div>
                                <div className="text-xs text-text/50">{token.symbol}</div>
                              </div>
                              <button
                                onClick={() => removeToken(token.address)}
                                className="text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Remove token"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {/* Token Actions */}
                          <div className="flex gap-2 pt-2 border-t border-primary/10">
                            <button
                              onClick={() => openTokenSend(token)}
                              className="flex-1 py-2 px-3 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <Send size={14} /> Send
                            </button>
                            <button
                              onClick={() => openTokenReceive(token)}
                              className="flex-1 py-2 px-3 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20 transition-colors text-sm flex items-center justify-center gap-2"
                            >
                              <Download size={14} /> Receive
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setShowModal('addToken')} className="cyber-btn cyber-btn-green w-full">
                    <Plus size={14} className="inline mr-2" /> Add Custom Token
                  </button>
                </div>
              )}

              {/* NFTs Sub-tab */}
              {tokenSubTab === 'nfts' && (
                <div className="cyber-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-cyber text-secondary flex items-center gap-2">
                      <Image size={20} /> NFT Collection
                    </h2>
                    <button
                      onClick={() => loadNFTs()}
                      className={`text-primary hover:text-primary/80 p-2 ${loadingNFTs ? 'animate-spin' : ''}`}
                      title="Refresh NFTs"
                      disabled={loadingNFTs}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  {/* Mining Game Collection Info */}
                  <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-secondary font-cyber">Mining Game NFTs</span>
                      <a
                        href={`https://opensea.io/collection/mining-game`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div className="text-xs text-text/50 font-mono">
                      Contract: {DEFAULT_NFT_CONTRACT.slice(0, 10)}...{DEFAULT_NFT_CONTRACT.slice(-8)}
                      <button
                        onClick={() => copyToClipboard(DEFAULT_NFT_CONTRACT)}
                        className="text-primary hover:text-primary/80 ml-2"
                      >
                        <Copy size={12} className="inline" />
                      </button>
                    </div>
                  </div>

                  {loadingNFTs ? (
                    <div className="text-center text-text/50 py-12">
                      <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-secondary" />
                      <p>Loading NFTs...</p>
                    </div>
                  ) : nfts.length === 0 ? (
                    <div className="text-center text-text/50 py-12">
                      <Image size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="text-lg mb-2">No NFTs Found</p>
                      <p className="text-sm">You don't own any Mining Game NFTs (#1-6) in this wallet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {nfts.map((nft, i) => (
                        <div
                          key={i}
                          className="bg-surface/50 rounded-lg border border-secondary/20 overflow-hidden hover:border-secondary/50 transition-all hover:scale-105 cursor-pointer group"
                        >
                          <div className="aspect-square bg-surface relative">
                            {nft.image ? (
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${nft.image ? 'hidden' : ''}`}>
                              <Image size={48} className="text-secondary/30" />
                            </div>
                            <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-secondary font-mono">
                              #{nft.tokenId}
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="font-semibold text-sm truncate">{nft.name}</div>
                            <div className="text-xs text-text/50">{nft.collection}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="cyber-card p-6 w-full max-w-md relative">
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-text/50 hover:text-primary">
              <X size={20} />
            </button>

            {/* Create Wallet Modal */}
            {showModal === 'createWallet' && (
              <>
                <h3 className="text-lg font-cyber text-primary mb-6">Create New Wallet</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Wallet Name</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="My Wallet"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Password</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Min 6 characters"
                      value={newWalletPassword}
                      onChange={(e) => setNewWalletPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Confirm Password</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Confirm password"
                      value={newWalletPassword2}
                      onChange={(e) => setNewWalletPassword2(e.target.value)}
                    />
                  </div>
                  <button onClick={createWallet} className="cyber-btn w-full">Create Wallet</button>
                </div>
              </>
            )}

            {/* New Wallet Created Modal */}
            {showModal === 'newWalletCreated' && newWalletData && (
              <>
                <h3 className="text-lg font-cyber text-neon-green mb-6 flex items-center gap-2">
                  <Check size={20} /> Wallet Created!
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Address</label>
                    <div className="cyber-input font-mono text-sm break-all flex items-center gap-2">
                      {newWalletData.address}
                      <button onClick={() => copyToClipboard(newWalletData.address)} className="text-primary">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block flex items-center justify-between">
                      Private Key
                      <button onClick={() => setShowPrivateKey(!showPrivateKey)} className="text-primary">
                        {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </label>
                    <div className="cyber-input font-mono text-sm break-all flex items-center gap-2 bg-red-900/20 border-red-500/50">
                      {showPrivateKey ? newWalletData.privateKey : '••••••••••••••••••••••••••••••••'}
                      <button onClick={() => copyToClipboard(newWalletData.privateKey)} className="text-red-400">
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-red-400 mt-2">⚠️ Save this key securely. Never share it!</p>
                  </div>
                  <button onClick={() => { setShowModal(null); setShowPrivateKey(false); setNewWalletData(null); }} className="cyber-btn w-full">
                    I've Saved My Key
                  </button>
                </div>
              </>
            )}

            {/* Import Wallet Modal */}
            {showModal === 'importWallet' && (
              <>
                <h3 className="text-lg font-cyber text-secondary mb-6">Import Wallet</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Private Key</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Enter private key"
                      value={importPrivateKey}
                      onChange={(e) => setImportPrivateKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Wallet Name</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="Imported Wallet"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Encryption Password</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Min 6 characters"
                      value={newWalletPassword}
                      onChange={(e) => setNewWalletPassword(e.target.value)}
                    />
                  </div>
                  <button onClick={importWallet} className="cyber-btn cyber-btn-secondary w-full">Import Wallet</button>
                </div>
              </>
            )}

            {/* Unlock Wallet Modal */}
            {showModal === 'unlockWallet' && (
              <>
                <h3 className="text-lg font-cyber text-primary mb-6">Unlock Wallet</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Password</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Enter wallet password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button onClick={executeSend} className="cyber-btn w-full">Confirm Send</button>
                </div>
              </>
            )}

            {/* Send Token Modal */}
            {showModal === 'sendToken' && selectedToken && (
              <>
                <h3 className="text-lg font-cyber text-primary mb-6 flex items-center gap-2">
                  <Send size={20} /> Send {selectedToken.symbol}
                </h3>
                <div className="space-y-4">
                  <div className="bg-surface/50 p-3 rounded-lg border border-primary/20">
                    <div className="text-xs text-text/50 mb-1">Available Balance</div>
                    <div className="text-xl font-mono text-neon-green">
                      {parseFloat(selectedToken.balance || '0').toFixed(4)} {selectedToken.symbol}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Recipient Address</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="0x..."
                      value={tokenSendTo}
                      onChange={(e) => setTokenSendTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Amount</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="cyber-input flex-1"
                        placeholder="0.0"
                        value={tokenSendAmount}
                        onChange={(e) => setTokenSendAmount(e.target.value)}
                      />
                      <button
                        onClick={() => setTokenSendAmount(selectedToken.balance || '0')}
                        className="cyber-btn px-3 text-xs"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  <button onClick={sendToken} className="cyber-btn w-full">
                    Send {selectedToken.symbol}
                  </button>
                </div>
              </>
            )}

            {/* Unlock for Token Send Modal */}
            {showModal === 'unlockTokenSend' && selectedToken && (
              <>
                <h3 className="text-lg font-cyber text-primary mb-6">Confirm Token Transfer</h3>
                <div className="space-y-4">
                  <div className="bg-surface/50 p-4 rounded-lg border border-primary/20 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text/50">Token</span>
                      <span className="text-neon-green font-mono">{selectedToken.symbol}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text/50">Amount</span>
                      <span className="text-primary font-mono">{tokenSendAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text/50">To</span>
                      <span className="text-text font-mono text-xs">{tokenSendTo.slice(0, 10)}...{tokenSendTo.slice(-8)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Wallet Password</label>
                    <input
                      type="password"
                      className="cyber-input"
                      placeholder="Enter wallet password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={executeTokenSend}
                    disabled={sendingToken}
                    className="cyber-btn w-full"
                  >
                    {sendingToken ? (
                      <><RefreshCw size={14} className="inline mr-2 animate-spin" /> Sending...</>
                    ) : (
                      'Confirm Send'
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Receive Token Modal */}
            {showModal === 'receiveToken' && selectedToken && currentWallet && (
              <>
                <h3 className="text-lg font-cyber text-neon-green mb-6 flex items-center gap-2">
                  <Download size={20} /> Receive {selectedToken.symbol}
                </h3>
                <div className="space-y-4 text-center">
                  <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                    <QRCodeSVG
                      value={currentWallet.address}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-text/50 uppercase tracking-wider mb-2">Your {selectedToken.symbol} Receive Address</div>
                    <div className="font-mono text-sm text-primary bg-surface p-3 rounded break-all">
                      {currentWallet.address}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(currentWallet.address)}
                      className="cyber-btn flex-1"
                    >
                      <Copy size={14} className="inline mr-2" /> Copy Address
                    </button>
                  </div>
                  <div className="text-xs text-text/50 bg-secondary/10 border border-secondary/30 p-3 rounded">
                    <AlertTriangle size={14} className="inline mr-1 text-secondary" />
                    Only send <span className="text-neon-green font-semibold">{selectedToken.symbol}</span> to this address on the Altcoinchain network (Chain ID: {CHAIN_ID})
                  </div>
                </div>
              </>
            )}

            {/* Add Token Modal */}
            {showModal === 'addToken' && (
              <>
                <h3 className="text-lg font-cyber text-neon-green mb-6 flex items-center gap-2">
                  <Plus size={20} /> Add Custom Token
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Contract Address</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="cyber-input flex-1"
                        placeholder="0x..."
                        value={newTokenAddress}
                        onChange={(e) => setNewTokenAddress(e.target.value)}
                      />
                      <button
                        onClick={() => fetchTokenInfo(newTokenAddress)}
                        disabled={loadingTokenInfo}
                        className="cyber-btn px-3"
                        title="Auto-fetch token info"
                      >
                        {loadingTokenInfo ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <Search size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Token Name</label>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="e.g. WATT Token"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Symbol</label>
                      <input
                        type="text"
                        className="cyber-input"
                        placeholder="e.g. WATT"
                        value={newTokenSymbol}
                        onChange={(e) => setNewTokenSymbol(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text/50 uppercase tracking-wider mb-2 block">Decimals</label>
                      <input
                        type="number"
                        className="cyber-input"
                        placeholder="18"
                        value={newTokenDecimals}
                        onChange={(e) => setNewTokenDecimals(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button onClick={addToken} className="cyber-btn cyber-btn-green w-full">
                      <Plus size={14} className="inline mr-2" /> Add Token
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg z-[300] font-body tracking-wide ${
          toast.type === 'success' ? 'bg-neon-green/90 text-black' : 'bg-red-500/90 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
