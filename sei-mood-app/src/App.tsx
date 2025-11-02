import React, { useEffect, useMemo, useState, useCallback } from "react";
import ConnectButton from "./components/ConnectButton";
import { useSeiMoodContract } from "./contract";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useMoodSounds } from "./hooks/useMoodSounds";
import "./index.css";

const EMOJIS = ["❤️", "😎", "😭", "😡"];

type FeedItem = { user: string; block: number; emoji: string };

export default function App() {
  const { provider, address, setMood, getTopEmoji, contract } =
    useSeiMoodContract();

  const [selectedEmoji, setSelectedEmoji] = useState<string>(EMOJIS[0]);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [blockMood, setBlockMood] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<
    { block: number; mood: string }[]
  >([]);
  const [heatmap, setHeatmap] = useState<{ block: number; mood: string }[]>([]);
  const [emojiCounts, setEmojiCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [effectEmoji, setEffectEmoji] = useState<string | null>(null);
  const [myHistory, setMyHistory] = useState<string[]>([]);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>([]);
  const [bursts, setBursts] = useState<
    { id: number; x: number; y: number; emoji: string }[]
  >([]);

  /** ✅ Hook: sounds */
  const { playSound } = useMoodSounds();

  /** ✅ Hook: voice */
  const handleVoiceEmoji = async (emoji: string) => {
    setSelectedEmoji(emoji);
    await new Promise((r) => setTimeout(r, 100));
    handleSetMood(emoji);
  };

  const { listening, startListening, stopListening } =
    useVoiceRecognition(handleVoiceEmoji);

  // Refresh reads
  const refreshData = useCallback(async () => {
    if (!contract || !provider) return;
    try {
      const blockNum = await provider.getBlockNumber();
      setCurrentBlock(blockNum);

      const global: any[] = await contract.getGlobalHistory();
      const N = 500;
      const recentGlobal = global.length > N ? global.slice(-N) : global;

      const mapped = recentGlobal
        .map((r: any) => ({
          user: String(r.user),
          block: Number(r.blockNumber),
          emoji: String(r.emoji),
        }))
        .sort((a, b) => b.block - a.block);

      setLiveFeed(mapped.slice(0, 50));

      const blockMap = new Map<number, string>();
      for (const rec of mapped) {
        if (!blockMap.has(rec.block)) blockMap.set(rec.block, rec.emoji);
      }

      const blockList = Array.from(blockMap.entries()).sort(
        (a, b) => b[0] - a[0]
      );

      setRecentBlocks(
        blockList.slice(0, 6).map(([b, m]) => ({ block: b, mood: m }))
      );
      setHeatmap(
        blockList.slice(0, 20).map(([b, m]) => ({ block: b, mood: m }))
      );

      const counts: Record<string, number> = {
        "❤️": 0,
        "😎": 0,
        "😭": 0,
        "😡": 0,
      };
      for (const rec of mapped) {
        if (counts[rec.emoji] !== undefined) counts[rec.emoji]++;
      }
      setEmojiCounts(counts);
      setBlockMood(blockMap.get(blockNum) ?? "—");

      if (address) {
        try {
          const userHistory: any[] = await contract.getUserHistory(address);
          const recentUser =
            userHistory.length > 20 ? userHistory.slice(-20) : userHistory;
          setMyHistory(recentUser.map((h) => String(h.emoji)).reverse());
        } catch {}
      }
    } catch (err) {
      console.warn("refreshData error", err);
    }
  }, [contract, provider, address]);

  useEffect(() => {
    if (!contract || !provider) return;

    refreshData();
    const poll = setInterval(refreshData, 30_000);

    const handler = (user: string, blockNumber: any, emoji: string) => {
      const item: FeedItem = { user, block: Number(blockNumber), emoji };
      setLiveFeed((s) => [item, ...s].slice(0, 100));

      setRecentBlocks((prev) =>
        [{ block: item.block, mood: item.emoji }, ...prev].slice(0, 6)
      );
      setHeatmap((prev) =>
        [{ block: item.block, mood: item.emoji }, ...prev].slice(0, 20)
      );

      setEmojiCounts((prev) => {
        const n = { ...prev };
        n[item.emoji] = (n[item.emoji] ?? 0) + 1;
        return n;
      });

      setCurrentBlock((cb) => {
        if (cb === item.block) setBlockMood(item.emoji);
        return cb;
      });
    };

    try {
      contract.on("MoodSet", handler);
    } catch {}

    return () => {
      clearInterval(poll);
      try {
        contract.off("MoodSet", handler);
      } catch {}
    };
  }, [contract, provider, refreshData]);

  // Submit mood
  async function handleSetMood(forceEmoji?: string) {
    const emoji = forceEmoji || selectedEmoji;

    setLoading(true);
    try {
      await setMood(emoji);

      /** ✅ Play sound via hook */
      playSound(emoji);

      /** ✅ Visual effects */
      setEffectEmoji(emoji);
      setTimeout(() => setEffectEmoji(null), 900);

      const particles = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight - 200,
        emoji,
      }));

      setBursts((b) => [...b, ...particles]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((p) => !particles.includes(p)));
      }, 900);

      await refreshData();
    } catch (err: any) {
      alert("Failed to set mood: " + err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const leaderboard = useMemo(() => {
    return EMOJIS.map((e) => ({ emoji: e, count: emojiCounts[e] ?? 0 })).sort(
      (a, b) => b.count - a.count
    );
  }, [emojiCounts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-700 text-white p-6">
      <div className="max-w-4xl mx-auto glass-card rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex justify-between items-center mb-4 md:flex-row flex-col">
          <h1 className="text-3xl font-bold text-center">SeiMoodBlocks 🟣</h1>
          <ConnectButton />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm opacity-80">
            Address:{" "}
            <span className="font-mono text-xs opacity-80">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
            </span>
          </div>
          <div className="text-sm opacity-80">
            Block: <span className="font-bold">{currentBlock ?? "—"}</span>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setSelectedEmoji(e)}
              className={`text-4xl p-4 rounded-xl border transition transform hover:scale-110 active:scale-95
                ${
                  selectedEmoji === e
                    ? "bg-purple-600 border-purple-300 shadow-lg animate-pulse"
                    : "bg-gray-900/60 border-gray-700"
                }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex md:gap-2 gap-0 items-center justify-between md:flex-row flex-col">
              <button
                onClick={() => handleSetMood(selectedEmoji)}
                disabled={loading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl text-lg disabled:opacity-50 mb-4"
              >
                {loading ? "Submitting…" : "Set Mood"}
              </button>

              {/* ✅ Voice button via hook */}
              <button
                onClick={() => {
                  listening ? stopListening() : startListening();
                }}
                className={`w-full mb-4 py-3 rounded-xl text-lg cursor-pointer 
                  ${
                    listening
                      ? "bg-purple-700 hover:bg-purple-600"
                      : "bg-purple-500 hover:bg-purple-700"
                  }`}
              >
                🎤 {listening ? "Listening…" : "Voice Input"}
              </button>
            </div>


            {/* Stats */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 text-center p-4 rounded-lg bg-black/30">
                <div className="text-sm opacity-80">Global Top</div>
                <div className="text-3xl font-bold">
                  {/* fallback to on-chain view */}
                  <TopEmoji getTopEmoji={getTopEmoji} contract={contract} />
                </div>
              </div>

              <div className="flex-1 text-center p-4 rounded-lg bg-black/30">
                <div className="text-sm opacity-80">Block Mood</div>
                <div className="text-3xl font-bold">{blockMood ?? "—"}</div>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <h2 className="text-lg font-bold mb-2">Most Popular 📊</h2>
              {leaderboard.map((l) => (
                <div
                  key={l.emoji}
                  className="flex items-center justify-between py-1 text-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{l.emoji}</div>
                    {/* <div className="text-sm opacity-70">{l.emoji === selectedEmoji ? "You" : ""}</div> */}
                  </div>

                  <div className="ml-4 flex-1 mx-3">
                    <div className="h-3 rounded bg-white/10">
                      <div
                        className="h-full rounded leader-bar bg-purple-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (l.count /
                              Math.max(1, leaderboard[0]?.count || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-purple-300 font-bold">
                    {l.count}
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div className="mt-6 bg-black/30 p-4 rounded-xl border border-white/10">
              <h2 className="text-lg font-bold mb-3">
                Mood Heatmap 🔥 (last blocks)
              </h2>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-1 text-center text-lg max-h-64 overflow-auto">
                {heatmap.map((b) => (
                  <div
                    key={b.block}
                    title={`Block ${b.block}`}
                    className={`p-3 rounded ${
                      b.mood === "❤️"
                        ? "bg-red-500/60"
                        : b.mood === "😎"
                        ? "bg-blue-500/60"
                        : b.mood === "😭"
                        ? "bg-cyan-500/60"
                        : b.mood === "😡"
                        ? "bg-orange-600/60"
                        : "bg-gray-700/40"
                    }`}
                  >
                    <div className="text-sm opacity-80">
                      #{String(b.block).slice(-4)}
                    </div>
                    <div className="text-2xl">{b.mood || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: My history + recent blocks + live feed */}
          <div>
            {/* My Wallet Mood History */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-4 text-center">
              <h3 className="font-bold text-lg mb-2">Your Mood History 👤</h3>
              {myHistory.length > 0 ? (
                <div className="text-3xl max-h-32 overflow-auto">
                  {myHistory.join(" ")}
                </div>
              ) : (
                <div className="opacity-70">No recent moods found</div>
              )}
            </div>

            {/* Recent Blocks */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-4">
              <h3 className="font-bold text-lg mb-2">Recent Blocks</h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {recentBlocks.map((b) => (
                  <div
                    key={b.block}
                    className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/10"
                  >
                    <span className="text-sm opacity-70">#{b.block}</span>
                    <span className="text-xl">{b.mood}</span>
                  </div>
                ))}
                {recentBlocks.length === 0 && (
                  <div className="opacity-70">No data</div>
                )}
              </div>
            </div>

            {/* Live Feed */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-lg mb-2">Live Feed</h3>
              <div className="max-h-64 overflow-auto space-y-2">
                {liveFeed.length === 0 && (
                  <div className="opacity-70">Waiting for votes...</div>
                )}
                {liveFeed.map((f, i) => (
                  <div
                    key={`${f.user}-${f.block}-${i}`}
                    className="flex justify-between items-center bg-black/40 p-2 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs opacity-70">
                        {f.user?.slice?.(0, 6)}...{f.user?.slice?.(-4)}
                      </div>
                      <div className="text-2xl">{f.emoji}</div>
                    </div>
                    <div className="text-sm opacity-60">#{f.block}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated effect (floating emoji) */}
      {effectEmoji && (
        <div className="fixed inset-0 pointer-events-none flex justify-center items-end pb-40 z-50">
          <div className="emoji-float text-8xl drop-shadow-xl">
            {effectEmoji}
          </div>
        </div>
      )}

      {bursts.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={
            {
              left: p.x,
              top: p.y,
              "--dx": `${(Math.random() - 0.5) * 250}px`,
              "--dy": `${(Math.random() - 0.7) * 300}px`,
            } as any
          }
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

// Small helper component to attempt reading top emoji from contract (with fallback)
function TopEmoji({
  getTopEmoji,
  contract,
}: {
  getTopEmoji: any;
  contract: any;
}) {
  const [top, setTop] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (!contract) return;
        const t = await getTopEmoji();
        if (mounted) setTop(t ?? null);
      } catch {
        if (mounted) setTop(null);
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [getTopEmoji, contract]);

  return <>{top ?? "—"}</>;
}
