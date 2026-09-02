// Browser Web Speech API helper for Dictation / Voice Input in German

export interface SpeechRecognitionResultState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error?: string;
}

export class SpeechToTextHelper {
  private static recognition: any = null;

  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  public static startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onStatusChange: (isListening: boolean, error?: string) => void
  ): () => void {
    if (!this.isSupported()) {
      onStatusChange(false, 'Spracheingabe wird von diesem Browser nicht unterstützt. Bitte Chrome, Safari oder Edge verwenden.');
      return () => {};
    }

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognitionConstructor();
      rec.lang = 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        onStatusChange(true);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          onResult(combined, Boolean(finalTranscript));
        }
      };

      rec.onerror = (event: any) => {
        onStatusChange(false, `Mikrofon-Fehler: ${event.error}`);
      };

      rec.onend = () => {
        onStatusChange(false);
      };

      rec.start();
      this.recognition = rec;

      return () => {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      };
    } catch (err: any) {
      onStatusChange(false, err?.message || 'Fehler beim Starten der Spracheingabe');
      return () => {};
    }
  }

  public static stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
  }
}
