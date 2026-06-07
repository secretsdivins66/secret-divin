const TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;

interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
}

function detectLanguage(text: string): string {
  const arabicRegex = /[؀-ۿ]/;
  return arabicRegex.test(text) ? 'ar' : 'fr';
}

// Voix recommandées : Charon (français, grave et posé) / Scheherazade (arabe, oriental)
function getVoiceName(lang: string): string {
  return lang === 'ar' ? 'Scheherazade' : 'Charon';
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/——— ✦ ———/g, '. ')
    .replace(/✦/g, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\w\s؀-ۿݐ-ݿ.,!?;:'"()-]/g, '')
    .trim()
    .substring(0, 4000);
}

function fallbackWebSpeech(text: string, onEnd?: () => void, onError?: () => void): void {
  if (!('speechSynthesis' in window)) {
    onError?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = detectLanguage(text);
  utterance.lang = lang === 'ar' ? 'ar-SA' : 'fr-FR';
  utterance.rate = 0.9;
  utterance.onstart = () => { isPlaying = true; };
  utterance.onend = () => { isPlaying = false; onEnd?.(); };
  utterance.onerror = () => { isPlaying = false; onError?.(); };
  window.speechSynthesis.speak(utterance);
}

export async function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): Promise<void> {
  stopSpeaking();

  const lang = detectLanguage(text);
  const voiceName = getVoiceName(lang);
  const cleanText = cleanTextForTTS(text);

  if (!cleanText) {
    onError?.();
    return;
  }

  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cleanText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS error: ${response.status}`);
    }

    const data = await response.json() as GeminiTTSResponse;
    const audioPart = data.candidates?.[0]?.content?.parts?.[0];
    const audioBase64 = audioPart?.inlineData?.data;

    if (!audioBase64) {
      throw new Error('Pas de données audio dans la réponse');
    }

    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';
    const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
    currentAudio = audio;

    audio.onplay = () => { isPlaying = true; onStart?.(); };
    audio.onended = () => { isPlaying = false; currentAudio = null; onEnd?.(); };
    audio.onerror = () => { isPlaying = false; currentAudio = null; onError?.(); };

    await audio.play();
  } catch {
    isPlaying = false;
    currentAudio = null;
    fallbackWebSpeech(cleanText, onEnd, onError);
    onStart?.();
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isPlaying = false;
}

export const getIsPlaying = (): boolean => isPlaying;

// Découpe un texte long en morceaux lus successivement (limite ~4000 caractères par appel TTS)
export async function speakLongText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): Promise<void> {
  stopSpeaking();

  const maxChars = 3500;
  const chunks: string[] = [];
  let remaining = cleanTextForTTS(text);

  while (remaining.length > maxChars) {
    let cutAt = remaining.lastIndexOf('.', maxChars);
    if (cutAt < maxChars * 0.5) {
      cutAt = remaining.lastIndexOf(' ', maxChars);
    }
    if (cutAt === -1) {
      cutAt = maxChars;
    }
    chunks.push(remaining.substring(0, cutAt + 1));
    remaining = remaining.substring(cutAt + 1).trim();
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  if (chunks.length === 0) {
    onError?.();
    return;
  }

  let started = false;
  isPlaying = true;

  for (let i = 0; i < chunks.length; i++) {
    if (!isPlaying && i > 0) break; // arrêté par l'utilisateur

    await new Promise<void>((resolve, reject) => {
      speakText(
        chunks[i],
        () => {
          if (!started) {
            started = true;
            onStart?.();
          }
        },
        () => {
          if (i === chunks.length - 1) {
            isPlaying = false;
            onEnd?.();
          }
          resolve();
        },
        () => {
          isPlaying = false;
          onError?.();
          reject();
        }
      );
    }).catch(() => {});
  }
}
