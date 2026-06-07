import { useState } from 'react';
import { speakText, speakLongText, stopSpeaking } from '../utils/tts';

interface AudioButtonProps {
  text: string;
  label?: string;
  isLong?: boolean;
  style?: React.CSSProperties;
}

export function AudioButton({ text, label = 'Écouter', isLong = false, style = {} }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setError(false);

    if (playing) {
      stopSpeaking();
      setPlaying(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const speakFn = isLong ? speakLongText : speakText;

    await speakFn(
      text,
      () => { setPlaying(true); setLoading(false); },
      () => { setPlaying(false); setLoading(false); },
      () => {
        setPlaying(false);
        setLoading(false);
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
    );
  }

  function getLabel(): string {
    if (loading) return 'Génération...';
    if (error) return 'Erreur TTS';
    if (playing) return 'Arrêter';
    return label;
  }

  const accentColor = error || playing ? '#e53935' : '#f9a825';

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={error ? 'Erreur de génération audio' : playing ? 'Arrêter la lecture' : 'Écouter en audio'}
      style={{
        border: `1px solid ${accentColor}`,
        color: accentColor,
        background: 'transparent',
        padding: '8px 20px',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '0.9em',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.3s',
        display: 'inline-block',
        marginTop: '12px',
        ...style,
      }}
    >
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          border: '2px solid #f9a825',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginRight: '8px',
          verticalAlign: 'middle',
        }} />
      )}
      {getLabel()}
    </button>
  );
}
