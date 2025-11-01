import { useState, useEffect } from "react";
import ConnectButton from "./components/ConnectButton";
import { useSeiMoodContract } from "./contract";

const EMOJIS = ["❤️", "😎", "😭", "😡"];

export default function App() {
  const [selectedEmoji, setSelectedEmoji] = useState("❤️");
  const [topEmoji, setTopEmoji] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [blockMood, setBlockMood] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<
    { block: number; mood: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const { setMood, getTopEmoji, getBlockMood, provider, address, isConnected } =
    useSeiMoodContract();

  async function refreshData() {
    if (!provider) return;

    try {
      const block = await provider.getBlockNumber();
      setCurrentBlock(block);

      const top = await getTopEmoji();
      setTopEmoji(top);

      // Current block mood
      try {
        const bm = await getBlockMood(block);
        setBlockMood(bm);
      } catch {
        setBlockMood("—");
      }

      // Recent blocks limited
      const recent: { block: number; mood: string }[] = [];
      for (let i = 0; i < 6; i++) {
        const blk = block - i;
        try {
          const mood = await getBlockMood(blk);
          if (mood) recent.push({ block: blk, mood });
        } catch {}
        await new Promise((res) => setTimeout(res, 120)); // Anti-rate-limit
      }
      setRecentBlocks(recent);
    } catch (err) {
      console.warn("RPC throttled", err);
    }
  }

  useEffect(() => {
    if (!isConnected) return;
    const i = setInterval(refreshData, 10000);
    return () => clearInterval(i);
  }, [isConnected]);

  async function handleSetMood() {
    setLoading(true);
    await setMood(selectedEmoji);
    await refreshData();
    setLoading(false);
  }

  // 🌟 View: wallet not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-black to-purple-700 text-white text-center">
        <h1 className="text-4xl font-bold mb-6">SeiMoodBlocks 🟣</h1>
        <p className="mb-6 opacity-80">
          Connect wallet to set your mood on-chain
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-700 text-white p-6">
      <div className="max-w-xl mx-auto bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
        <h1 className="text-3xl font-bold mb-4 text-center">
          SeiMoodBlocks 🟣
        </h1>
        <div className="flex justify-between items-center mb-5">
          <div className="text-sm opacity-80">
            Address:{" "}
            <span className="font-mono text-xs opacity-80">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <ConnectButton />
        </div>

        {/* Current Block */}
        <div className="mb-5 text-lg text-center">
          🧱 Block: <span className="font-bold">{currentBlock}</span>
        </div>

        {/* Emoji Picker */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setSelectedEmoji(e)}
              className={`text-4xl p-4 rounded-xl border transition transform hover:scale-110 active:scale-95 
                ${
                  selectedEmoji === e
                    ? "bg-purple-600 border-purple-300 shadow-lg animate-pulse"
                    : "bg-gray-900/60 border-gray-700"
                }
              `}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSetMood}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl text-lg disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Set Mood"}
        </button>

        {/* Stats */}
        <div className="mt-6 space-y-2 text-center">
          {topEmoji && (
            <div className="text-xl">
              🌍 Global Top: <span className="font-bold">{topEmoji}</span>
            </div>
          )}
          {blockMood && (
            <div className="text-xl">
              ⛓ Block Mood: <span className="font-bold">{blockMood}</span>
            </div>
          )}
        </div>

        {/* Recent Blocks */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Recent Blocks</h2>
          <div className="space-y-2">
            {recentBlocks.map((b) => (
              <div
                key={b.block}
                className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/10"
              >
                <span className="text-sm opacity-70">#{b.block}</span>
                <span className="text-xl">{b.mood}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
