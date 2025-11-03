import { useState, useEffect, useRef } from "react";

export type VoiceEmojiMap = Record<string, string>;

const DEFAULT_MAP: VoiceEmojiMap = {
  love: "❤️",
  happy: "❤️",
  ivan: "❤️",
  cool: "😎",
  relaxed: "😎",
  sad: "😭",
  cry: "😭",
  angry: "😡",
  mad: "😡",
};

export function useVoiceRecognition(
  onEmojiDetected: (emoji: string) => void,
  emojiMap: VoiceEmojiMap = DEFAULT_MAP
) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartingRef = useRef(false);

  useEffect(() => {
    const Speech =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!Speech) return;

    if (!recognitionRef.current) {
      const rec = new Speech();
      rec.lang = "en-US";
      rec.continuous = true;          // ✅ true continuous mode
      rec.interimResults = false;
      recognitionRef.current = rec;
    }

    const recognition = recognitionRef.current;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.resultIndex][0].transcript.toLowerCase();

      const emoji =
        Object.entries(emojiMap).find(([word]) =>
          transcript.includes(word)
        )?.[1] ?? null;

      if (emoji) onEmojiDetected(emoji);
    };

    recognition.onstart = () => setListening(true);

    recognition.onend = () => {
      setListening(false);

      // ✅ prevent "already started" spam + auto restart
      if (!restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          try { recognition.start(); } catch {}
          restartingRef.current = false;
        }, 200); // <-- sweet spot delay
      }
    };

    // ✅ initial start
    try { recognition.start(); } catch {}

    return () => {
      try { recognition.stop(); } catch {}
    };

  }, [emojiMap, onEmojiDetected]);

  return { listening };
}
