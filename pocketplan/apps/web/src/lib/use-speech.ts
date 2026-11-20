"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The browser's own speech-to-text (Web Speech API): Chrome, Edge, Safari.
// Not in every browser (e.g. Firefox), so callers hide the mic when
// `supported` is false. Chrome and Edge send the audio to Google/Microsoft
// to transcribe; nothing goes through PocketPlan's servers.

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser's site settings.",
  "service-not-allowed": "Voice input isn't allowed in this browser.",
  "no-speech": "Didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Voice input needs an internet connection.",
  "language-not-supported": "This browser can't listen in that language. Switch language and try again.",
};

/**
 * Dictation for one sentence. `onText` gets the words so far while the user
 * speaks (and the final words when they stop).
 */
export function useSpeechInput(onText: (spoken: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  // Checked after mount: the server render has no window.
  useEffect(() => {
    setSupported(recognitionClass() !== null);
    return () => recognition.current?.abort();
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback((lang: string) => {
    const Speech = recognitionClass();
    if (!Speech) return;
    recognition.current?.abort();
    const r = new Speech();
    r.lang = lang;
    r.interimResults = true;
    // One sentence per tap; "continuous" repeats words on Android Chrome.
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i++) spoken += event.results[i][0].transcript;
      onTextRef.current(spoken.trim());
    };
    r.onerror = (event) => {
      if (event.error !== "aborted") setError(ERRORS[event.error] ?? "Voice input stopped. Try again.");
    };
    r.onend = () => {
      setListening(false);
      if (recognition.current === r) recognition.current = null;
    };
    recognition.current = r;
    setError(null);
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. Try again.");
    }
  }, []);

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}
