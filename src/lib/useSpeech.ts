"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Is a device likely to have unreliable Web Speech recognition (iOS)? */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Voice hook.
 * - speak(): text-to-speech with graceful voice fallback (exact → base language).
 * - Continuous native recognition (Android / desktop Chrome) for true hands-free.
 * - Push-to-talk recording → /api/transcribe (Gemini) fallback for iOS & regional.
 */
export function useSpeech(lang: string, voiceLang: string) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [canAutoListen, setCanAutoListen] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [hasExactVoice, setHasExactVoice] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const Ctor =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    setCanAutoListen(Boolean(Ctor) && !isIOS());
  }, []);

  // Voices load asynchronously — getVoices() is often empty until the
  // `voiceschanged` event fires. Cache them and flag if the requested
  // language actually has a matching voice (regional voices are often absent).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      voicesRef.current = voices;
      const base = voiceLang.split("-")[0];
      setHasExactVoice(
        voices.some((v) => v.lang === voiceLang || v.lang.startsWith(base)),
      );
      setVoiceReady(true);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [voiceLang]);

  // ---------- Text to speech ----------
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voiceLang;
      u.rate = 0.92; // a touch slower — easier to follow while cooking

      const voices = voicesRef.current.length
        ? voicesRef.current
        : window.speechSynthesis.getVoices();
      const base = voiceLang.split("-")[0];
      // Graceful fallback: exact locale → same base language → Hindi → English.
      const voice =
        voices.find((v) => v.lang === voiceLang) ||
        voices.find((v) => v.lang.startsWith(base)) ||
        voices.find((v) => v.lang.startsWith("hi")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (voice) u.voice = voice;

      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      u.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      window.speechSynthesis.speak(u);
    },
    [voiceLang],
  );

  // ---------- Continuous recognition (native) ----------
  const startContinuous = useCallback(
    (onPhrase: (text: string) => void) => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Ctor) return;
      keepListeningRef.current = true;

      const rec = new Ctor();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        const last = e.results[e.results.length - 1];
        if (last?.[0]?.transcript) onPhrase(last[0].transcript);
      };
      rec.onend = () => {
        // Auto-restart so listening survives each utterance until stopped.
        if (keepListeningRef.current) {
          try {
            rec.start();
          } catch {
            /* already started */
          }
        } else {
          setListening(false);
        }
      };
      rec.onerror = () => {
        /* transient — onend will restart if still enabled */
      };

      recognitionRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        /* already running */
      }
    },
    [voiceLang],
  );

  const stopContinuous = useCallback(() => {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  // ---------- Push-to-talk (fallback: record → Gemini) ----------
  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recorderRef.current = recorder;
    setListening(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    const recorder = recorderRef.current;
    if (!recorder) return "";
    setListening(false);

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
    });
    recorder.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;

    const form = new FormData();
    form.append("audio", blob, "clip.webm");
    form.append("language", lang);

    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!res.ok) return "";
    const data = await res.json();
    return (data.text as string) ?? "";
  }, [lang]);

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    speaking,
    listening,
    canAutoListen,
    voiceReady,
    hasExactVoice,
    speak,
    stopSpeaking,
    startContinuous,
    stopContinuous,
    startRecording,
    stopRecording,
  };
}
