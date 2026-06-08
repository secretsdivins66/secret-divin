import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, GENDER_BONUS } from '../utils/mystique';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DivineName {
  arabic: string;
  withYa: string;
  transliteration: string;
  meaning: string;
  weight: number;
}

interface ZikrStep {
  order: number;
  title: string;
  arabic: string;
  repetitions: number;
  note: string | null;
}

interface SecretsData {
  secretNumber: { value: number; hidden: string; power: string };
  hiddenMeaning: { nameSecret: string; motherSecret: string; combinedPower: string };
  divineNames: { name1: DivineName; name2: DivineName; combined: string; reason: string };
  verse: { arabic: string; surah: string; ayah: string; meaning: string; reason: string; writingInstructions: string };
  invocation: { arabicNoHarakat: string; arabicWithHarakat: string; meaning: string; repetitions: number };
  talisman: { squareType: string; choiceReason: string; writingOrder: string[]; bathInstructions: string; ritualDuration: string };
  zikr: { steps: ZikrStep[]; bestTime: string; duration: string };
  plant: { nomFrancais: string; nomBambara: string; nomScientifique: string; lienWikipedia: string; partie: string; preparation: string; reason: string };
  sacrifice: { isRecommended: boolean; reason: string; offerings: { item: string; quantity: string; meaning: string }[]; recipient: string; timing: string; instructions: string };
  warnings: string[];
  conclusion: string;
}

// ─── Square generation ───────────────────────────────────────────────────────

type SquareSize = 3 | 4 | 5;

const SQ_PARAMS: Record<SquareSize, { subtract: number; divisor: number }> = {
  3: { subtract: 12, divisor: 3 },
  4: { subtract: 30, divisor: 4 },
  5: { subtract: 60, divisor: 5 },
};

const SQ_LAYOUTS: Record<SquareSize, number[]> = {
  3: [4,9,2, 3,5,7, 8,1,6],
  4: [8,11,14,1, 13,2,7,12, 3,16,9,6, 10,5,4,15],
  5: [18,10,22,14,1, 12,4,16,8,25, 6,23,15,2,19, 5,17,9,21,13, 24,11,3,20,7],
};

const SQ_THRESHOLDS: Record<SquareSize, Record<number, number>> = {
  3: { 0:99, 1:7, 2:4 },
  4: { 0:99, 1:13, 2:9, 3:5 },
  5: { 0:99, 1:21, 2:16, 3:11, 4:6 },
};

function generateSquare(PM: number, size: SquareSize): number[] {
  const { subtract, divisor } = SQ_PARAMS[size];
  const remainder = (PM - subtract) % divisor;
  const threshold = SQ_THRESHOLDS[size][remainder] ?? 99;
  const entry = Math.floor((PM - subtract) / divisor);
  return SQ_LAYOUTS[size].map((L, i) => {
    const val = entry + (L - 1);
    return (i + 1) >= threshold ? val + 1 : val;
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const OBJECTIVES = [
  'Protection spirituelle',
  'Réussite et succès',
  'Amour et mariage',
  'Richesse et abondance',
  'Santé et guérison',
  'Élévation spirituelle',
  'Chance et bénédiction',
  'Autre',
];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function translateName(name: string): Promise<{ arabic: string }> {
  const res = await fetch(GEMINI_FLASH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translittère ce nom en arabe SANS harakat. Retourne UNIQUEMENT du JSON valide :\n{"arabic": "النص", "weight": 0}\nNom : ${name}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
    }),
  });
  const j = await res.json();
  const raw = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  const parsed = JSON.parse(cleaned);
  return { arabic: (parsed.arabic as string) ?? '' };
}

async function callSecretsGemini(prompt: string): Promise<SecretsData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) throw new Error(`Erreur de connexion (${res.status})`);
  const j = await res.json();
  const raw = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as SecretsData;
}

function buildPrompt(
  firstName: string, nameArabic: string,
  motherName: string, motherArabic: string,
  gender: string, objective: string, pm: number,
): string {
  const ibnBint = gender === 'homme' ? 'بن' : 'بنت';
  return `Tu es un maître de la mystique islamique ouest-africaine et de la science des lettres (Ilm al-Huruf). Tu parles avec "tu" en français. Ton ton est profond, sérieux et rassurant.

Prénom : ${firstName}
Prénom arabe : ${nameArabic}
Mère : ${motherName}
Mère arabe : ${motherArabic}
Sexe : ${gender}
Objectif : ${objective}
PM : ${pm}
Connecteur : ${ibnBint}

Retourne UNIQUEMENT du JSON valide respectant exactement ce schéma :

{
  "secretNumber": {
    "value": ${pm},
    "hidden": "Le chiffre caché derrière ce PM en 2 phrases.",
    "power": "La puissance mystique de ce nombre en 2 phrases."
  },
  "hiddenMeaning": {
    "nameSecret": "2-3 phrases sur les secrets cachés dans le prénom ${firstName} selon la science des lettres.",
    "motherSecret": "2 phrases sur l'influence du prénom de la mère sur le destin.",
    "combinedPower": "2 phrases sur la puissance combinée des deux prénoms."
  },
  "divineNames": {
    "name1": {
      "arabic": "nom SANS ال",
      "withYa": "يا + nom",
      "transliteration": "Ya ...",
      "meaning": "signification",
      "weight": 0
    },
    "name2": {
      "arabic": "nom SANS ال",
      "withYa": "يا + nom",
      "transliteration": "Ya ...",
      "meaning": "signification",
      "weight": 0
    },
    "combined": "يا nom1 يا nom2",
    "reason": "2 phrases sur pourquoi ces 2 noms divins pour cet objectif."
  },
  "verse": {
    "arabic": "verset SANS harakat",
    "surah": "nom sourate en français",
    "ayah": "numéro",
    "meaning": "traduction française",
    "reason": "Pourquoi ce verset pour cet objectif.",
    "writingInstructions": "Comment écrire ce verset sur la tablette en bois avec encre naturelle."
  },
  "invocation": {
    "arabicNoHarakat": "invocation complète SANS harakat contenant يا nom1 يا nom2 ${nameArabic} ${ibnBint} ${motherArabic} et le verset",
    "arabicWithHarakat": "même invocation AVEC tous les harakat pour le zikr quotidien",
    "meaning": "traduction française complète",
    "repetitions": 41
  },
  "talisman": {
    "squareType": "3x3 si PM < 100, 4x4 si 100 ≤ PM < 500, 5x5 si PM ≥ 500",
    "choiceReason": "Pourquoi ce type de carré pour cet objectif et ce PM.",
    "writingOrder": [
      "Étape 1 de l'écriture du talisman",
      "Étape 2",
      "Étape 3",
      "Étape 4",
      "Étape 5"
    ],
    "bathInstructions": "Instructions complètes pour le bain rituel après avoir lavé la tablette.",
    "ritualDuration": "7 jours"
  },
  "zikr": {
    "steps": [
      { "order": 1, "title": "Bismillah", "arabic": "بسم الله الرحمن الرحيم", "repetitions": 1, "note": "Toujours commencer par Bismillah" },
      { "order": 2, "title": "Salat sur le Prophète", "arabic": "اللهم صل على سيدنا محمد", "repetitions": 3, "note": null },
      { "order": 3, "title": "Les 2 noms divins", "arabic": "[divineNames.combined à remplir]", "repetitions": 99, "note": "يا sans ال obligatoire" },
      { "order": 4, "title": "Le verset coranique", "arabic": "[verse.arabic à remplir]", "repetitions": 7, "note": null },
      { "order": 5, "title": "L'invocation complète", "arabic": "[invocation.arabicWithHarakat à remplir]", "repetitions": 41, "note": "Réciter lentement et avec concentration" },
      { "order": 6, "title": "Clôture salat", "arabic": "اللهم صل على سيدنا محمد", "repetitions": 3, "note": "Terminer par Al-Hamdulillah" }
    ],
    "bestTime": "Après Fajr ou avant de dormir",
    "duration": "7 jours"
  },
  "plant": {
    "nomFrancais": "nom français",
    "nomBambara": "nom bambara ou langue locale",
    "nomScientifique": "Nom Scientifique exact",
    "lienWikipedia": "https://fr.wikipedia.org/wiki/...",
    "partie": "feuilles/écorce/racines",
    "preparation": "comment préparer et utiliser avec le bain",
    "reason": "Pourquoi cette plante pour cet objectif."
  },
  "sacrifice": {
    "isRecommended": true,
    "reason": "Pourquoi ce sacrifice accompagne ce rituel.",
    "offerings": [
      { "item": "offrande 1", "quantity": "nombre", "meaning": "signification" },
      { "item": "offrande 2", "quantity": "nombre", "meaning": "signification" }
    ],
    "recipient": "À qui donner",
    "timing": "Quel jour et heure",
    "instructions": "Instructions complètes du sacrifice."
  },
  "warnings": [
    "Avertissement 1 important",
    "Avertissement 2 si nécessaire"
  ],
  "conclusion": "Message final chaleureux adressé à ${firstName}. 3 phrases encourageantes. Termine par InchaAllah."
}

RÈGLES NOMS DIVINS :
TOUJOURS sans ال devant le nom dans le champ arabic.
TOUJOURS avec يا pour affichage dans withYa.
Correct : يا ودود يا جامع
Incorrect : يا الودود يا الجامع

RÈGLES PLANTE :
Plantes africaines réelles uniquement.
Nom scientifique exact.
Lien Wikipedia valide.

IMPORTANT : Dans le zikr.steps, remplir les arabic des étapes 3, 4 et 5 avec les vraies valeurs de divineNames.combined, verse.arabic et invocation.arabicWithHarakat générés dans cette même réponse.`;
}

// ─── UI Components ───────────────────────────────────────────────────────────

function Separator() {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(249,168,37,0.45)', margin: '20px 0', letterSpacing: '4px', fontSize: '0.88rem' }}>
      ——— ✦ ———
    </div>
  );
}

function BlocTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: '#f9a825', fontSize: '1rem', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.5px' }}>
      {children}
    </h2>
  );
}

function Card({ children, bg = '#111a55', border = 'rgba(249,168,37,0.15)', style }: {
  children: React.ReactNode;
  bg?: string;
  border?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '18px 20px', ...style }}>
      {children}
    </div>
  );
}

function ArabicLine({ text, size = '1.6rem', color = '#f9a825' }: { text: string; size?: string; color?: string }) {
  return (
    <div style={{ fontFamily: "'Noto Naskh Arabic', serif", direction: 'rtl', textAlign: 'right', fontSize: size, color, lineHeight: '1.9', margin: '4px 0' }}>
      {text}
    </div>
  );
}

function SquareGrid({ cells, size }: { cells: number[]; size: number }) {
  const px = size === 3 ? 64 : size === 4 ? 56 : 48;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, ${px}px)`, gap: '2px', width: 'fit-content', margin: '0 auto' }}>
      {cells.map((v, i) => (
        <div key={i} style={{ width: px, height: px, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '2px solid #f9a825', color: '#1a237e', fontWeight: '700', fontSize: '0.95rem', borderRadius: '2px' }}>
          {v}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 20px' }}>
      <div style={{ width: '44px', height: '44px', border: '3px solid rgba(249,168,37,0.2)', borderTopColor: '#f9a825', borderRadius: '50%', animation: 'sq-spin 0.8s linear infinite' }} />
      <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.95rem' }}>Révélation de tes secrets...</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SecretsPage() {
  const [firstName, setFirstName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [objective, setObjective] = useState(OBJECTIVES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SecretsData | null>(null);
  const [firstNameAr, setFirstNameAr] = useState('');
  const [motherNameAr, setMotherNameAr] = useState('');
  const [pm, setPm] = useState(0);
  const [squareCells, setSquareCells] = useState<number[] | null>(null);
  const [squareSize, setSquareSize] = useState<number>(3);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const COST = 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !motherName.trim()) return;
    setError('');

    const cacheKey = `secrets_${firstName.trim()}_${motherName.trim()}_${gender}_${objective}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const p = JSON.parse(cached) as { data: SecretsData; fnAr: string; mnAr: string; pm: number; cells: number[]; sz: number };
      setData(p.data); setFirstNameAr(p.fnAr); setMotherNameAr(p.mnAr); setPm(p.pm);
      setSquareCells(p.cells); setSquareSize(p.sz);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Vous devez être connecté.'); return; }

    const { data: credits } = await supabase.from('user_credits').select('balance').eq('user_id', session.user.id).single();
    const creditBalance = (credits as { balance: number } | null)?.balance ?? 0;
    if (creditBalance < COST) { setBalance(creditBalance); setShowCreditModal(true); return; }

    setLoading(true);
    try {
      const [nameRes, motherRes] = await Promise.all([
        translateName(firstName.trim()),
        translateName(motherName.trim()),
      ]);
      setFirstNameAr(nameRes.arabic);
      setMotherNameAr(motherRes.arabic);

      const nameWeight = calculateWeight(nameRes.arabic);
      const motherWeight = calculateWeight(motherRes.arabic);
      const pmVal = nameWeight + motherWeight + GENDER_BONUS[gender];
      setPm(pmVal);

      const prompt = buildPrompt(firstName.trim(), nameRes.arabic, motherName.trim(), motherRes.arabic, gender, objective, pmVal);
      let result: SecretsData;
      try { result = await callSecretsGemini(prompt); }
      catch { result = await callSecretsGemini(prompt); }

      const sz: SquareSize = result.talisman.squareType === '5x5' ? 5 : result.talisman.squareType === '4x4' ? 4 : 3;
      let cells: number[] | null = null;
      try { cells = generateSquare(pmVal, sz); } catch { cells = null; }
      setSquareCells(cells);
      setSquareSize(sz);

      await supabase.from('user_credits').update({ balance: creditBalance - COST, updated_at: new Date().toISOString() }).eq('user_id', session.user.id);
      await supabase.from('credit_transactions').insert({ user_id: session.user.id, type: 'use', amount: -COST, tool: 'secrets', balance_after: creditBalance - COST, description: `Secrets mystiques — ${firstName.trim()}` });
      supabase.from('saved_rituals').insert({ user_id: session.user.id, title: `Secrets de ${firstName.trim()}`, content: result, page_source: 'secrets' }).then(() => {});

      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, fnAr: nameRes.arabic, mnAr: motherRes.arabic, pm: pmVal, cells, sz }));
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePDF() {
    if (!resultsRef.current || !data) return;
    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(resultsRef.current, { backgroundColor: '#0a0e2e', scale: 1.5, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (canvas.height * pw) / canvas.width;
      let left = ih; let pos = 0;
      pdf.addImage(imgData, 'PNG', 0, pos, pw, ih);
      left -= ph;
      while (left > 0) { pos -= ph; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, pos, pw, ih); left -= ph; }
      pdf.save(`secrets-${firstName.trim()}-secretdivin.pdf`);
    } catch { setError('Erreur PDF.'); }
    finally { setDownloadingPDF(false); }
  }

  function handleReset() { setData(null); setError(''); setFirstNameAr(''); setMotherNameAr(''); setPm(0); setSquareCells(null); }

  const connector = gender === 'homme' ? 'بن' : 'بنت';
  const audioText = data ? [data.hiddenMeaning.nameSecret, data.hiddenMeaning.combinedPower, data.invocation.meaning, data.conclusion].join('. ') : '';

  // ─── Input style shared ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(10,14,46,0.8)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', color: 'white', padding: '10px 14px', fontSize: '0.95rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', paddingBottom: '48px' }}>
      <style>{`
        @keyframes sq-spin { to { transform: rotate(360deg); } }
        @keyframes sq-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .sq-fade { animation: sq-fade 0.4s ease both; }
        .sq-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .sq-duo { grid-template-columns: 1fr; } }
      `}</style>

      {/* ─── En-tête ─── */}
      <div style={{ background: 'linear-gradient(180deg, #111a55 0%, #0a0e2e 100%)', borderBottom: '1px solid rgba(249,168,37,0.15)', padding: '44px 20px 36px', textAlign: 'center' }}>
        <h1 style={{ color: '#f9a825', fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>Secrets Mystiques Cachés</h1>
        <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.7, marginBottom: '18px' }}>
          Révèle les secrets spirituels de ton prénom<br />et reçois ton invocation personnalisée
        </p>
        <Separator />
        <div style={{ display: 'inline-block', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '5px 18px', borderRadius: '20px', fontSize: '0.82rem', marginTop: '4px' }}>
          2 crédits par génération
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}>

        {showCreditModal && (
          <CreditModal toolName="secrets" cost={COST} balance={balance} onClose={() => setShowCreditModal(false)} />
        )}

        {/* ─── Formulaire ─── */}
        {!data && !loading && (
          <form onSubmit={handleSubmit} style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '28px', marginTop: '28px' }}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Ton prénom (en français)</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex: Mohamed, Aissatou..." required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Prénom de ta mère (en français)</label>
              <input value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Ex: Fatoumata..." required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Ton sexe</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['homme', 'femme'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', border: `1px solid ${gender === g ? '#f9a825' : 'rgba(249,168,37,0.25)'}`, background: gender === g ? 'rgba(249,168,37,0.12)' : 'transparent', color: gender === g ? '#f9a825' : '#b0b8d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', textTransform: 'capitalize' }}>
                    {g === 'homme' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Ton objectif principal</label>
              <select value={objective} onChange={e => setObjective(e.target.value)} style={inputStyle}>
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {error && (
              <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: '6px', padding: '10px 14px', color: '#e57373', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={!firstName.trim() || !motherName.trim()} style={{ width: '100%', background: 'linear-gradient(135deg, #f9a825, #e65100)', color: '#1a237e', fontWeight: '800', fontSize: '1rem', padding: '14px', border: 'none', borderRadius: '6px', cursor: !firstName.trim() || !motherName.trim() ? 'not-allowed' : 'pointer', opacity: !firstName.trim() || !motherName.trim() ? 0.6 : 1 }}>
              RÉVÉLER MES SECRETS MYSTIQUES
            </button>
          </form>
        )}

        {loading && <Spinner />}

        {!loading && error && !data && (
          <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: '8px', padding: '20px', marginTop: '24px', textAlign: 'center' }}>
            <p style={{ color: '#e57373', marginBottom: '12px' }}>{error}</p>
            <button onClick={() => setError('')} style={{ background: 'transparent', border: '1px solid #e57373', color: '#e57373', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer' }}>Réessayer</button>
          </div>
        )}

        {/* ─── Résultats ─── */}
        {data && (
          <>
            {/* Boutons haut */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', margin: '24px 0 8px' }}>
              <AudioButton text={audioText} label="Écouter en audio" isLong={true} />
              <button onClick={handlePDF} disabled={downloadingPDF} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', opacity: downloadingPDF ? 0.7 : 1 }}>
                {downloadingPDF ? 'Export...' : 'Télécharger en PDF'}
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Nouvelle consultation
              </button>
            </div>

            <div ref={resultsRef} className="sq-fade">

              {/* ─── BLOC 1 — Identité ─── */}
              <Card style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1a237e 0%, #111a55 100%)', border: '1px solid rgba(249,168,37,0.3)', marginBottom: '4px' }}>
                <p style={{ color: '#f9a825', fontWeight: '800', fontSize: '2rem', marginBottom: '6px' }}>{firstName}</p>
                <ArabicLine text={`${firstNameAr} ${connector} ${motherNameAr}`} size="1.8rem" />
                <p style={{ color: 'white', marginTop: '8px', fontSize: '0.95rem' }}>PM : {pm}</p>
              </Card>

              <Separator />

              {/* ─── BLOC 2 — Secrets Cachés ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Les Secrets de ton Prénom</BlocTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Card>
                    <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Secret de {firstName}</p>
                    <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.7 }}>{data.hiddenMeaning.nameSecret}</p>
                  </Card>
                  <Card>
                    <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Influence de ta mère</p>
                    <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.7 }}>{data.hiddenMeaning.motherSecret}</p>
                  </Card>
                  <Card>
                    <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Puissance combinée</p>
                    <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.7 }}>{data.hiddenMeaning.combinedPower}</p>
                  </Card>
                  <Card style={{ textAlign: 'center' }}>
                    <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Le nombre secret</p>
                    <div style={{ fontSize: '3rem', color: '#f9a825', fontWeight: '800', lineHeight: 1, marginBottom: '10px' }}>{data.secretNumber.value}</div>
                    <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '8px' }}>{data.secretNumber.hidden}</p>
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', lineHeight: 1.7, fontStyle: 'italic' }}>{data.secretNumber.power}</p>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* ─── BLOC 3 — 2 Noms Divins ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Tes 2 Noms Divins</BlocTitle>
                <div className="sq-duo" style={{ marginBottom: '14px' }}>
                  {[data.divineNames.name1, data.divineNames.name2].map((dn, i) => (
                    <Card key={i} style={{ textAlign: 'center' }}>
                      <ArabicLine text={dn.withYa} size="2.2rem" />
                      <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginTop: '4px', fontStyle: 'italic' }}>{dn.transliteration}</p>
                      <p style={{ color: 'white', fontSize: '0.88rem', marginTop: '4px' }}>{dn.meaning}</p>
                    </Card>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <ArabicLine text={data.divineNames.combined} size="1.8rem" />
                  <p style={{ color: '#b0b8d4', fontSize: '0.88rem', fontStyle: 'italic', marginTop: '6px', lineHeight: 1.6 }}>{data.divineNames.reason}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AudioButton text={data.divineNames.combined} label="Écouter les noms divins" />
                </div>
              </div>

              <Separator />

              {/* ─── BLOC 4 — Verset Coranique ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Verset Coranique</BlocTitle>
                <Card style={{ marginBottom: '10px' }}>
                  <ArabicLine text={data.verse.arabic} size="1.8rem" />
                  <p style={{ color: '#b0b8d4', fontSize: '0.82rem', textAlign: 'center', marginTop: '6px' }}>Sourate {data.verse.surah} — Verset {data.verse.ayah}</p>
                  <p style={{ color: 'white', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.7, marginTop: '10px' }}>{data.verse.meaning}</p>
                  <p style={{ color: '#b0b8d4', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '8px' }}>{data.verse.reason}</p>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <AudioButton text={data.verse.arabic} label="Écouter le verset" />
                  </div>
                </Card>
                <Card bg="rgba(10,14,46,0.9)" border="rgba(249,168,37,0.25)">
                  <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Comment écrire sur la tablette</p>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7 }}>{data.verse.writingInstructions}</p>
                </Card>
              </div>

              <Separator />

              {/* ─── BLOC 5 — Invocation ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Invocation Personnalisée</BlocTitle>
                <p style={{ color: '#b0b8d4', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Version pour écrire (sans harakat)</p>
                <Card style={{ marginBottom: '10px' }}>
                  <ArabicLine text={data.invocation.arabicNoHarakat} size="1.5rem" />
                </Card>
                <Separator />
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '12px' }}>{data.invocation.meaning}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '5px 14px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    À réciter {data.invocation.repetitions} fois
                  </span>
                  <AudioButton text={data.invocation.arabicWithHarakat} label="Écouter l'invocation" />
                </div>
              </div>

              <Separator />

              {/* ─── BLOC 6 — Carré Magique ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Carré Magique {data.talisman.squareType}</BlocTitle>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>{data.talisman.choiceReason}</p>
                {squareCells && (
                  <div style={{ marginBottom: '14px' }}>
                    <SquareGrid cells={squareCells} size={squareSize} />
                    <div style={{ textAlign: 'center', marginTop: '8px' }}>
                      <span style={{ background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>
                        Somme = {pm}
                      </span>
                    </div>
                  </div>
                )}
                <Card style={{ marginBottom: '14px' }}>
                  <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Instructions d'écriture</p>
                  {data.talisman.writingOrder.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ minWidth: '28px', height: '28px', background: '#f9a825', color: '#1a237e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.82rem', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6, paddingTop: '4px' }}>{step}</p>
                    </div>
                  ))}
                </Card>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '5px 16px', borderRadius: '20px', fontSize: '0.85rem' }}>
                    Durée du rituel : {data.talisman.ritualDuration}
                  </span>
                </div>
              </div>

              <Separator />

              {/* ─── BLOC 7 — Zikr ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Zikr Quotidien</BlocTitle>
                <p style={{ color: '#f9a825', textAlign: 'center', fontWeight: '600', marginBottom: '4px' }}>Meilleur moment : {data.zikr.bestTime}</p>
                <p style={{ color: '#b0b8d4', textAlign: 'center', fontSize: '0.85rem', marginBottom: '16px' }}>Durée : {data.zikr.duration}</p>
                {data.zikr.steps.map((step) => (
                  <Card key={step.order} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.9rem' }}>{step.order}. {step.title}</span>
                      <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{step.repetitions}×</span>
                    </div>
                    <ArabicLine text={step.arabic} size="1.4rem" />
                    {step.note && <p style={{ color: '#b0b8d4', fontSize: '0.82rem', fontStyle: 'italic', marginTop: '8px' }}>{step.note}</p>}
                  </Card>
                ))}
                <Card bg="rgba(249,168,37,0.07)" border="rgba(249,168,37,0.3)" style={{ marginTop: '4px' }}>
                  <p style={{ color: '#f9a825', fontSize: '0.88rem', lineHeight: 1.7 }}>
                    Commencer par Bismillah. Terminer par Al-Hamdulillah. Faire ce zikr sans interruption pendant {data.talisman.ritualDuration}.
                  </p>
                </Card>
              </div>

              <Separator />

              {/* ─── BLOC 8 — Plante ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ta Plante pour ce Rituel</BlocTitle>
                <Card bg="#0d2b1a" border="rgba(249,168,37,0.3)">
                  <p style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', marginBottom: '2px' }}>{data.plant.nomFrancais}</p>
                  <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '2px' }}>{data.plant.nomBambara}</p>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.78rem', marginBottom: '10px' }}>{data.plant.nomScientifique}</p>
                  <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>Partie : <span style={{ color: 'white' }}>{data.plant.partie}</span></p>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '8px' }}>{data.plant.preparation}</p>
                  <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '12px' }}>{data.plant.reason}</p>
                  <button onClick={() => window.open(data.plant.lienWikipedia, '_blank', 'noopener,noreferrer')} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    En savoir plus sur cette plante
                  </button>
                </Card>
              </div>

              <Separator />

              {/* ─── BLOC 9 — Bain Rituel ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Préparation du Bain Rituel</BlocTitle>
                <Card bg="rgba(10,14,46,0.9)" border="rgba(249,168,37,0.3)">
                  <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: 1.8 }}>{data.talisman.bathInstructions}</p>
                </Card>
              </div>

              <Separator />

              {/* ─── BLOC 10 — Sacrifice ─── */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Sacrifice Recommandé</BlocTitle>
                {data.sacrifice.isRecommended ? (
                  <>
                    <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '14px' }}>{data.sacrifice.reason}</p>
                    <div style={{ marginBottom: '12px' }}>
                      {data.sacrifice.offerings.map((o, i) => (
                        <Card key={i} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.9rem' }}>{o.item}</span>
                            <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem' }}>{o.quantity}</span>
                          </div>
                          <p style={{ color: '#cdd2e8', fontSize: '0.85rem' }}>{o.meaning}</p>
                        </Card>
                      ))}
                    </div>
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '4px' }}>À donner à : <span style={{ color: 'white' }}>{data.sacrifice.recipient}</span></p>
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '12px' }}>Moment : <span style={{ color: 'white' }}>{data.sacrifice.timing}</span></p>
                    <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7 }}>{data.sacrifice.instructions}</p>
                  </>
                ) : (
                  <p style={{ color: '#b0b8d4', fontSize: '0.88rem' }}>Aucun sacrifice requis. {data.sacrifice.reason}</p>
                )}
              </div>

              <Separator />

              {/* ─── BLOC 11 — Avertissements ─── */}
              {data.warnings.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  {data.warnings.map((w, i) => (
                    <div key={i} style={{ border: '1px solid #ff9800', borderRadius: '6px', padding: '12px 16px', marginBottom: '8px' }}>
                      <span style={{ color: '#ff9800', fontWeight: '700' }}>⚠ </span>
                      <span style={{ color: 'white', fontSize: '0.9rem' }}>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {data.warnings.length > 0 && <Separator />}

              {/* ─── BLOC 12 — Conclusion ─── */}
              <Card bg="#1a237e" border="rgba(249,168,37,0.4)" style={{ textAlign: 'center', padding: '28px 24px', marginBottom: '4px' }}>
                <div style={{ color: '#f9a825', fontSize: '1.2rem', marginBottom: '12px' }}>✦</div>
                <p style={{ color: 'white', fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.8 }}>{data.conclusion}</p>
              </Card>

            </div>

            {/* Boutons bas */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
              <AudioButton text={audioText} label="Écouter en audio" isLong={true} />
              <button onClick={handlePDF} disabled={downloadingPDF} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Export en cours...' : 'Télécharger en PDF'}
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Nouvelle consultation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
