import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { calculateWeight, toArabicIndic, GENDER_BONUS } from '../utils/mystique';
import { supabase } from '../lib/supabaseClient';
import { CreditModal } from '../components/CreditModal';

// ─── Types ─────────────────────────────────────────────────────────────────

type SquareSize = 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface SquareResult {
  cells: number[];
  PM: number;
  squareSize: SquareSize;
  entry: number;
  remainder: number;
}

// ─── Données algorithmiques (Aladji Diack) ─────────────────────────────────

const SQUARE_PARAMS: Record<SquareSize, { subtract: number; divisor: number }> = {
  3: { subtract: 12,  divisor: 3 },
  4: { subtract: 30,  divisor: 4 },
  5: { subtract: 60,  divisor: 5 },
  6: { subtract: 105, divisor: 6 },
  7: { subtract: 168, divisor: 7 },
  8: { subtract: 252, divisor: 8 },
  9: { subtract: 360, divisor: 9 },
};

const LAYOUTS: Record<SquareSize, number[]> = {
  3: [4,9,2, 3,5,7, 8,1,6],
  4: [
     8,11,14, 1,
    13, 2, 7,12,
     3,16, 9, 6,
    10, 5, 4,15,
  ],
  5: [
    18,10,22,14, 1,
    12, 4,16, 8,25,
     6,23,15, 2,19,
     5,17, 9,21,13,
    24,11, 3,20, 7,
  ],
  6: [
     6,32, 3,34,35, 1,
     7,11,27,28, 8,30,
    24,14,16,15,23,19,
    13,20,22,21,17,18,
    25,29,10, 9,26,12,
    36, 5,33, 4, 2,31,
  ],
  7: [
    22,47,16,41,10,35, 4,
     5,23,48,17,42,11,29,
    30, 6,24,49,18,36,12,
    13,31, 7,25,43,19,37,
    38,14,32, 1,26,44,20,
    21,39, 8,33, 2,27,45,
    46,15,40, 9,34, 3,28,
  ],
  8: [
    64, 2, 3,61,60, 6, 7,57,
     9,55,54,12,13,51,50,16,
    17,47,46,20,21,43,42,24,
    40,26,27,37,36,30,31,33,
    32,34,35,29,28,38,39,25,
    41,23,22,44,45,19,18,48,
    49,15,14,52,53,11,10,56,
     8,58,59, 5, 4,62,63, 1,
  ],
  9: [
    47,58,69,80, 1,12,23,34,45,
    57,68,79, 9,11,22,33,44,46,
    67,78, 8,10,21,32,43,54,56,
    77, 7,18,20,31,42,53,55,66,
     6,17,19,30,41,52,63,65,76,
    16,27,29,40,51,62,64,75, 5,
    26,28,39,50,61,72,74, 4,15,
    36,38,49,60,71,73, 3,14,25,
    37,48,59,70,81, 2,13,24,35,
  ],
};

const THRESHOLDS: Record<SquareSize, Record<number, number>> = {
  3: { 0:99, 1:7,  2:4 },
  4: { 0:99, 1:13, 2:9,  3:5 },
  5: { 0:99, 1:21, 2:16, 3:11, 4:6 },
  6: { 0:99, 1:31, 2:25, 3:19, 4:13, 5:7 },
  7: { 0:99, 1:43, 2:36, 3:29, 4:22, 5:15, 6:8 },
  8: { 0:99, 1:57, 2:49, 3:41, 4:33, 5:25, 6:17, 7:9 },
  9: { 0:99, 1:73, 2:65, 3:57, 4:49, 5:41, 6:33, 7:25, 8:17 },
};

const SQUARE_NAMES: Record<SquareSize, string> = {
  3: 'Moussalas (Saturne)',
  4: 'Mourabbah (Jupiter)',
  5: 'Moukhams (Mars)',
  6: 'Moussadis (Soleil)',
  7: "Moussabbi'a (Vénus)",
  8: 'Mouthammin (Mercure)',
  9: "Moutassi'ou (Lune)",
};

const PLANETS: Record<SquareSize, string> = {
  3: 'Saturne', 4: 'Jupiter', 5: 'Mars',   6: 'Soleil',
  7: 'Vénus',   8: 'Mercure', 9: 'Lune',
};

const CELL_SIZES: Record<SquareSize, number> = {
  3: 64, 4: 60, 5: 56, 6: 52, 7: 46, 8: 42, 9: 38,
};

// ─── Algorithme ────────────────────────────────────────────────────────────

function generateSquare(PM: number, size: SquareSize): number[] {
  const { subtract, divisor } = SQUARE_PARAMS[size];
  const layout  = LAYOUTS[size];
  const threshold = THRESHOLDS[size][(PM - subtract) % divisor] ?? 99;
  const entry   = Math.floor((PM - subtract) / divisor);

  return layout.map((L, i) => {
    const val = entry + (L - 1);
    return (i + 1) >= threshold ? val + 1 : val;
  });
}

function verifySums(cells: number[], size: number, PM: number): boolean {
  let sum = 0;
  for (let j = 0; j < size; j++) sum += cells[j];
  return sum === PM;
}

// ─── Gemini (translittération prénoms) ─────────────────────────────────────

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

async function callGemini(frenchName: string): Promise<string> {
  const prompt =
    "Tu es expert en translittération arabe des noms ouest-africains selon l'orthographe islamique traditionnelle.\n" +
    "Translittère ce nom en arabe SANS harakat (sans signes diacritiques).\n" +
    `Nom : ${frenchName}\n` +
    'Retourne UNIQUEMENT du JSON valide sans markdown :\n{"arabic":"النص","weight":0}';

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const raw: string = data.candidates[0].content.parts[0].text;
  return (JSON.parse(raw.replace(/```json|```/g, '').trim()) as { arabic: string }).arabic;
}

async function transliterateWithRetry(name: string, attempt = 0): Promise<string> {
  try { return await callGemini(name); }
  catch (e) {
    if (attempt < 1) return transliterateWithRetry(name, attempt + 1);
    throw e;
  }
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function Separator() {
  return <div className="separateur" style={{ margin: '28px 0' }}>✦</div>;
}

function Spinner({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <style>{`@keyframes cm-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: '44px', height: '44px',
        border: '3px solid rgba(249,168,37,0.2)',
        borderTopColor: '#f9a825',
        borderRadius: '50%',
        animation: 'cm-spin 0.9s linear infinite',
        margin: '0 auto 16px',
      }} />
      <p style={{ color: '#b0b8d4', margin: 0 }}>{message}</p>
    </div>
  );
}

interface GridProps {
  cells: number[];
  size: SquareSize;
  cellSize: number;
  getCellStyle: () => React.CSSProperties;
  formatValue: (v: number) => string;
  extraCellStyle?: React.CSSProperties;
}

function MagicGrid({ cells, size, cellSize, getCellStyle, formatValue, extraCellStyle }: GridProps) {
  const fontSize =
    cellSize >= 56 ? '0.9rem' :
    cellSize >= 46 ? '0.8rem' :
    cellSize >= 42 ? '0.75rem' : '0.65rem';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
      gap: '2px',
      width: 'fit-content',
      margin: '0 auto',
    }}>
      {cells.map((val, i) => (
        <div
          key={i}
          style={{
            width: cellSize,
            height: cellSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize,
            ...getCellStyle(),
            ...extraCellStyle,
          }}
        >
          {formatValue(val)}
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────

export function CarresMagiquesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pmFromUrl = searchParams.get('pm');
  const gridsRef = useRef<HTMLDivElement>(null);

  const [name,      setName]      = useState('');
  const [mother,    setMother]    = useState('');
  const [gender,    setGender]    = useState<'homme' | 'femme'>('homme');
  const [directPM,  setDirectPM]  = useState('');
  const [squareSize, setSquareSize] = useState<SquareSize>(3);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [result,    setResult]    = useState<SquareResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [balance,   setBalance]   = useState(0);

  const parsedUrl = pmFromUrl ? parseInt(pmFromUrl) : NaN;
  const urlValid  = !isNaN(parsedUrl) && parsedUrl > 0;

  const namesFilled   = name.trim() !== '' && mother.trim() !== '';
  const directFilled  = directPM.trim() !== '' && !isNaN(parseInt(directPM)) && parseInt(directPM) > 0;
  const canGenerate   = !loading && (urlValid || directFilled || namesFilled);

  // ── Génération ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expirée. Reconnecte-toi.'); return; }
      const userId = session.user.id;

      // PM connu sans Gemini ?
      let pm: number | null = null;
      if (urlValid)        pm = parsedUrl;
      else if (directFilled) pm = parseInt(directPM);

      // Vérifier cache si PM connu
      if (pm !== null) {
        const cached = sessionStorage.getItem(`carre_${pm}_${squareSize}`);
        if (cached) { setResult(JSON.parse(cached) as SquareResult); return; }
      }

      // Vérifier crédits
      const { data: creditRow } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();
      const bal = (creditRow as { balance: number } | null)?.balance ?? 0;
      if (bal < 2) { setBalance(bal); setShowModal(true); return; }

      // Gemini si nécessaire
      if (pm === null) {
        const [nameAr, motherAr] = await Promise.all([
          transliterateWithRetry(name.trim()),
          transliterateWithRetry(mother.trim()),
        ]);
        pm = calculateWeight(nameAr) + calculateWeight(motherAr) + GENDER_BONUS[gender];
        // Vérifier cache avec PM calculé
        const cached = sessionStorage.getItem(`carre_${pm}_${squareSize}`);
        if (cached) { setResult(JSON.parse(cached) as SquareResult); return; }
      }

      // Générer
      const cells = generateSquare(pm, squareSize);
      const { subtract, divisor } = SQUARE_PARAMS[squareSize];
      const entry     = Math.floor((pm - subtract) / divisor);
      const remainder = (pm - subtract) % divisor;

      // Déduire crédits
      await supabase
        .from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await supabase.from('credit_transactions').insert({
        user_id:      userId,
        type:         'use',
        amount:       -2,
        tool:         'carres-magiques',
        balance_after: bal - 2,
        description:  `Génération carré ${SQUARE_NAMES[squareSize]} — PM ${pm}`,
      });

      const r: SquareResult = { cells, PM: pm, squareSize, entry, remainder };
      sessionStorage.setItem(`carre_${pm}_${squareSize}`, JSON.stringify(r));
      setResult(r);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!gridsRef.current || !result) return;
    try {
      const canvas = await html2canvas(gridsRef.current, { backgroundColor: '#0a0e2e', scale: 2 });
      const link   = document.createElement('a');
      link.download = `carre-${result.squareSize}x${result.squareSize}-PM${result.PM}-secretdivin.png`;
      link.href     = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setError('Erreur lors du téléchargement PNG.');
    }
  }

  function reset() {
    setName(''); setMother(''); setDirectPM(''); setGender('homme');
    setResult(null); setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Styles partagés ─────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#111a55',
    border: '1px solid rgba(249,168,37,0.15)',
    borderRadius: '8px',
    padding: '24px',
  };

  const inputSt: React.CSSProperties = {
    width: '100%',
    background: '#0a0e2e',
    border: '1px solid rgba(249,168,37,0.3)',
    color: 'white',
    padding: '12px 16px',
    fontSize: '1rem',
    outline: 'none',
    borderRadius: '4px',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  const labelSt: React.CSSProperties = {
    color: '#b0b8d4',
    fontSize: '0.85rem',
    display: 'block',
    marginBottom: '6px',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#f9a825', color: '#1a237e', fontWeight: '700',
    padding: '12px 24px', border: 'none', borderRadius: '4px',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem',
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent', color: '#f9a825', border: '1px solid #f9a825',
    padding: '12px 24px', borderRadius: '4px',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem',
  };

  // Résultat courant
  const cs = result ? CELL_SIZES[result.squareSize] : 52;
  const verified = result ? verifySums(result.cells, result.squareSize, result.PM) : false;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', padding: '40px 20px 80px' }}>
      <style>{`
        @keyframes cm-fadein { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .cm-result  { animation: cm-fadein 0.5s ease-out; }
        .cm-grids   { display:flex; flex-direction:row; gap:20px; overflow-x:auto; justify-content:center; }
        .cm-actions { display:flex; flex-direction:row; gap:12px; justify-content:center; }
        @media(max-width:800px) {
          .cm-grids   { flex-direction:column !important; align-items:center; }
          .cm-actions { flex-direction:column !important; }
          .cm-actions button { width:100% !important; }
        }
        select,option { background:#111a55; color:white; }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── SECTION 1 : EN-TÊTE ─────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>
            Carrés Magiques
          </h1>
          <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '1rem', lineHeight: '1.7', maxWidth: '440px', margin: '0 auto' }}>
            Génère les 7 types de carrés magiques islamiques<br />
            selon ton poids mystique
          </p>
          <Separator />
          <span style={{
            border: '1px solid #f9a825', color: '#f9a825',
            padding: '6px 18px', borderRadius: '20px',
            fontSize: '0.85rem', fontWeight: '600', display: 'inline-block',
          }}>
            2 crédits par génération
          </span>
        </div>

        {/* ── SECTION 2 : FORMULAIRE ──────────────────────────────────── */}
        <div style={{ ...card, maxWidth: '600px', margin: '0 auto 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* PM depuis l'URL */}
            {urlValid && (
              <div style={{
                background: 'rgba(249,168,37,0.08)',
                border: '1px solid rgba(249,168,37,0.4)',
                borderRadius: '6px', padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <span style={{ color: '#f9a825', fontSize: '1.1rem' }}>✦</span>
                <span style={{ color: 'white', fontSize: '0.95rem' }}>
                  Poids Mystique détecté :{' '}
                  <strong style={{ color: '#f9a825' }}>{pmFromUrl}</strong>
                </span>
              </div>
            )}

            {/* Formulaire prénoms (masqué si URL valide) */}
            {!urlValid && (
              <>
                <div>
                  <label style={labelSt}>Ton prénom (en français)</label>
                  <input
                    type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Mohamed, Aissatou, Ibrahim..."
                    style={{ ...inputSt, opacity: directFilled ? 0.5 : 1 }}
                    disabled={loading || directFilled}
                  />
                </div>
                <div>
                  <label style={labelSt}>Prénom de ta mère (en français)</label>
                  <input
                    type="text" value={mother}
                    onChange={e => setMother(e.target.value)}
                    placeholder="Ex: Fatoumata, Mariama..."
                    style={{ ...inputSt, opacity: directFilled ? 0.5 : 1 }}
                    disabled={loading || directFilled}
                  />
                </div>
                <div>
                  <label style={labelSt}>Ton sexe</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {(['homme', 'femme'] as const).map(g => (
                      <button
                        key={g} onClick={() => setGender(g)}
                        disabled={loading || directFilled}
                        style={{
                          flex: 1, padding: '10px',
                          border: '1px solid #f9a825', borderRadius: '4px',
                          background: gender === g ? '#f9a825' : 'transparent',
                          color: gender === g ? '#1a237e' : '#f9a825',
                          fontWeight: gender === g ? '700' : '400',
                          cursor: (loading || directFilled) ? 'not-allowed' : 'pointer',
                          fontFamily: 'Inter, sans-serif', fontSize: '0.95rem',
                          opacity: directFilled ? 0.5 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        {g === 'homme' ? 'Homme' : 'Femme'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Séparateur OU */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(249,168,37,0.2)' }} />
                  <span style={{ color: '#b0b8d4', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>——— ou ———</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(249,168,37,0.2)' }} />
                </div>

                <div>
                  <label style={labelSt}>Entre ton poids mystique directement</label>
                  <input
                    type="number" value={directPM}
                    onChange={e => setDirectPM(e.target.value)}
                    placeholder="Ex: 1234"
                    style={{ ...inputSt, opacity: namesFilled ? 0.5 : 1 }}
                    disabled={loading || namesFilled}
                    min="1"
                  />
                </div>
              </>
            )}

            {/* Type de carré */}
            <div>
              <label style={labelSt}>Type de carré</label>
              <select
                value={squareSize}
                onChange={e => setSquareSize(parseInt(e.target.value) as SquareSize)}
                disabled={loading}
                style={{
                  ...inputSt, cursor: 'pointer',
                  WebkitAppearance: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23f9a825' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '36px',
                }}
              >
                <option value={3}>3×3 — Moussalas (Saturne)</option>
                <option value={4}>4×4 — Mourabbah (Jupiter)</option>
                <option value={5}>5×5 — Moukhams (Mars)</option>
                <option value={6}>6×6 — Moussadis (Soleil)</option>
                <option value={7}>7×7 — Moussabbi'a (Vénus)</option>
                <option value={8}>8×8 — Mouthammin (Mercure)</option>
                <option value={9}>9×9 — Moutassi'ou (Lune)</option>
              </select>
            </div>

            {/* Bouton générer */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%',
                background: canGenerate ? '#f9a825' : 'rgba(249,168,37,0.35)',
                color: '#1a237e', fontWeight: '700', padding: '14px',
                border: 'none', borderRadius: '4px',
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                fontSize: '1rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px',
              }}
            >
              GÉNÉRER MON CARRÉ MAGIQUE
            </button>
          </div>
        </div>

        {/* Modal crédits */}
        {showModal && (
          <CreditModal
            toolName="Carrés Magiques"
            cost={2}
            balance={balance}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Spinner */}
        {loading && (
          <Spinner message={namesFilled && !urlValid ? 'Translittération et génération en cours...' : 'Génération en cours...'} />
        )}

        {/* Erreur */}
        {error && !loading && (
          <div style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
            <div style={{
              background: 'rgba(229,57,53,0.1)', border: '1px solid #e53935',
              borderRadius: '8px', padding: '20px 24px',
            }}>
              <p style={{ color: '#ef9a9a', margin: '0 0 14px' }}>{error}</p>
              <button onClick={handleGenerate} style={btnPrimary}>Réessayer</button>
            </div>
          </div>
        )}

        {/* ── SECTIONS 7–9 : RÉSULTATS ────────────────────────────────── */}
        {result && !loading && (
          <div className="cm-result">

            {/* Titre */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.4rem' }}>
                Ton Carré {SQUARE_NAMES[result.squareSize]} — PM : {result.PM}
              </h2>
            </div>

            <Separator />

            {/* ── 3 Grilles ──────────────────────────────────────────── */}
            <div
              id="carres-grid"
              ref={gridsRef}
              style={{ background: '#0a0e2e', padding: '24px 12px', borderRadius: '8px', marginBottom: '12px' }}
            >
              <div className="cm-grids">

                {/* Grille 1 — Carré de Base */}
                <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                    Carré de Base
                  </div>
                  <MagicGrid
                    cells={LAYOUTS[result.squareSize]}
                    size={result.squareSize}
                    cellSize={cs}
                    getCellStyle={() => ({ background: '#f5f5f5', border: '1px solid #e0e0e0', color: '#1a237e' })}
                    formatValue={v => String(v)}
                  />
                </div>

                {/* Grille 2 — Chiffres Français */}
                <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                    Chiffres Français
                  </div>
                  <MagicGrid
                    cells={result.cells}
                    size={result.squareSize}
                    cellSize={cs}
                    getCellStyle={() => ({ background: 'white', border: '2px solid #f9a825', color: '#1a237e' })}
                    formatValue={v => String(v)}
                  />
                </div>

                {/* Grille 3 — Chiffres Arabes-Indiens */}
                <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
                  <div style={{
                    color: '#f9a825', fontSize: '1rem', marginBottom: '12px',
                    fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl',
                  }}>
                    الأرقام العربية
                  </div>
                  <MagicGrid
                    cells={result.cells}
                    size={result.squareSize}
                    cellSize={cs}
                    getCellStyle={() => ({ background: '#1a237e', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825' })}
                    formatValue={v => toArabicIndic(v)}
                    extraCellStyle={{ fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl' }}
                  />
                </div>

              </div>
            </div>

            {/* Badge vérification */}
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              {verified ? (
                <span style={{
                  background: 'rgba(76,175,80,0.15)', border: '1px solid #4caf50',
                  color: '#81c784', padding: '6px 18px', borderRadius: '20px',
                  fontSize: '0.9rem', fontWeight: '600', display: 'inline-block',
                }}>
                  ✦ Somme magique = {result.PM}
                </span>
              ) : (
                <span style={{
                  background: 'rgba(229,57,53,0.12)', border: '1px solid #e53935',
                  color: '#ef9a9a', padding: '6px 18px', borderRadius: '20px',
                  fontSize: '0.9rem', fontWeight: '600', display: 'inline-block',
                }}>
                  ⚠ Écart de calcul — PM non divisible par {result.squareSize}
                </span>
              )}
            </div>

            <Separator />

            {/* ── Section 8 : Tableau infos ──────────────────────────── */}
            <div style={{ ...card, maxWidth: '580px', margin: '0 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {([
                    ['Type',      SQUARE_NAMES[result.squareSize]],
                    ['Taille',    `${result.squareSize}×${result.squareSize}`],
                    ['Poids (PM)', String(result.PM)],
                    ['Planète',   PLANETS[result.squareSize]],
                    ['Subtract',  String(SQUARE_PARAMS[result.squareSize].subtract)],
                    ['Diviseur',  String(SQUARE_PARAMS[result.squareSize].divisor)],
                    ['Entrée',    String(result.entry)],
                    ['Reste',     String(result.remainder)],
                  ] as [string, string][]).map(([prop, val]) => (
                    <tr key={prop} style={{ borderBottom: '1px solid rgba(249,168,37,0.1)' }}>
                      <td style={{ color: '#b0b8d4', padding: '10px 0', fontSize: '0.9rem', width: '42%' }}>{prop}</td>
                      <td style={{ color: 'white',   padding: '10px 0', fontSize: '0.9rem', fontWeight: '600' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator />

            {/* ── Section 9 : Boutons d'action ───────────────────────── */}
            <div className="cm-actions">
              <button onClick={handleDownload} style={btnPrimary}>
                Télécharger le carré (PNG)
              </button>
              <button onClick={reset} style={btnSecondary}>
                Calculer un autre carré
              </button>
              <button onClick={() => navigate('/destin')} style={btnSecondary}>
                Découvrir mon destin complet
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
