# 🟣 SeiMoodBlocks — On‑chain Mood Game (Sei Testnet)

React + EVM Smart Contract dApp on **Sei Testnet** allowing people to set moods per block:  
❤️ 😎 😭 😡 — tracked on‑chain, visualized live + **voice‑triggered tx**

---

## ✨ Features

- ✅ Solidity mood voting per block
- ✅ Global mood leaderboard
- ✅ Per‑user mood history (on‑chain)
- ✅ Recent block heatmap & live feed
- ✅ Wallet connect via `@reown/appkit`
- ✅ Voice recognition → emoji → auto tx
- ✅ Tailwind animated particle effects
- ✅ Sounds for each emotion
- ✅ Foundry + pnpm + React + ethers v6

---

## 📦 Repo Structure

```
/src         # Solidity contracts
/script      # Deployment scripts
/frontend    # React dApp
```

---

## 🛠️ Smart Contract Setup (Foundry)

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Foundry Config (`foundry.toml`)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
sei_testnet = "https://evm-rpc-testnet.sei-apis.com"
sei_mainnet = "https://evm-rpc.sei-apis.com"
```

### Create `.env`

```
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=https://evm-rpc-testnet.sei-apis.com
```

### Deploy

```bash
forge script script/Deploy.s.sol --rpc-url $SEI_TESTNET_RPC --private-key $PRIVATE_KEY --chain-id 1328 --broadcast

```

> Take the deployed address and put it in frontend `.env`

### Failed to decode fix for WSL

```
sudo apt update
sudo apt install dos2unix

PRIVATE_KEY=$(echo $PRIVATE_KEY | tr -d '\r\n')
dos2unix .env
```

---

## 🌐 Frontend Setup (React + pnpm)

```bash
cd frontend
pnpm install
```

### `.env`

```
VITE_SEI_RPC=https://evm-rpc-testnet.sei-apis.com
VITE_CONTRACT_ADDRESS=0xYourContractAddress
```

### Run

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

---

## 📦 Frontend Dependencies

| Purpose        | Package         |
| -------------- | --------------- |
| Wallet Connect | `@reown/appkit` |
| Ethers         | `ethers@6`      |
| React          | `react@19`      |
| Styling        | TailwindCSS     |
| Bundler        | Vite            |
| UI voice input | Web Speech API  |
| Pkg manager    | pnpm            |

Your `package.json`:

```json
{
  "name": "sei-mood-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@reown/appkit": "^1.8.12",
    "@reown/appkit-adapter-ethers": "^1.8.12",
    "@tailwindcss/vite": "^4.1.16",
    "ethers": "^6.15.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "tailwindcss": "^4.1.16"
  },
  "devDependencies": {
    "@eslint/js": "^9.36.0",
    "@types/react": "^19.1.16",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.4",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.22",
    "globals": "^16.4.0",
    "vite": "^7.1.7"
  }
}
```

---

## 🎤 Voice Commands → Emoji Mapping

| Say            | Emoji |
| -------------- | ----- |
| love / happy   | ❤️    |
| cool / relaxed | 😎    |
| sad / cry      | 😭    |
| angry / mad    | 😡    |

---

## 🎧 Audio

Place sounds in:

```
public/sounds/
heart.mp3
cool.mp3
cry.mp3
angry.mp3
```

---

## 🚀 Done Checklist

- [x] Deploy contract on Sei
- [x] Add contract address to `.env`
- [x] `pnpm dev`
- [x] Click “🎤 Voice Input”
- [x] Say “happy” → ❤️ → transaction sent 😎

---

## 💡 Future Ideas

- On‑chain badges for mood streaks
- Daily stats
- NFT “mood avatars”
- AI sentiment from sentences
- Telegram bot mood sync

---

Made with 🟣 on Sei  
Enjoy the vibes ✨
