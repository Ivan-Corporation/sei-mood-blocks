const soundFiles: Record<string, string> = {
  "❤️": "/sounds/heart.mp3",
  "😎": "/sounds/cool.mp3",
  "😭": "/sounds/cry.mp3",
  "😡": "/sounds/angry.mp3",
};

const audioCache: Record<string, HTMLAudioElement> = {};


export function useMoodSounds() {
  function playSound(emoji: string) {
    if (!audioCache[emoji]) {
      audioCache[emoji] = new Audio(soundFiles[emoji]);
    }

    const sound = audioCache[emoji];
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  return { playSound };
}
