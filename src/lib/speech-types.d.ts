// Minimal ambient types for the Web Speech API (not in the default TS DOM lib).

interface SpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare var SpeechRecognition: { new (): SpeechRecognition };

interface Window {
  SpeechRecognition?: { new (): SpeechRecognition };
  webkitSpeechRecognition?: { new (): SpeechRecognition };
}
