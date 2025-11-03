import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useMoodSounds } from "./hooks/useMoodSounds";
import "./index.css";

const EMOJIS = ["❤️", "😎", "😭", "😡"];

type FeedItem = { user: string; block: number; emoji: string };

console.log('window', window)

export default function App() {
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [currentBlock, setCurrentBlock] = useState(100000);
  const [blockMood, setBlockMood] = useState<string | null>("—");
  const [recentBlocks, setRecentBlocks] = useState(
    [] as { block: number; mood: string }[]
  );
  const [heatmap, setHeatmap] = useState(
    [] as { block: number; mood: string }[]
  );
  const [emojiCounts, setEmojiCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [effectEmoji, setEffectEmoji] = useState<string | null>(null);
  const [myHistory, setMyHistory] = useState<string[]>([]);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>([]);
  const [bursts, setBursts] = useState<
    { id: number; x: number; y: number; emoji: string }[]
  >([]);

  /** ✅ Fake wallet address */
  const address = "0xDEMO1234ABCD5678";

  /** ✅ Sound hook */
  const { playSound } = useMoodSounds();

  /** ✅ Voice input hook */
  const handleVoiceEmoji = async (emoji: string) => {
    setSelectedEmoji(emoji);
    await new Promise((r) => setTimeout(r, 100));
    handleSetMood(emoji);
  };
  const { listening } = useVoiceRecognition(handleVoiceEmoji);

  /** ✅ Fake block miner (increase block every 4 seconds) */
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentBlock((b) => b + 1);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  /** ✅ Fake submit mood */
  async function handleSetMood(emoji: string) {
    setLoading(true);
    playSound(emoji);

    setEffectEmoji(emoji);
    setTimeout(() => setEffectEmoji(null), 900);

    const block = currentBlock;

    // add fake entry
    const newFeed = {
      user: address,
      block,
      emoji,
    };

    setLiveFeed((s) => [newFeed, ...s].slice(0, 100));
    setMyHistory((h) => [emoji, ...h].slice(0, 20));
    setBlockMood(emoji);
    setRecentBlocks((r) => [{ block, mood: emoji }, ...r].slice(0, 6));
    setHeatmap((r) => [{ block, mood: emoji }, ...r].slice(0, 20));

    setEmojiCounts((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] ?? 0) + 1,
    }));

    // particles
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

    await new Promise((r) => r(setTimeout(r, 600)));
    setLoading(false);
  }

  /** ✅ Leaderboard */
  const leaderboard = useMemo(() => {
    return EMOJIS.map((e) => ({ emoji: e, count: emojiCounts[e] ?? 0 })).sort(
      (a, b) => b.count - a.count
    );
  }, [emojiCounts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-700 text-white p-6">
      <div className="max-w-4xl mx-auto glass-card rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex justify-between items-center mb-4 md:flex-row flex-col">
          <h1 className="text-3xl font-bold text-center">
            SeiMoodBlocks Demo 🟣
          </h1>
          {listening && (
            <div className="text-xs opacity-60">
              Listening for voice commands...
            </div>
          )}
          <div className="text-xs opacity-60">Demo Mode (no blockchain)</div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm opacity-80">
            Address:{" "}
            <span className="font-mono text-xs opacity-80">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <div className="text-sm opacity-80">
            Block: <span className="font-bold">{currentBlock}</span>
          </div>
        </div>

        {/* Emoji Picker */}
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

        <div className="flex md:gap-2 gap-0 items-center justify-between md:flex-row flex-col">
          <button
            onClick={() => handleSetMood(selectedEmoji)}
            disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl text-lg disabled:opacity-50 mb-4"
          >
            {loading ? "Submitting…" : "Set Mood"}
          </button>

          {/* Voice button */}
          {/* <button
            onClick={() => (listening ? stopListening() : startListening())}
            className={`w-full mb-4 py-3 rounded-xl text-lg cursor-pointer 
              ${
                listening
                  ? "bg-purple-700 hover:bg-purple-600"
                  : "bg-purple-500 hover:bg-purple-700"
              }`}
          >
            🎤 {listening ? "Listening…" : "Voice Input"}
          </button> */}
        </div>

        {/* Leaderboard */}
        <div className="bg-black/30 p-4 rounded-xl border border-white/10">
          <h2 className="text-lg font-bold mb-2">Most Popular 📊</h2>
          {leaderboard.map((l) => (
            <div
              key={l.emoji}
              className="flex items-center justify-between py-1 text-xl"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{l.emoji}</div>
              </div>
              <div className="ml-4 flex-1 mx-3">
                <div className="h-3 rounded bg-white/10">
                  <div
                    className="h-full rounded leader-bar bg-purple-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (l.count / Math.max(1, leaderboard[0]?.count || 1)) *
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

        {/* History */}
        <div className="bg-black/30 p-4 rounded-xl border border-white/10 mt-4 text-center">
          <h3 className="font-bold text-lg mb-2">Your Mood History 👤</h3>
          <div className="text-3xl max-h-32 overflow-auto">
            {myHistory.join(" ")}
          </div>
        </div>

        {/* Live feed */}
        <div className="bg-black/30 p-4 rounded-xl border border-white/10 mt-4">
          <h3 className="font-bold text-lg mb-2">Live Feed</h3>
          <div className="max-h-64 overflow-auto space-y-2">
            {liveFeed.map((f, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-black/40 p-2 rounded"
              >
                <div className="font-mono text-xs opacity-70">
                  {f.user.slice(0, 6)}...{f.user.slice(-4)}
                </div>
                <div className="text-2xl">{f.emoji}</div>
                <div className="text-sm opacity-60">#{f.block}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
