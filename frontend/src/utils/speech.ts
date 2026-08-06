/** Browser TTS helper for revision audio scripts. */
export function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
