import { useState, useCallback, useEffect } from "react";

export type VoiceEmojiMap = Record<string, string>;

const DEFAULT_MAP: VoiceEmojiMap = {
  love: "❤️",
  happy: "❤️",
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
  const Speech =
    (window as any).webkitSpeechRecognition ||
    (window as any).SpeechRecognition;

  const recognition = Speech ? new Speech() : null;

  const startListening = useCallback(() => {
    if (!recognition) return alert("Speech recognition not supported");
    setListening(true);
    recognition.start();
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) recognition.stop();
  }, [recognition]);

  useEffect(() => {
    if (!recognition) return;

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const emoji =
        Object.entries(emojiMap).find(([word]) =>
          transcript.includes(word)
        )?.[1] ?? null;

      emoji ? onEmojiDetected(emoji) : alert(`Didn't understand: ${transcript}`);
    };

    recognition.onend = () => setListening(false);
  }, [recognition, emojiMap, onEmojiDetected]);

  return {
    listening,
    startListening,
    stopListening,
  };
}
