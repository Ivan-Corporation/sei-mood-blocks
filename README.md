
# SeiMoodBlocks — Full Project README

## Overview
SeiMoodBlocks is a voice-driven on-chain mood app deployed to Sei testnet.  
Users can speak their mood (e.g., "I'm happy") and the frontend interprets it and submits a transaction that records their emoji mood on-chain. The smart contract stores the full global history and per-user history.

This README contains:
- Smart contract source (Solidity)
- Frontend setup notes and code snippets (React + ethers)
- Environment & deployment notes
- Usage tips (voice + audio)
- Troubleshooting for local testing

---

## Smart Contract (SeiMoodBlocks.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SeiMoodBlocks {
    string[] public emojis = [
        unicode"❤️",
        unicode"😎",
        unicode"😭",
        unicode"😡"
    ];

    struct MoodRecord {
        address user;
        uint256 blockNumber;
        string emoji;
    }

    // ✅ every mood ever set
    MoodRecord[] public globalHistory;

    // ✅ per-user full history
    mapping(address => MoodRecord[]) public userHistory;

    // ✅ per-block counts
    mapping(uint256 => mapping(string => uint256)) public blockMoods;

    // ✅ global leaderboard
    mapping(string => uint256) public globalMoodCount;

    // ✅ last mood user gave for each block
    mapping(address => mapping(uint256 => string)) public userMood;

    event MoodSet(address indexed user, uint256 blockNumber, string emoji);

    function setMood(string memory _emoji) public {
        require(isValidEmoji(_emoji), "Invalid emoji");

        uint256 blockNum = block.number;
        string memory prev = userMood[msg.sender][blockNum];

        // undo previous if they change mood in same block
        if (bytes(prev).length != 0 && keccak256(bytes(prev)) != keccak256(bytes(_emoji))) {
            blockMoods[blockNum][prev]--;
            globalMoodCount[prev]--;
        }

        userMood[msg.sender][blockNum] = _emoji;
        blockMoods[blockNum][_emoji]++;
        globalMoodCount[_emoji]++;

        MoodRecord memory record = MoodRecord(msg.sender, blockNum, _emoji);
        globalHistory.push(record);
        userHistory[msg.sender].push(record);

        emit MoodSet(msg.sender, blockNum, _emoji);
    }

    function getBlockMood(uint256 blockNum) public view returns (string memory) {
        uint256 max = 0;
        string memory top;

        for (uint256 i = 0; i < emojis.length; i++) {
            uint256 count = blockMoods[blockNum][emojis[i]];
            if (count > max) {
                max = count;
                top = emojis[i];
            }
        }
        return top;
    }

    function getTopEmoji() public view returns (string memory) {
        uint256 max = 0;
        string memory top;

        for (uint256 i = 0; i < emojis.length; i++) {
            uint256 count = globalMoodCount[emojis[i]];
            if (count > max) {
                max = count;
                top = emojis[i];
            }
        }
        return top;
    }

    function getUserHistory(address _user) public view returns (MoodRecord[] memory) {
        return userHistory[_user];
    }

    function getGlobalHistory() public view returns (MoodRecord[] memory) {
        return globalHistory;
    }

    function isValidEmoji(string memory _emoji) internal view returns (bool) {
        for (uint256 i = 0; i < emojis.length; i++) {
            if (keccak256(bytes(emojis[i])) == keccak256(bytes(_emoji))) {
                return true;
            }
        }
        return false;
    }
}
```

---

## Frontend — Files & Key Code

This project uses Vite + React + ethers v6. The frontend expects a read RPC (Alchemy Sei testnet) and a wallet provider (e.g., MetaMask, AppKit).

### Project structure (recommended)
```
/src
  /components
    ConnectButton.tsx
  App.tsx
  contract.ts
  index.css
/public
  /sounds
    heart.mp3
    cool.mp3
    cry.mp3
    angry.mp3
.env
package.json
vite.config.ts
```

### Environment
Create `.env` (Vite uses `VITE_` prefix):
```
VITE_ALCHEMY_KEY=1AoU0j-8elqgTd902b_8K
```

Make sure to restart dev server if you change `.env`.

---

## contract.ts (read-only provider + signer for writes)

Place this in `src/contract.ts`. Update `contractAddress` to the deployed address you provided (`0x15905f91BF04A019413b7caE211976A7AAcb3B6F`).

```ts
// src/contract.ts
import { useEffect, useMemo, useCallback } from "react";
import { Contract, BrowserProvider, JsonRpcProvider, ethers } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";

const READ_RPC = `https://sei-testnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`;
const contractAddress = "0x15905f91BF04A019413b7caE211976A7AAcb3B6F";

const contractABI = [
  "event MoodSet(address indexed user, uint256 blockNumber, string emoji)",
  "function setMood(string _emoji)",
  "function getBlockMood(uint256 blockNum) view returns (string)",
  "function getTopEmoji() view returns (string)",
  "function getUserHistory(address) view returns (tuple(address,uint256,string)[])",
  "function getGlobalHistory() view returns (tuple(address,uint256,string)[])",
];

export function useSeiMoodContract() {
  const { walletProvider }: any = useAppKitProvider?.("eip155") ?? {};
  const { address, isConnected } = useAppKitAccount?.() ?? { address: null, isConnected: false };

  const readProvider = useMemo(() => new JsonRpcProvider(READ_RPC), []);
  const wallet = useMemo(() => {
    if (walletProvider) return new BrowserProvider(walletProvider);
    if (typeof window !== "undefined" && (window as any).ethereum)
      return new BrowserProvider((window as any).ethereum);
    return null;
  }, [walletProvider]);

  const readContract = useMemo(() => new Contract(contractAddress, contractABI, readProvider), [readProvider]);

  const contractWithSigner = useCallback(async () => {
    if (!wallet) throw new Error("Wallet not connected");
    const signer = await wallet.getSigner();
    return new Contract(contractAddress, contractABI, signer);
  }, [wallet]);

  async function setMood(emoji: string) {
    const c = await contractWithSigner();
    const tx = await c.setMood(emoji);
    await tx.wait();
  }

  async function getBlockMood(blockNum: number) {
    return await readContract.getBlockMood(blockNum);
  }

  async function getTopEmoji() {
    return await readContract.getTopEmoji();
  }

  async function getUserHistory(addr: string) {
    return await readContract.getUserHistory(addr);
  }

  async function getGlobalHistory() {
    return await readContract.getGlobalHistory();
  }

  // queryFilter chunking helper for free-tier limits (optional)
  async function queryMoodEventsForAddress(addr: string, fromBlock: number, toBlock: number) {
    const filter = readContract.filters.MoodSet(addr);
    const maxRange = 5; // adapt to Alchemy free tier
    let events: any[] = [];
    for (let start = fromBlock; start <= toBlock; start += maxRange) {
      const end = Math.min(start + maxRange, toBlock);
      try {
        const chunk = await readContract.queryFilter(filter, start, end);
        events = events.concat(chunk);
      } catch (err) {
        console.warn(`Chunk error [${start} - ${end}]`, err);
      }
    }
    return events.map((e: any) => ({
      user: e.args.user,
      blockNumber: Number(e.args.blockNumber),
      emoji: e.args.emoji,
      txHash: e.transactionHash,
      logIndex: e.logIndex,
    }));
  }

  useEffect(() => {
    if (!readContract) return;
    const handler = (user: string, blockNumber: ethers.BigNumberish, emoji: string) => {};
    try {
      readContract.on("MoodSet", handler);
      return () => readContract.off("MoodSet", handler);
    } catch {}
  }, [readContract]);

  readProvider.pollingInterval = 30000;

  return {
    provider: readProvider,
    wallet,
    address,
    isConnected,
    setMood,
    getBlockMood,
    getTopEmoji,
    getUserHistory,
    getGlobalHistory,
    queryMoodEventsForAddress,
    contract: readContract,
    ethers,
  };
}
```

---

## App.tsx (full voice + instant-send support)

This is a simplified, fixed version implementing the voice flow correctly. Replace your `src/App.tsx` with this file.

```tsx
// src/App.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import ConnectButton from "./components/ConnectButton";
import { useSeiMoodContract } from "./contract";
import "./index.css";

const EMOJIS = ["❤️", "😎", "😭", "😡"];

const sounds: Record<string, HTMLAudioElement | null> = {
  "❤️": typeof window !== "undefined" ? new Audio("/sounds/heart.mp3") : null,
  "😎": typeof window !== "undefined" ? new Audio("/sounds/cool.mp3") : null,
  "😭": typeof window !== "undefined" ? new Audio("/sounds/cry.mp3") : null,
  "😡": typeof window !== "undefined" ? new Audio("/sounds/angry.mp3") : null,
};

type FeedItem = { user: string; block: number; emoji: string };

export default function App() {
  const {
    provider,
    wallet,
    address,
    isConnected,
    setMood,
    getBlockMood,
    getTopEmoji,
    getUserHistory,
    getGlobalHistory,
    contract,
  } = useSeiMoodContract();

  const [selectedEmoji, setSelectedEmoji] = useState<string>(EMOJIS[0]);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [effectEmoji, setEffectEmoji] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [blockMood, setBlockMood] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<{ block: number; mood: string }[]>([]);
  const [heatmap, setHeatmap] = useState<{ block: number; mood: string }[]>([]);
  const [emojiCounts, setEmojiCounts] = useState<Record<string, number>>({});
  const [myHistory, setMyHistory] = useState<string[]>([]);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>([]);

  // Speech setup
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  const recognitionRef = useMemo(() => (SpeechRecognition ? new SpeechRecognition() : null), [SpeechRecognition]);

  useEffect(() => {
    const recognition = recognitionRef;
    if (!recognition) return;

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const transcript = String(event.results[0][0].transcript).toLowerCase();
      console.log("Voice:", transcript);

      let chosen: string | null = null;
      if (transcript.includes("love") || transcript.includes("happy")) chosen = "❤️";
      else if (transcript.includes("cool") || transcript.includes("relaxed")) chosen = "😎";
      else if (transcript.includes("sad") || transcript.includes("cry")) chosen = "😭";
      else if (transcript.includes("angry") || transcript.includes("mad")) chosen = "😡";

      setListening(false);

      if (!chosen) {
        alert("Didn't understand: " + transcript);
        return;
      }

      // update UI immediately
      setSelectedEmoji(chosen);

      // Use direct-emoji param to avoid stale state issues
      handleSetMood(chosen);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = (e: any) => {
      console.warn("recognition error", e);
      setListening(false);
    };

    return () => {
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      } catch {}
    };
  }, [recognitionRef]);

  // Data refresher (reads from contract)
  const refreshData = useCallback(async () => {
    if (!contract || !provider) return;
    try {
      const blockNum = await provider.getBlockNumber();
      setCurrentBlock(blockNum);

      const global = await getGlobalHistory();
      const N = 500;
      const recentGlobal = global.length > N ? global.slice(-N) : global;
      const mapped = recentGlobal.map((r: any) => ({
        user: String(r.user),
        block: Number(r.blockNumber),
        emoji: String(r.emoji),
      })).sort((a: any, b: any) => b.block - a.block);

      setLiveFeed(mapped.slice(0, 50));
      const blockMap = new Map<number, string>();
      for (const rec of mapped) {
        if (!blockMap.has(rec.block)) blockMap.set(rec.block, rec.emoji);
      }
      const blockList = Array.from(blockMap.entries()).sort((a,b) => b[0]-a[0]);
      setRecentBlocks(blockList.slice(0,6).map(([b,m]) => ({block:b,mood:m})));
      setHeatmap(blockList.slice(0,20).map(([b,m]) => ({block:b,mood:m})));

      const counts: Record<string, number> = {"❤️":0,"😎":0,"😭":0,"😡":0};
      for (const rec of mapped) if (counts[rec.emoji] !== undefined) counts[rec.emoji]++;

      setEmojiCounts(counts);
      setBlockMood(blockMap.get(blockNum) ?? "—");

      if (address) {
        try {
          const uh = await getUserHistory(address);
          const recentUser = uh.length > 20 ? uh.slice(-20) : uh;
          setMyHistory(recentUser.map((h:any)=>String(h.emoji)).reverse());
        } catch (err) { console.warn("getUserHistory failed", err); }
      }
    } catch (err) {
      console.warn("refreshData error", err);
    }
  }, [contract, provider, getGlobalHistory, getUserHistory, address]);

  useEffect(() => {
    if (!contract || !provider) return;
    refreshData();
    const id = setInterval(refreshData, 30000);

    const handler = (user: string, blockNumber: any, emoji: string) => {
      const item = { user, block: Number(blockNumber), emoji };
      setLiveFeed(s=>[item,...s].slice(0,100));
      setRecentBlocks(prev=>[{block:item.block,mood:item.emoji},...prev].slice(0,6));
      setHeatmap(prev=>[{block:item.block,mood:item.emoji},...prev].slice(0,20));
      setEmojiCounts(prev=>{
        const next = {...prev}; if (next[item.emoji]===undefined) next[item.emoji]=0; next[item.emoji]++; return next;
      });
      setCurrentBlock(cb=>{
        if (cb===item.block) setBlockMood(item.emoji);
        return cb;
      });
    };

    try { contract.on("MoodSet", handler); } catch(e){}

    return () => {
      clearInterval(id);
      try{ contract.off("MoodSet", handler); } catch {}
    };
  }, [contract, provider, refreshData]);

  async function handleSetMood(emojiParam?: string) {
    const emoji = emojiParam || selectedEmoji;
    setLoading(true);
    try {
      await setMood(emoji);
      try { sounds[emoji]?.currentTime = 0; sounds[emoji]?.play().catch(()=>{}); } catch {}
      setEffectEmoji(emoji);
      setTimeout(()=>setEffectEmoji(null),900);
      const particles = Array.from({length:12}).map((_,i)=>({id:Date.now()+i,x:window.innerWidth/2,y:window.innerHeight-200,emoji}));
      setBursts(b=>[...b,...particles]);
      setTimeout(()=>setBursts(prev=>prev.filter(p=>!particles.includes(p))),900);
      await refreshData();
    } catch(e) {
      console.error("setMood error", e);
      alert("Failed to set mood: " + (e as any)?.message || String(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-700 text-white p-6">
      <div className="max-w-4xl mx-auto glass-card rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex justify-between items-center mb-4 md:flex-row flex-col">
          <h1 className="text-3xl font-bold text-center">SeiMoodBlocks 🟣</h1>
          <ConnectButton />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm opacity-80">
            Address:
            <span className="font-mono text-xs opacity-80">
              {address ? `${address.slice(0,6)}...${address.slice(-4)}` : "—"}
            </span>
          </div>
          <div className="text-sm opacity-80">Block: <span className="font-bold">{currentBlock ?? "—"}</span></div>
        </div>

        {/* Emoji picker */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>setSelectedEmoji(e)} className={`text-4xl p-4 rounded-xl border transition transform hover:scale-110 active:scale-95 ${selectedEmoji===e ? "bg-purple-600 border-purple-300 shadow-lg animate-pulse" : "bg-gray-900/60 border-gray-700"}`}>
              {e}
            </button>
          ))}
        </div>

        <button onClick={()=>{
          const r = recognitionRef; if(!r) return alert("Speech recognition not supported");
          if(!listening){ setListening(true); r.start(); } else { setListening(false); r.stop(); }
        }} className={`w-full mb-4 py-2 rounded-xl text-lg cursor-pointer ${listening ? "bg-purple-700 hover:bg-purple-600" : "bg-purple-500 hover:bg-purple-700"}`}>
          🎤 {listening ? "Listening…" : "Voice Input"}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <button onClick={() => handleSetMood(selectedEmoji)} disabled={loading} className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl text-lg disabled:opacity-50 mb-4">
              {loading ? "Submitting…" : "Set Mood"}
            </button>

            <div className="flex gap-4 mb-4">
              <div className="flex-1 text-center p-4 rounded-lg bg-black/30">
                <div className="text-sm opacity-80">Global Top</div>
                <div className="text-3xl font-bold">{/* fallback to on-chain view */} {/* implement TopEmoji if desired */}</div>
              </div>

              <div className="flex-1 text-center p-4 rounded-lg bg-black/30">
                <div className="text-sm opacity-80">Block Mood</div>
                <div className="text-3xl font-bold">{blockMood ?? "—"}</div>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <h2 className="text-lg font-bold mb-2">Most Popular 📊</h2>
              {Object.entries(emojiCounts).sort((a:any,b:any)=>b[1]-a[1]).map(([emoji,count])=>(
                <div key={emoji} className="flex items-center justify-between py-1 text-xl">
                  <div className="flex items-center gap-3"><div className="text-2xl">{emoji}</div></div>
                  <div className="w-12 text-right text-purple-300 font-bold">{count}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-black/30 p-4 rounded-xl border border-white/10">
              <h2 className="text-lg font-bold mb-3">Mood Heatmap 🔥 (last blocks)</h2>
              <div className="grid grid-cols-7 gap-1 text-center text-lg">
                {heatmap.map(b=>(
                  <div key={b.block} title={`Block ${b.block}`} className={`p-3 rounded ${b.mood==="❤️" ? "bg-red-500/60" : b.mood==="😎" ? "bg-blue-500/60" : b.mood==="😭" ? "bg-cyan-500/60" : b.mood==="😡" ? "bg-orange-600/60" : "bg-gray-700/40"}`}>
                    <div className="text-sm opacity-80">#{String(b.block).slice(-4)}</div>
                    <div className="text-2xl">{b.mood||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-4 text-center">
              <h3 className="font-bold text-lg mb-2">Your Mood History 👤</h3>
              {myHistory.length>0 ? <div className="text-3xl max-h-32 overflow-auto">{myHistory.join(" ")}</div> : <div className="opacity-70">No recent moods found</div>}
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-4">
              <h3 className="font-bold text-lg mb-2">Recent Blocks</h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {recentBlocks.map(b=>(
                  <div key={b.block} className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/10"><span className="text-sm opacity-70">#{b.block}</span><span className="text-xl">{b.mood}</span></div>
                ))}
                {recentBlocks.length===0 && <div className="opacity-70">No data</div>}
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-lg mb-2">Live Feed</h3>
              <div className="max-h-64 overflow-auto space-y-2">
                {liveFeed.length===0 && <div className="opacity-70">Waiting for votes...</div>}
                {liveFeed.map((f,i)=>(
                  <div key={`${f.user}-${f.block}-${i}`} className="flex justify-between items-center bg-black/40 p-2 rounded"><div className="flex items-center gap-3"><div className="font-mono text-xs opacity-70">{f.user?.slice?.(0,6)}...{f.user?.slice?.(-4)}</div><div className="text-2xl">{f.emoji}</div></div><div className="text-sm opacity-60">#{f.block}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {effectEmoji && <div className="fixed inset-0 pointer-events-none flex justify-center items-end pb-40 z-50"><div className="emoji-float text-8xl drop-shadow-xl">{effectEmoji}</div></div>}

      {bursts.map(p=>(
        <div key={p.id} className="particle" style={{left:p.x, top:p.y, ["--dx" as any]: `${(Math.random()-0.5)*250}px`, ["--dy" as any]: `${(Math.random()-0.7)*300}px` } as any}>{p.emoji}</div>
      ))}
    </div>
  );
}
```

---

## index.css (add these classes if missing)

```css
.emoji-float { animation: floatUp 900ms ease-out forwards; }
@keyframes floatUp { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-220px) scale(0.9); opacity: 0; } }

.particle { position: fixed; font-size: 28px; animation: particle-fly 900ms ease-out forwards; pointer-events: none; z-index: 9999; }
@keyframes particle-fly { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.3); } }
```

---

## Sounds

Put short mp3 files into `public/sounds`. Example filenames used:

- `public/sounds/heart.mp3`
- `public/sounds/cool.mp3`
- `public/sounds/cry.mp3`
- `public/sounds/angry.mp3`

If browser says `NotSupportedError: The element has no supported sources` — check files exist and are valid mp3.

---

## Local dev tips & troubleshooting

- Vite + localhost works with Web Speech API (no https required for `localhost`), but Chrome needs microphone permission.
- If voice not triggering:
  - Check site microphone permissions
  - Try `chrome://settings/content/microphone` and allow `localhost`
  - Confirm `window.SpeechRecognition` or `webkitSpeechRecognition` exists
- If audio doesn't play:
  - Ensure audio files are present in `public/sounds`
  - Autoplay restrictions may block playback until a user gesture occurs; triggering via button click usually allows sound.
- If Alchemy returns "Free tier: up to 10 block logs":
  - The contract now provides `getGlobalHistory()` so fetching history via that view method avoids `eth_getLogs` chunking (but might be large).
  - Alternatively, fetch logs in small chunks (`maxRange=5` or `10`) — code includes chunking helper.

---

## Deployment notes

- Deploy the contract with Hardhat/Remix/Foundry to Sei testnet (EVM). Save the address and ABI.
- Update `contractAddress` in `src/contract.ts`.
- For public hosting (Vercel/Netlify), ensure `VITE_ALCHEMY_KEY` is set in environment variables.

---

## Security & Gas notes

- This contract stores every record on-chain. On mainnet this would be expensive. On testnet it's fine.
- Consider pruning, compression, or off-chain indexing for production.

---

## FAQ

**Q:** Voice sets wrong emoji (stale)?  
**A:** `handleSetMood` accepts an `emojiParam` and uses it instead of stale state. Use `handleSetMood(chosenEmoji)` from voice handler.

**Q:** Logs rate-limited by Alchemy?  
**A:** Use small `fromBlock..toBlock` windows (<=10) or rely on `getGlobalHistory()` view.

---

## LICENSE

MIT

---

## Contact

If anything breaks or you want additional features (confetti, haptic, NFT badges), paste here and I’ll provide code.

