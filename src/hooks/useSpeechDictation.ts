import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechErrorEvent {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const describeSpeechError = (code: string) => {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Permite el acceso al micrófono en tu navegador para dictar.';
  }
  if (code === 'no-speech') return 'No se detectó voz. Inténtalo de nuevo.';
  if (code === 'audio-capture') return 'No se encontró un micrófono disponible.';
  if (code === 'network') return 'El reconocimiento de voz no está disponible por el momento.';
  return 'No se pudo iniciar la dictación. Revisa los permisos del micrófono.';
};

export function useSpeechDictation(
  onTranscript: (text: string) => void,
  onError: (message: string) => void,
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!window.isSecureContext) {
      callbacksRef.current.onError('La dictación requiere HTTPS o localhost para acceder al micrófono.');
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      callbacksRef.current.onError('Este navegador no admite dictado por voz. Prueba con Chrome o Edge actualizado.');
      return;
    }

    try {
      recognitionRef.current?.abort();
      const recognition = new Recognition();
      recognition.lang = 'es-PE';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim();
          if (result?.isFinal && transcript) callbacksRef.current.onTranscript(transcript);
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        callbacksRef.current.onError(describeSpeechError(event.error));
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      callbacksRef.current.onError('No se pudo iniciar la dictación. Revisa los permisos del micrófono.');
    }
  }, []);

  return { isListening, start, stop };
}
