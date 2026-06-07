import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateWeight, toArabicIndic, ABJAD } from '../utils/mystique';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Result {
  nameArabic: string;
  motherArabic: string;
  nameWeight: number;
  motherWeight: number;
  bonus: number;
  PM: number;
  element: string;
  elementColor: string;
}

// ─── Constantes ────────────────────────────────────────────────────────────

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

const ELEMENT_DESC: Record<string, string> = {
  Feu:   'Personnalité ardente, passionnée et déterminée. Énergie solaire, leadership naturel et courage.',
  Terre: "Personnalité stable, persévérante et fiable. Ancrage, patience et sens des responsabilités.",
  Air:   "Personnalité vive, intelligente et communicative. Créativité, adaptabilité et ouverture d'esprit.",
  Eau:   "Personnalité intuitive, sensible et profonde. Spiritualité, empathie et connexion avec l'invisible.",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getElement(pm: number): { name: string; color: string } {
  const r = pm % 4;
  if (r === 1) return { name: 'Feu',   color: '#e53935' };
  if (r === 2) return { name: 'Terre', color: '#795548' };
  if (r === 3) return { name: 'Air',   color: '#64b5f6' };
  return             { name: 'Eau',   color: '#1565c0' };
}

async function callGemini(frenchName: string): Promise<string> {
  const prompt =
    "Tu es expert en translittération arabe des noms ouest-africains selon l'orthographe islamique traditionnelle.\n" +
    "Translittère ce nom en arabe SANS harakat (sans signes diacritiques).\n" +
    "Utilise les valeurs Abjad :\n" +
    "ا=1 ب=2 ج=3 د=4 ه=5 ة=5 و=6 ز=7 ح=8 ط=9 ي=10 ك=20 ل=30 م=40 ن=50\n" +
    "ص=60 ع=70 ف=80 ض=90 ق=100 ر=200 س=300 ت=400 ث=500 خ=600 ذ=700 ظ=800 غ=900 ش=1000\n" +
    `Nom : ${frenchName}\n` +
    'Retourne UNIQUEMENT du JSON valide sans markdown :\n' +
    '{"arabic":"النص","weight":123}';

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
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.arabic as string;
}

async function transliterateWithRetry(name: string, attempt = 0): Promise<string> {
  try {
    return await callGemini(name);
  } catch (e) {
    if (attempt < 1) return transliterateWithRetry(name, attempt + 1);
    throw e;
  }
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function Separator() {
  return <div className="separateur" style={{ margin: '28px 0' }}>✦</div>;
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '44px', height: '44px',
        border: '3px solid rgba(249,168,37,0.2)',
        borderTopColor: '#f9a825',
        borderRadius: '50%',
        animation: 'sd-spin 0.9s linear infinite',
        margin: '0 auto 16px',
      }} />
      <p style={{ color: '#b0b8d4', margin: 0 }}>Translittération en cours...</p>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────

export function PoidsMystiquePage() {
  const navigate = useNavigate();

  const [name,   setName]   = useState('');
  const [mother, setMother] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<Result | null>(null);
  const [abjadOpen, setAbjadOpen] = useState(false);

  // ── Calcul ──────────────────────────────────────────────────────────────

  async function handleCalculate() {
    const trimName   = name.trim();
    const trimMother = mother.trim();
    if (!trimName || !trimMother) return;

    // Cache
    const cacheKey = `pm_${trimName}_${trimMother}_${gender}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setResult(JSON.parse(cached));
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [nameArabic, motherArabic] = await Promise.all([
        transliterateWithRetry(trimName),
        transliterateWithRetry(trimMother),
      ]);

      // Toujours recalculer côté client — ne jamais utiliser le poids de Gemini
      const nameWeight   = calculateWeight(nameArabic);
      const motherWeight = calculateWeight(motherArabic);
      const bonus = gender === 'homme' ? 52 : 452;
      const PM    = nameWeight + motherWeight + bonus;
      const { name: element, color: elementColor } = getElement(PM);

      const r: Result = { nameArabic, motherArabic, nameWeight, motherWeight, bonus, PM, element, elementColor };
      sessionStorage.setItem(cacheKey, JSON.stringify(r));
      setResult(r);
    } catch {
      setError('Erreur de connexion. Vérifie ta clé API et réessaie.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setName('');
    setMother('');
    setGender('homme');
    setResult(null);
    setError(null);
  }

  // ── Styles communs ──────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#111a55',
    border: '1px solid rgba(249,168,37,0.15)',
    borderRadius: '8px',
    padding: '24px',
  };

  const input: React.CSSProperties = {
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

  const label: React.CSSProperties = {
    color: '#b0b8d4',
    fontSize: '0.85rem',
    display: 'block',
    marginBottom: '6px',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#f9a825',
    color: '#1a237e',
    fontWeight: '700',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: '#f9a825',
    border: '1px solid #f9a825',
    padding: '12px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
  };

  const canCompute = name.trim() && mother.trim() && !loading;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', padding: '40px 20px 80px' }}>

      {/* Media queries responsive */}
      <style>{`
        @keyframes sd-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sd-result { animation: sd-fadein 0.5s ease-out; }
        .sd-pm-number { font-size: 4rem; }
        .sd-action-btns { flex-direction: row; }
        .sd-action-btns button { flex: 1 1 0; }
        @media (max-width: 640px) {
          .sd-pm-number { font-size: 3rem !important; }
          .sd-action-btns { flex-direction: column !important; }
          .sd-action-btns button { width: 100% !important; flex: unset !important; }
        }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ── SECTION 1 : EN-TÊTE ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>
            Calcul du Poids Mystique
          </h1>
          <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '1rem', lineHeight: '1.7', margin: '0 auto', maxWidth: '440px' }}>
            Découvre le nombre sacré de ton prénom<br />
            selon la table Abjad islamique
          </p>
          <Separator />
          <span style={{
            border: '1px solid #4caf50',
            color: '#81c784',
            padding: '6px 18px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'inline-block',
          }}>
            GRATUIT — Calcul 100% islamique
          </span>
        </div>

        {/* ── SECTION 2 : FORMULAIRE ──────────────────────────────────────── */}
        <div style={{ ...card, maxWidth: '600px', margin: '0 auto 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Champ prénom */}
            <div>
              <label style={label}>Ton prénom (en français)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canCompute && handleCalculate()}
                placeholder="Ex: Mohamed, Aissatou, Ibrahim..."
                style={input}
                disabled={loading}
              />
            </div>

            {/* Champ prénom mère */}
            <div>
              <label style={label}>Prénom de ta mère (en français)</label>
              <input
                type="text"
                value={mother}
                onChange={e => setMother(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canCompute && handleCalculate()}
                placeholder="Ex: Fatoumata, Mariama..."
                style={input}
                disabled={loading}
              />
            </div>

            {/* Genre */}
            <div>
              <label style={label}>Ton sexe</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['homme', 'femme'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #f9a825',
                      borderRadius: '4px',
                      background: gender === g ? '#f9a825' : 'transparent',
                      color: gender === g ? '#1a237e' : '#f9a825',
                      fontWeight: gender === g ? '700' : '400',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {g === 'homme' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton calculer */}
            <button
              onClick={handleCalculate}
              disabled={!canCompute}
              style={{
                width: '100%',
                background: canCompute ? '#f9a825' : 'rgba(249,168,37,0.35)',
                color: '#1a237e',
                fontWeight: '700',
                padding: '14px',
                border: 'none',
                borderRadius: '4px',
                cursor: canCompute ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.5px',
                transition: 'all 0.2s',
              }}
            >
              CALCULER MON POIDS MYSTIQUE
            </button>
          </div>
        </div>

        {/* ── SECTION 3 : CHARGEMENT ──────────────────────────────────────── */}
        {loading && <Spinner />}

        {/* ── SECTION 7 : ERREUR ──────────────────────────────────────────── */}
        {error && !loading && (
          <div style={{ maxWidth: '600px', margin: '0 auto 28px' }}>
            <div style={{
              background: 'rgba(229,57,53,0.1)',
              border: '1px solid #e53935',
              borderRadius: '8px',
              padding: '20px 24px',
            }}>
              <p style={{ color: '#ef9a9a', margin: '0 0 14px' }}>{error}</p>
              <button onClick={handleCalculate} style={btnPrimary}>
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 5 : RÉSULTATS ───────────────────────────────────────── */}
        {result && !loading && (
          <div className="sd-result">

            <Separator />

            {/* BLOC 1 — Prénoms en arabe */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

              {/* Carte : ton prénom */}
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                  Ton prénom
                </div>
                <div style={{ color: 'white', fontWeight: '600', marginBottom: '14px' }}>{name}</div>
                <div style={{
                  color: '#f9a825',
                  fontFamily: 'Noto Naskh Arabic, serif',
                  fontSize: '1.8em',
                  direction: 'rtl',
                  textAlign: 'right',
                  lineHeight: '1.8',
                  marginBottom: '10px',
                }}>
                  {result.nameArabic}
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>
                  Poids : <strong style={{ color: 'white' }}>{result.nameWeight}</strong>
                </div>
              </div>

              {/* Carte : prénom mère */}
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                  Prénom de ta mère
                </div>
                <div style={{ color: 'white', fontWeight: '600', marginBottom: '14px' }}>{mother}</div>
                <div style={{
                  color: '#f9a825',
                  fontFamily: 'Noto Naskh Arabic, serif',
                  fontSize: '1.8em',
                  direction: 'rtl',
                  textAlign: 'right',
                  lineHeight: '1.8',
                  marginBottom: '10px',
                }}>
                  {result.motherArabic}
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>
                  Poids : <strong style={{ color: 'white' }}>{result.motherWeight}</strong>
                </div>
              </div>
            </div>

            <Separator />

            {/* BLOC 2 — Poids Mystique */}
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px' }}>
                Ton Poids Mystique
              </div>
              <div
                className="sd-pm-number"
                style={{ color: '#f9a825', fontWeight: '700', lineHeight: 1, marginBottom: '16px' }}
              >
                {result.PM}
              </div>
              <div style={{ color: '#b0b8d4', fontSize: '0.9rem' }}>
                {result.nameWeight} + {result.motherWeight} + {result.bonus} ({gender}) ={' '}
                <strong style={{ color: 'white' }}>{result.PM}</strong>
              </div>
            </div>

            <Separator />

            {/* BLOC 3 — Élément */}
            <div style={{ ...card, border: `1px solid ${result.elementColor}`, textAlign: 'center' }}>
              <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px' }}>
                Ton Élément
              </div>
              <div style={{ color: result.elementColor, fontWeight: '700', fontSize: '2rem', marginBottom: '14px' }}>
                {result.element}
              </div>
              <p style={{ color: '#b0b8d4', lineHeight: '1.7', maxWidth: '420px', margin: '0 auto' }}>
                {ELEMENT_DESC[result.element]}
              </p>
            </div>

            <Separator />

            {/* BLOC 4 — Chiffres arabes-indiens */}
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
                En chiffres arabes-indiens
              </div>
              <div style={{
                color: '#f9a825',
                fontFamily: 'Noto Naskh Arabic, serif',
                fontSize: '3rem',
                direction: 'rtl',
                textAlign: 'center',
                lineHeight: 1.4,
              }}>
                {toArabicIndic(result.PM)}
              </div>
            </div>

            <Separator />

            {/* BLOC 5 — Boutons d'action */}
            <div
              className="sd-action-btns"
              style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}
            >
              <button
                onClick={() => navigate(`/carres-magiques?pm=${result.PM}`)}
                style={btnPrimary}
              >
                Générer mes carrés magiques
              </button>
              <button
                onClick={() => navigate('/destin')}
                style={btnSecondary}
              >
                Découvrir mon destin complet
              </button>
              <button
                onClick={reset}
                style={btnSecondary}
              >
                Nouveau calcul
              </button>
            </div>

            <Separator />

            {/* BLOC 6 — Accordion Abjad */}
            <div style={card}>
              <button
                onClick={() => setAbjadOpen(o => !o)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#f9a825',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 0,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>Qu'est-ce que le système Abjad ?</span>
                <span style={{
                  fontSize: '0.8rem',
                  transition: 'transform 0.3s',
                  transform: abjadOpen ? 'rotate(180deg)' : 'none',
                  display: 'inline-block',
                }}>
                  ▼
                </span>
              </button>

              {abjadOpen && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ color: '#b0b8d4', lineHeight: '1.8', marginBottom: '16px' }}>
                    Le système Abjad est une méthode ancestrale islamique qui attribue une valeur numérique
                    à chaque lettre de l'alphabet arabe. Cette science, appelée{' '}
                    <em style={{ color: '#f9a825' }}>Ilm al-Huruf</em> (science des lettres), permet de
                    calculer le poids mystique d'un nom afin de révéler ses influences spirituelles.
                  </p>
                  <p style={{ color: '#b0b8d4', lineHeight: '1.8', marginBottom: '24px' }}>
                    Le Poids Mystique (PM) est calculé en additionnant les valeurs Abjad de chaque lettre
                    du prénom, du prénom de la mère, et en ajoutant un bonus selon le genre
                    (+52 pour l'homme, +452 pour la femme).
                  </p>

                  {/* Table Abjad */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '8px',
                  }}>
                    {Object.entries(ABJAD).map(([letter, value]) => (
                      <div
                        key={letter}
                        style={{
                          background: '#0a0e2e',
                          border: '1px solid rgba(249,168,37,0.2)',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em' }}>
                          {letter}
                        </span>
                        <span style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Accordion affiché aussi AVANT le calcul (scroll info) */}
        {!result && !loading && (
          <div style={{ maxWidth: '600px', margin: '0 auto', ...card }}>
            <button
              onClick={() => setAbjadOpen(o => !o)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#f9a825',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 0,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span>Qu'est-ce que le système Abjad ?</span>
              <span style={{
                fontSize: '0.8rem',
                transition: 'transform 0.3s',
                transform: abjadOpen ? 'rotate(180deg)' : 'none',
                display: 'inline-block',
              }}>
                ▼
              </span>
            </button>

            {abjadOpen && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#b0b8d4', lineHeight: '1.8', marginBottom: '16px' }}>
                  Le système Abjad est une méthode ancestrale islamique qui attribue une valeur numérique
                  à chaque lettre de l'alphabet arabe. Cette science, appelée{' '}
                  <em style={{ color: '#f9a825' }}>Ilm al-Huruf</em> (science des lettres), permet de
                  calculer le poids mystique d'un nom afin de révéler ses influences spirituelles.
                </p>
                <p style={{ color: '#b0b8d4', lineHeight: '1.8', marginBottom: '24px' }}>
                  Le Poids Mystique (PM) est calculé en additionnant les valeurs Abjad de chaque lettre
                  du prénom, du prénom de la mère, et en ajoutant un bonus selon le genre
                  (+52 pour l'homme, +452 pour la femme).
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '8px',
                }}>
                  {Object.entries(ABJAD).map(([letter, value]) => (
                    <div
                      key={letter}
                      style={{
                        background: '#0a0e2e',
                        border: '1px solid rgba(249,168,37,0.2)',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em' }}>
                        {letter}
                      </span>
                      <span style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
