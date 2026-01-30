# Go Altcoinchain

Official Golang implementation of the Altcoinchain protocol - a hybrid PoW/PoS blockchain.

## Network Information

| Parameter | Value |
|-----------|-------|
| **Chain ID** | 2330 |
| **Network ID** | 2330 |
| **P2P Port** | 31303 |
| **RPC Port** | 8332 |
| **WebSocket Port** | 8333 |
| **Consensus** | Hybrid PoW/PoS (Ethash + Staking) |
| **Block Time** | ~13 seconds |
| **Explorer** | https://altscan.io |
| **Ethstats** | https://alt-stat.outsidethebox.top |

## Quick Start (Pre-built Binaries)

### Linux

```bash
# Download latest release
wget https://github.com/nucash-mining/go-altcoinchain_FUSAKA/releases/download/v1.1.2/altcoinchain-v1.1.2-linux-amd64.tar.gz

# Extract
tar -xzf altcoinchain-v1.1.2-linux-amd64.tar.gz
cd altcoinchain-v1.1.2-linux-amd64

# Make executable
chmod +x geth bootnode clef

# Initialize genesis (first time only)
./geth --datadir ~/.altcoinchain init genesis.json

# Start node
./geth --datadir ~/.altcoinchain \
  --networkid 2330 \
  --port 31303 \
  --http --http.addr 127.0.0.1 --http.port 8332 \
  --http.api eth,net,web3,personal,miner,txpool,debug \
  --http.corsdomain "*" \
  --ws --ws.addr 127.0.0.1 --ws.port 8333 \
  --ws.api eth,net,web3,personal,miner,txpool \
  --ws.origins "*" \
  --bootnodes "enode://9355a3870bb3c7882a51797c6633380359c827febdbd89c87c0ff72914b351caf1642e5326ba78532f249082aad7c08d524cd418514865a49f8a5bca200ecbba@154.12.237.243:30303,enode://926900ccd1e2f218ce0d3c31f731eb1af1be60049624db9a01fa73588157f3fb7fd04c5f0874ca7cc030ab79d836c1961c3ef67aefe09f352e8a7aba03d3cdbf@154.12.237.243:30304,enode://c2e73bd6232c73ab7887d92aa904413597638ebf935791ca197bdd7902560baa7a4e8a1235b6d10d121ffc4602373476e7daa7d20d326466a5ae423be6581707@99.248.100.186:31303" \
  --ethstats=YourNodeName:alt@alt-stat.outsidethebox.top \
  --syncmode snap \
  --gcmode full \
  --maxpeers 50 \
  --cache 512
```

### Windows

```powershell
# Download and extract altcoinchain-v1.1.2-windows-amd64.zip
# Open PowerShell in the extracted directory

# Initialize genesis (first time only)
.\geth.exe --datadir %USERPROFILE%\.altcoinchain init genesis.json

# Start node
.\geth.exe --datadir %USERPROFILE%\.altcoinchain --networkid 2330 --port 31303 --http --http.addr 127.0.0.1 --http.port 8332 --http.api eth,net,web3,personal,miner,txpool,debug --ws --ws.addr 127.0.0.1 --ws.port 8333 --ws.api eth,net,web3,personal,miner,txpool --bootnodes "enode://9355a3870bb3c7882a51797c6633380359c827febdbd89c87c0ff72914b351caf1642e5326ba78532f249082aad7c08d524cd418514865a49f8a5bca200ecbba@154.12.237.243:30303,enode://926900ccd1e2f218ce0d3c31f731eb1af1be60049624db9a01fa73588157f3fb7fd04c5f0874ca7cc030ab79d836c1961c3ef67aefe09f352e8a7aba03d3cdbf@154.12.237.243:30304,enode://c2e73bd6232c73ab7887d92aa904413597638ebf935791ca197bdd7902560baa7a4e8a1235b6d10d121ffc4602373476e7daa7d20d326466a5ae423be6581707@99.248.100.186:31303" --ethstats=YourNodeName:alt@alt-stat.outsidethebox.top --syncmode snap --maxpeers 50 --cache 512
```

## Report Your Node to Ethstats

Add the `--ethstats` flag to report your node to the network stats page:

```bash
--ethstats=YourNodeName:alt@alt-stat.outsidethebox.top \
```

Your node will appear at: https://alt-stat.outsidethebox.top

## Bootnodes

Current active bootnodes:

```
enode://9355a3870bb3c7882a51797c6633380359c827febdbd89c87c0ff72914b351caf1642e5326ba78532f249082aad7c08d524cd418514865a49f8a5bca200ecbba@154.12.237.243:30303
enode://926900ccd1e2f218ce0d3c31f731eb1af1be60049624db9a01fa73588157f3fb7fd04c5f0874ca7cc030ab79d836c1961c3ef67aefe09f352e8a7aba03d3cdbf@154.12.237.243:30304
enode://c2e73bd6232c73ab7887d92aa904413597638ebf935791ca197bdd7902560baa7a4e8a1235b6d10d121ffc4602373476e7daa7d20d326466a5ae423be6581707@99.248.100.186:31303
```

## Building from Source

### Prerequisites

- Go 1.21 or later
- C compiler (GCC)
- Make

### Build

```bash
# Clone repository
git clone https://github.com/nucash-mining/go-altcoinchain_FUSAKA.git
cd go-altcoinchain_FUSAKA

# Build geth
make geth

# Or build all utilities
make all

# Binary will be in build/bin/
./build/bin/geth --version
```

## Create a Wallet

```bash
# Create new account
./geth account new --datadir ~/.altcoinchain

# List accounts
./geth account list --datadir ~/.altcoinchain
```

## Attach Console

```bash
# Attach to running node
./geth attach ~/.altcoinchain/geth.ipc

# Useful console commands
> eth.syncing          # Check sync status
> eth.blockNumber      # Current block
> admin.peers.length   # Connected peers
> eth.getBalance(eth.accounts[0])  # Check balance
> personal.unlockAccount(eth.accounts[0])  # Unlock for transactions
```

## Mining

### CPU Mining

```bash
# Start node with mining enabled
./geth --datadir ~/.altcoinchain \
  --networkid 2330 \
  --mine \
  --miner.threads=4 \
  --miner.etherbase=YOUR_WALLET_ADDRESS \
  --bootnodes "enode://9355a3870bb3c7882a51797c6633380359c827febdbd89c87c0ff72914b351caf1642e5326ba78532f249082aad7c08d524cd418514865a49f8a5bca200ecbba@154.12.237.243:30303,enode://926900ccd1e2f218ce0d3c31f731eb1af1be60049624db9a01fa73588157f3fb7fd04c5f0874ca7cc030ab79d836c1961c3ef67aefe09f352e8a7aba03d3cdbf@154.12.237.243:30304"
```

### GPU Mining

For GPU mining, use a compatible miner like lolMiner or TeamRedMiner:

```bash
# Example with lolMiner
./lolMiner --algo ETCHASH --pool stratum+tcp://YOUR_POOL:PORT --user YOUR_WALLET
```

## Staking (PoS)

Altcoinchain uses a hybrid PoW/PoS consensus. To become a validator:

1. Minimum stake: 10,000 ALT
2. Interact with the ValidatorStaking contract at: `0xYOUR_STAKING_CONTRACT`

```javascript
// From geth console
var stakingABI = [...]; // Load ABI
var staking = eth.contract(stakingABI).at("0xSTAKING_CONTRACT_ADDRESS");
staking.stake({from: eth.accounts[0], value: web3.toWei(10000, "ether")});
```

## RPC Endpoints

### HTTP RPC

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8332
```

### WebSocket

```javascript
const ws = new WebSocket('ws://127.0.0.1:8333');
```

## Run as Systemd Service

Create `/etc/systemd/system/altcoinchain.service`:

```ini
[Unit]
Description=Altcoinchain Node
After=network.target

[Service]
Type=simple
User=YOUR_USER
ExecStart=/path/to/geth --datadir /home/YOUR_USER/.altcoinchain --networkid 2330 --port 31303 --http --http.addr 127.0.0.1 --http.port 8332 --http.api eth,net,web3,personal,miner,txpool,debug --ws --ws.addr 127.0.0.1 --ws.port 8333 --ws.api eth,net,web3,personal,miner,txpool --bootnodes "enode://9355a3870bb3c7882a51797c6633380359c827febdbd89c87c0ff72914b351caf1642e5326ba78532f249082aad7c08d524cd418514865a49f8a5bca200ecbba@154.12.237.243:30303,enode://926900ccd1e2f218ce0d3c31f731eb1af1be60049624db9a01fa73588157f3fb7fd04c5f0874ca7cc030ab79d836c1961c3ef67aefe09f352e8a7aba03d3cdbf@154.12.237.243:30304,enode://c2e73bd6232c73ab7887d92aa904413597638ebf935791ca197bdd7902560baa7a4e8a1235b6d10d121ffc4602373476e7daa7d20d326466a5ae423be6581707@99.248.100.186:31303" --ethstats=YourNodeName:alt@alt-stat.outsidethebox.top --syncmode snap --maxpeers 50 --cache 512
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable altcoinchain
sudo systemctl start altcoinchain
sudo journalctl -u altcoinchain -f  # View logs
```

## Hardware Requirements

**Minimum:**
- CPU: 2+ cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 8 Mbps

**Recommended:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 25+ Mbps

## Troubleshooting

### Node won't sync
```bash
# Check peers
./geth attach ~/.altcoinchain/geth.ipc --exec "admin.peers.length"

# Manually add peer
./geth attach ~/.altcoinchain/geth.ipc --exec 'admin.addPeer("enode://...")'
```

### Reset blockchain data
```bash
# Remove chaindata (keeps accounts)
rm -rf ~/.altcoinchain/geth/chaindata
rm -rf ~/.altcoinchain/geth/ethash

# Re-initialize
./geth --datadir ~/.altcoinchain init genesis.json
```

### Check sync status
```bash
./geth attach ~/.altcoinchain/geth.ipc --exec "eth.syncing"
# Returns false when fully synced
```

## Community

- Discord: https://discord.gg/hcXHyQP4Je
- Explorer: https://altscan.io
- Ethstats: https://alt-stat.outsidethebox.top

## License

GNU General Public License v3.0
