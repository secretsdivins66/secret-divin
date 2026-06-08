import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DreamSymbol {
  symbol: string;
  meaning: string;
}

interface InterpretationSection {
  title: string;
  content: string;
}

interface DreamData {
  title: string;
  nature: { type: string; summary: string };
  symbols: DreamSymbol[];
  interpretation: {
    global: string;
    message: string;
    warning: string | null;
    goodNews: string;
    sections: InterpretationSection[];
  };
  spiritual: {
    islamicView: string;
    africanView: string;
    prayer: string;
    prayerMeaning: string;
    prayerRepetitions: number;
    bestTimeForPrayer: string;
  };
  divineName: {
    arabic: string;
    withYa: string;
    transliteration: string;
    meaning: string;
    repetitions: number;
    reason: string;
  };
  plant: {
    nomFrancais: string;
    nomBambara: string;
    nomScientifique: string;
    lienWikipedia: string;
    partie: string;
    preparation: string;
    reason: string;
  };
  sacrifice: {
    isNeeded: boolean;
    type: string;
    reason: string;
    offerings: { item: string; quantity: string; meaning: string }[];
    recipient: string;
    timing: string;
    instructions: string;
  };
  actionPlan: { immediate: string; thisWeek: string; avoid: string };
  conclusion: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_25  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const CONTEXTS = [
  'Rêve ordinaire',
  'Rêve répétitif',
  'Cauchemar',
  'Rêve prémonitoire (impression)',
  'Vision nocturne',
];

const STATES = [
  'Tout va bien',
  'Période difficile',
  'En attente d\'une décision',
  'Malade ou inquiet',
  'En quête spirituelle',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNatureColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('bon') && t.includes('présage')) return '#4caf50';
  if (t.includes('avertissement')) return '#ff9800';
  if (t.includes('message spirituel')) return '#1565c0';
  if (t.includes('reflet')) return '#7b1fa2';
  return '#f9a825';
}

function buildPrompt(dreamText: string, context: string, currentState: string): string {
  return `Tu es un maître de l'interprétation des rêves dans la tradition islamique ouest-africaine. Tu combines la science islamique (tabir al-ru'ya) avec la sagesse traditionnelle africaine. Tu parles directement à la personne avec 'tu' en français. Ton ton est chaleureux, rassurant, profond et sage.

Rêve décrit : ${dreamText}
Contexte : ${context}
État actuel : ${currentState}

Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "title": "Titre court et évocateur pour ce rêve (5-7 mots max)",
  "nature": {
    "type": "Bon présage / Avertissement / Message spirituel / Reflet de l'âme / Vision prophétique",
    "summary": "Résumé en une phrase de ce que signifie ce rêve."
  },
  "symbols": [
    { "symbol": "élément du rêve", "meaning": "Signification spirituelle de cet élément dans ce contexte précis." },
    { "symbol": "deuxième élément important", "meaning": "Sa signification dans ce rêve." },
    { "symbol": "troisième élément si présent", "meaning": "Sa signification." }
  ],
  "interpretation": {
    "global": "4-5 phrases d'interprétation globale du rêve. Utilise tu. Sois profond et rassurant.",
    "message": "Le message principal que ce rêve te transmet. 2-3 phrases directes.",
    "warning": "Avertissement ou conseil de prudence si nécessaire. Sinon null.",
    "goodNews": "La bonne nouvelle ou espoir que contient ce rêve. 1-2 phrases.",
    "sections": [
      { "title": "Ce que révèle ton rêve", "content": "3-4 phrases d'interprétation globale." },
      { "title": "Les symboles de ton rêve", "content": "Analyse globale des symboles en 3-4 phrases." },
      { "title": "Le message pour toi", "content": "2-3 phrases de message direct." }
    ]
  },
  "spiritual": {
    "islamicView": "L'interprétation selon la tradition islamique (Ibn Sirin). 2-3 phrases.",
    "africanView": "L'interprétation selon la tradition spirituelle africaine ouest-africaine. 2-3 phrases.",
    "prayer": "Courte invocation recommandée en arabe SANS harakat",
    "prayerMeaning": "Signification française de cette prière",
    "prayerRepetitions": 7,
    "bestTimeForPrayer": "Matin au lever / Avant de dormir / Après Fajr"
  },
  "divineName": {
    "arabic": "nom SANS ال",
    "withYa": "يا + nom",
    "transliteration": "Ya ...",
    "meaning": "signification",
    "repetitions": 99,
    "reason": "Pourquoi ce nom divin pour ce rêve spécifique."
  },
  "plant": {
    "nomFrancais": "nom français",
    "nomBambara": "nom bambara",
    "nomScientifique": "nom scientifique exact",
    "lienWikipedia": "https://fr.wikipedia.org/wiki/...",
    "partie": "feuilles/écorce/racines",
    "preparation": "comment préparer et utiliser cette plante après ce rêve",
    "reason": "Pourquoi cette plante pour ce rêve."
  },
  "sacrifice": {
    "isNeeded": true,
    "type": "remerciement / protection",
    "reason": "Pourquoi ce sacrifice pour ce rêve.",
    "offerings": [
      { "item": "offrande 1", "quantity": "nombre", "meaning": "signification de cette offrande" },
      { "item": "offrande 2", "quantity": "nombre", "meaning": "signification" }
    ],
    "recipient": "À qui donner (vieux, enfants, imam, handicapé, talibé...)",
    "timing": "Quel jour et heure",
    "instructions": "Instructions complètes pour réaliser ce sacrifice."
  },
  "actionPlan": {
    "immediate": "Ce que tu dois faire immédiatement après ce rêve (dans les 24h).",
    "thisWeek": "Ce que tu dois faire cette semaine suite à ce rêve.",
    "avoid": "Ce qu'il faut absolument éviter après ce rêve."
  },
  "conclusion": "Message final chaleureux et personnel. 2-3 phrases encourageantes. Termine par BarakAllahu fik."
}

RÈGLES pour les offrandes : Toujours des offrandes traditionnelles ouest-africaines réelles : colas (rouges, blanches), lait frais, dates, mil, riz, poisson, habit blanc, argent symbolique, galettes, fruits, encens. Nombre symbolique : 3, 7, 9, 11, 41. Destinataire précis : vieux, vieille, enfants, imam, marabout, handicapé, talibé, mère de jumeaux. Si bon rêve : sacrifice de remerciement. Si mauvais rêve : sacrifice de protection.
RÈGLES noms divins : Toujours SANS ال. Toujours avec يا. Correct : يا رحيم. Incorrect : يا الرحيم.
RÈGLES plante : Plantes africaines réelles disponibles en Afrique de l'Ouest. Toujours nom scientifique exact. Toujours lien Wikipedia valide.`;
}

async function callGemini(prompt: string, retries = 1): Promise<DreamData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 2500 },
    }),
  });
  const d = await res.json();
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean) as DreamData;
  } catch {
    if (retries > 0) return callGemini(prompt, retries - 1);
    throw new Error('Réponse invalide. Veuillez réessayer.');
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sep() {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(249,168,37,0.4)', margin: '28px 0', letterSpacing: '6px', fontSize: '0.85rem' }}>
      ——— ✦ ———
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '24px', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span>✦</span><span>{children}</span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function RevesPage() {
  const [dreamText, setDreamText]     = useState('');
  const [context, setContext]         = useState(CONTEXTS[0]);
  const [currentState, setCurrentState] = useState(STATES[0]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [data, setData]               = useState<DreamData | null>(null);
  const [balance, setBalance]         = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF]   = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const cacheKey = `reves_${dreamText.trim().substring(0, 50)}_${context}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dreamText.trim().length < 20) return;

    // Cache check
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setData(JSON.parse(cached) as DreamData); return; }

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Veuillez vous connecter.'); return; }

      const { data: creditData } = await supabase
        .from('user_credits').select('balance').eq('user_id', user.id).single();
      const bal = (creditData as { balance: number } | null)?.balance ?? 0;
      if (bal < 2) { setBalance(bal); setShowCreditModal(true); return; }

      const prompt = buildPrompt(dreamText.trim(), context, currentState);
      const result = await callGemini(prompt);

      // Déduction crédits
      await supabase.from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await supabase.from('credit_transactions').insert({
        user_id: user.id, type: 'use', amount: -2, tool: 'reves',
        balance_after: bal - 2,
        description: 'Interprétation rêve — ' + dreamText.trim().substring(0, 30),
      });

      // Sauvegarde
      await supabase.from('saved_rituals').insert({
        user_id: user.id,
        title: 'Rêve — ' + result.title,
        content: result,
        page_source: 'reves',
      });

      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Une erreur s\'est produite. Vérifie ta connexion et réessaie.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!resultsRef.current || !data) return;
    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { backgroundColor: '#0a0e2e', scale: 1.5, useCORS: true });
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const imgW = 210, pageH = 297;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, -y, imgW, imgH);
        y += pageH;
      }
      pdf.save('reve-secretdivin.pdf');
    } finally {
      setDownloadingPDF(false);
    }
  }

  const globalAudioText = data
    ? `${data.nature.summary} ${data.interpretation.global} ${data.interpretation.message} ${data.conclusion}`
    : '';

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>
            Interprétation des Rêves
          </h1>
          <p style={{ color: '#b0b8d4', fontSize: '0.95rem', fontStyle: 'italic', maxWidth: '480px', margin: '0 auto 16px', lineHeight: '1.6' }}>
            Décris ton rêve et reçois une interprétation complète selon la tradition islamique et africaine
          </p>
          <Sep />
          <span style={{ display: 'inline-block', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '6px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
            2 crédits par génération
          </span>
        </div>

        {/* Formulaire */}
        {!data && (
          <Card>
            <form onSubmit={handleSubmit}>
              {/* Textarea */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
                  Décris ton rêve
                </label>
                <textarea
                  value={dreamText}
                  onChange={e => setDreamText(e.target.value)}
                  required minLength={20} rows={6}
                  placeholder={"Décris ton rêve en détail...\nLes personnes présentes, les lieux, les couleurs, les émotions ressenties, les événements qui se sont passés..."}
                  style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '12px 14px', borderRadius: '4px', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.7', minHeight: '120px' }}
                />
                <div style={{ textAlign: 'right', color: dreamText.length < 20 ? '#ef9a9a' : '#b0b8d4', fontSize: '0.75rem', marginTop: '4px' }}>
                  {dreamText.length} caractères {dreamText.length < 20 ? '(minimum 20)' : ''}
                </div>
              </div>

              {/* Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                    Contexte du rêve
                  </label>
                  <select value={context} onChange={e => setContext(e.target.value)}
                    style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 14px', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {CONTEXTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                    Ton état actuel
                  </label>
                  <select value={currentState} onChange={e => setCurrentState(e.target.value)}
                    style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 14px', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef9a9a', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  {error}
                  <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                </div>
              )}

              <button type="submit" disabled={loading || dreamText.trim().length < 20}
                style={{ width: '100%', background: (loading || dreamText.trim().length < 20) ? '#333' : 'linear-gradient(135deg, #f9a825, #e65100)', color: (loading || dreamText.trim().length < 20) ? '#888' : '#0a0e2e', fontWeight: '700', fontSize: '1rem', padding: '14px', border: 'none', borderRadius: '4px', cursor: (loading || dreamText.trim().length < 20) ? 'not-allowed' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {loading ? 'Interprétation en cours...' : 'Interpréter mon rêve — 2 crédits'}
              </button>
            </form>
          </Card>
        )}

        {/* Chargement */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '52px', height: '52px', border: '3px solid rgba(249,168,37,0.2)', borderTop: '3px solid #f9a825', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '1rem' }}>Ton rêve est en cours d'interprétation...</div>
          </div>
        )}

        {/* ─── Résultats ─── */}
        {data && !loading && (
          <div ref={resultsRef} style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* BLOC 1 — En-tête du résultat */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.8rem', marginBottom: '14px' }}>{data.title}</h2>
              {(() => {
                const color = getNatureColor(data.nature.type);
                return (
                  <span style={{ display: 'inline-block', background: color + '22', color, border: `1px solid ${color}55`, padding: '5px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '14px' }}>
                    {data.nature.type}
                  </span>
                );
              })()}
              <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                "{data.nature.summary}"
              </p>
            </div>

            <Sep />

            {/* BLOC 2 — Symboles */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Les Symboles de ton Rêve</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                {data.symbols.map((s, i) => (
                  <Card key={i} style={{ padding: '18px' }}>
                    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px' }}>{s.symbol}</div>
                    <div style={{ color: '#e8eaf6', fontSize: '0.88rem', lineHeight: '1.6' }}>{s.meaning}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Sep />

            {/* BLOC 3 — Interprétation Générale */}
            <Card style={{ marginBottom: '16px' }}>
              <SectionTitle>Interprétation Générale</SectionTitle>
              {data.interpretation.sections.map((sec, i) => (
                <div key={i} style={{ marginBottom: i < data.interpretation.sections.length - 1 ? '20px' : '0' }}>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px' }}>{sec.title}</div>
                  <Sep />
                  <p style={{ color: '#e8eaf6', lineHeight: '1.8', margin: 0 }}>{sec.content}</p>
                </div>
              ))}
            </Card>

            {/* Message principal */}
            <div style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.5)', borderRadius: '8px', padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
              <p style={{ color: '#e8eaf6', fontWeight: '700', fontStyle: 'italic', lineHeight: '1.8', margin: 0, fontSize: '1rem' }}>{data.interpretation.message}</p>
            </div>

            {/* Avertissement (si présent) */}
            {data.interpretation.warning && (
              <div style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '8px', padding: '18px', marginBottom: '14px' }}>
                <div style={{ color: '#ff9800', fontWeight: '700', marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Attention</div>
                <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{data.interpretation.warning}</p>
              </div>
            )}

            {/* Bonne nouvelle */}
            <div style={{ background: 'rgba(76,175,80,0.07)', border: '1px solid rgba(76,175,80,0.35)', borderRadius: '8px', padding: '18px', marginBottom: '8px' }}>
              <div style={{ color: '#4caf50', fontWeight: '700', marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Bonne Nouvelle</div>
              <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{data.interpretation.goodNews}</p>
            </div>

            <Sep />

            {/* BLOC 4 — Vision Spirituelle */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Vision Spirituelle</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ background: '#111a55', border: '1px solid rgba(21,101,192,0.5)', borderLeft: '4px solid #1565c0', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ color: '#42a5f5', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Vision Islamique</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.spiritual.islamicView}</p>
                </div>
                <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.35)', borderLeft: '4px solid #f9a825', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Sagesse Africaine</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.spiritual.africanView}</p>
                </div>
              </div>
            </div>

            <Sep />

            {/* BLOC 5 — Invocation */}
            <Card style={{ textAlign: 'center', marginBottom: '8px' }}>
              <SectionTitle>Invocation Recommandée</SectionTitle>
              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.8em', direction: 'rtl', textAlign: 'right', margin: '0 0 12px', lineHeight: '2' }}>
                {data.spiritual.prayer}
              </div>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', marginBottom: '14px', lineHeight: '1.6' }}>{data.spiritual.prayerMeaning}</p>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  À réciter {data.spiritual.prayerRepetitions} fois
                </span>
              </div>
              <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '16px' }}>{data.spiritual.bestTimeForPrayer}</p>
              <AudioButton text={data.spiritual.prayer} label="Écouter l'invocation" />
            </Card>

            <Sep />

            {/* BLOC 6 — Nom Divin */}
            <Card style={{ textAlign: 'center', marginBottom: '8px' }}>
              <SectionTitle>Nom Divin Recommandé</SectionTitle>
              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '2.5em', direction: 'rtl', textAlign: 'right', marginBottom: '8px', lineHeight: '1.6' }}>
                {data.divineName.withYa}
              </div>
              <div style={{ color: '#b0b8d4', marginBottom: '6px' }}>{data.divineName.transliteration}</div>
              <div style={{ color: '#e8eaf6', fontWeight: '600', marginBottom: '14px' }}>{data.divineName.meaning}</div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  À réciter {data.divineName.repetitions} fois
                </span>
              </div>
              <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', marginBottom: '16px', lineHeight: '1.6' }}>{data.divineName.reason}</p>
              <AudioButton text={data.divineName.withYa} label="Écouter le nom divin" />
            </Card>

            <Sep />

            {/* BLOC 7 — Plante */}
            <div style={{ background: '#0d2b1a', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '8px', padding: '24px', marginBottom: '8px' }}>
              <SectionTitle>Plante Spirituelle pour ce Rêve</SectionTitle>
              <div style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1.1em', marginBottom: '4px' }}>{data.plant.nomFrancais}</div>
              <div style={{ color: '#f9a825', fontStyle: 'italic', marginBottom: '4px' }}>{data.plant.nomBambara}</div>
              <div style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.82rem', marginBottom: '16px' }}>{data.plant.nomScientifique}</div>
              <div style={{ color: '#e8eaf6', marginBottom: '8px' }}>
                <span style={{ color: '#f9a825', fontWeight: '600' }}>Partie utilisée : </span>{data.plant.partie}
              </div>
              <div style={{ color: '#e8eaf6', marginBottom: '8px', lineHeight: '1.7' }}>
                <span style={{ color: '#f9a825', fontWeight: '600' }}>Préparation : </span>{data.plant.preparation}
              </div>
              <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '18px', lineHeight: '1.6' }}>{data.plant.reason}</p>
              <button onClick={() => window.open(data.plant.lienWikipedia, '_blank', 'noopener,noreferrer')}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}>
                En savoir plus sur cette plante
              </button>
            </div>

            <Sep />

            {/* BLOC 8 — Sacrifice */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Sacrifice Recommandé</SectionTitle>
              {data.sacrifice.isNeeded && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ display: 'inline-block', background: data.sacrifice.type.toLowerCase().includes('remerciement') ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)', color: data.sacrifice.type.toLowerCase().includes('remerciement') ? '#4caf50' : '#ff9800', border: `1px solid ${data.sacrifice.type.toLowerCase().includes('remerciement') ? 'rgba(76,175,80,0.4)' : 'rgba(255,152,0,0.4)'}`, padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {data.sacrifice.type}
                    </span>
                  </div>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', marginBottom: '18px', lineHeight: '1.6' }}>{data.sacrifice.reason}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    {data.sacrifice.offerings.map((o, i) => (
                      <div key={i} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.1)', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ color: '#e8eaf6', fontWeight: '600', marginBottom: '4px' }}>
                          {o.item} — <span style={{ color: '#f9a825' }}>Quantité : {o.quantity}</span>
                        </div>
                        <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{o.meaning}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ color: '#e8eaf6', fontWeight: '700', marginBottom: '6px' }}>
                    À donner à : <span style={{ color: '#f9a825' }}>{data.sacrifice.recipient}</span>
                  </div>
                  <div style={{ color: '#e8eaf6', marginBottom: '16px' }}>
                    Moment : <span style={{ color: '#b0b8d4' }}>{data.sacrifice.timing}</span>
                  </div>

                  <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instructions</div>
                    <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.sacrifice.instructions}</p>
                  </div>
                </>
              )}
            </Card>

            <Sep />

            {/* BLOC 9 — Plan d'action */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Que Faire Maintenant ?</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.4)', borderLeft: '4px solid #f9a825', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Dans les 24h</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{data.actionPlan.immediate}</p>
                </div>
                <div style={{ background: '#111a55', border: '1px solid rgba(21,101,192,0.4)', borderLeft: '4px solid #1565c0', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ color: '#42a5f5', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Cette Semaine</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{data.actionPlan.thisWeek}</p>
                </div>
                <div style={{ background: '#111a55', border: '1px solid rgba(229,57,53,0.4)', borderLeft: '4px solid #e53935', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ color: '#ef9a9a', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>À Éviter</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{data.actionPlan.avoid}</p>
                </div>
              </div>
            </div>

            <Sep />

            {/* BLOC 10 — Conclusion */}
            <div style={{ background: '#1a237e', border: '2px solid #f9a825', borderRadius: '8px', padding: '28px', textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.85', fontSize: '1rem', margin: 0 }}>{data.conclusion}</p>
            </div>

            <Sep />

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <AudioButton text={globalAudioText} label="Écouter l'interprétation" isLong={true} />
              <button onClick={handleDownloadPDF} disabled={downloadingPDF}
                style={{ background: downloadingPDF ? '#333' : '#f9a825', color: downloadingPDF ? '#888' : '#0a0e2e', fontWeight: '700', padding: '8px 22px', border: 'none', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Génération PDF...' : 'Télécharger en PDF'}
              </button>
              <button onClick={() => { setData(null); setError(''); }}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 22px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Interpréter un autre rêve
              </button>
            </div>

          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditModal toolName="l'Interprétation des Rêves" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />
      )}
    </div>
  );
}
