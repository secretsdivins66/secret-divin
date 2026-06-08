import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, GENDER_BONUS, toArabicIndic } from '../utils/mystique';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JoursData {
  dayProfile: { title: string; globalMessage: string; planetInfluence: string; planetArabic: string };
  character: { mainTrait: string; description: string; strengths: string[]; weaknesses: string[]; deepNature: string };
  numerology: { pmPersonal: number; pmDay: number; pmTotal: number; element: string; elementArabic: string; numberMeaning: string };
  divineName: { arabic: string; withYa: string; transliteration: string; meaning: string; repetitions: number; bestTime: string; reason: string };
  verse: { arabic: string; surah: string; ayah: string; meaning: string; reason: string };
  favorablePeriods: { dailyHours: { period: string; hours: string; activity: string }[]; favorableDays: string[]; unfavorableDays: string[]; explanation: string };
  talisman: { squareType: string; divineName: { arabic: string; withYa: string; meaning: string }; verseForTalisman: { arabic: string; surah: string; ayah: string }; writingInstructions: string; ritualDuration: string; bestDayToStart: string };
  invocation: { arabicWithHarakat: string; meaning: string; repetitions: number; when: string };
  plant: { nomFrancais: string; nomBambara: string; nomScientifique: string; lienWikipedia: string; partie: string; usage: string; reason: string };
  sacrifice: { isRecommended: boolean; reason: string; offerings: { item: string; quantity: string; meaning: string }[]; recipient: string; timing: string; instructions: string };
  dailyAdvice: string;
  conclusion: string;
}

// ─── Données des jours ───────────────────────────────────────────────────────

const JOURS_DATA: Record<string, {
  poids: number; planete: string; planeteArabe: string;
  couleur: string; couleurBordure: string; description: string;
}> = {
  'Lundi':    { poids: 2860, planete: 'Lune',    planeteArabe: 'القمر',   couleur: '#e8f5e9', couleurBordure: '#4caf50', description: 'Jour de la Lune — douceur, intuition et spiritualité' },
  'Mardi':    { poids: 2709, planete: 'Mars',    planeteArabe: 'المريخ',  couleur: '#ffebee', couleurBordure: '#e53935', description: 'Jour de Mars — courage, énergie et détermination' },
  'Mercredi': { poids: 2795, planete: 'Mercure', planeteArabe: 'عطارد',   couleur: '#fff8e1', couleurBordure: '#f9a825', description: 'Jour de Mercure — intelligence, communication et commerce' },
  'Jeudi':    { poids: 2856, planete: 'Jupiter', planeteArabe: 'المشتري', couleur: '#e8eaf6', couleurBordure: '#3f51b5', description: 'Jour de Jupiter — sagesse, richesse et chance' },
  'Vendredi': { poids: 2766, planete: 'Vénus',   planeteArabe: 'الزهرة',  couleur: '#fce4ec', couleurBordure: '#e91e63', description: 'Jour de Vénus — amour, beauté et harmonie' },
  'Samedi':   { poids: 2847, planete: 'Saturne', planeteArabe: 'زحل',    couleur: '#ede7f6', couleurBordure: '#673ab7', description: 'Jour de Saturne — discipline, patience et mystère' },
  'Dimanche': { poids: 2772, planete: 'Soleil',  planeteArabe: 'الشمس',  couleur: '#fff3e0', couleurBordure: '#ff9800', description: 'Jour du Soleil — lumière, leadership et gloire' },
};

const DAYS_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ─── Square generation ───────────────────────────────────────────────────────

const SQ_BASE_3 = [4, 9, 2, 3, 5, 7, 8, 1, 6];

const SQ_PARAMS3 = { subtract: 12, divisor: 3 };
const SQ_THRESHOLDS3: Record<number, number> = { 0: 99, 1: 7, 2: 4 };
const SQ_LAYOUT3 = [4, 9, 2, 3, 5, 7, 8, 1, 6];

function generateSquare3(PM: number): number[] {
  const { subtract, divisor } = SQ_PARAMS3;
  const remainder = (PM - subtract) % divisor;
  const threshold = SQ_THRESHOLDS3[remainder] ?? 99;
  const entry = Math.floor((PM - subtract) / divisor);
  return SQ_LAYOUT3.map((L, i) => {
    const val = entry + (L - 1);
    return (i + 1) >= threshold ? val + 1 : val;
  });
}

function getElementColor(element: string): string {
  const e = element.toLowerCase();
  if (e.includes('feu') || e.includes('nar')) return '#e53935';
  if (e.includes('terre') || e.includes('ard')) return '#795548';
  if (e.includes('air') || e.includes('hawa')) return '#64b5f6';
  return '#1565c0';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

// ─── API helpers ─────────────────────────────────────────────────────────────

async function translateName(name: string): Promise<string> {
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
  return (parsed.arabic as string) ?? '';
}

async function callJoursGemini(prompt: string): Promise<JoursData> {
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
  return JSON.parse(cleaned) as JoursData;
}

function buildPrompt(
  firstName: string, nameArabic: string,
  motherName: string, motherArabic: string,
  gender: string, selectedDay: string,
  pm: number, pmTotal: number,
): string {
  const jour = JOURS_DATA[selectedDay];
  const ibnBint = gender === 'homme' ? 'ابن' : 'ابنة';
  return `Tu es un maître de la mystique islamique ouest-africaine. Tu parles avec "tu" en français. Ton ton est profond et rassurant.

Prénom : ${firstName}
Prénom arabe : ${nameArabic}
Mère : ${motherName}
Mère arabe : ${motherArabic}
Sexe : ${gender} (${ibnBint})
PM personnel : ${pm}
Jour de naissance : ${selectedDay}
Planète du jour : ${jour.planete}
Planète arabe : ${jour.planeteArabe}
Poids du jour : ${jour.poids}
PM total (PM + poids jour) : ${pmTotal}

Retourne UNIQUEMENT du JSON valide :

{
  "dayProfile": {
    "title": "Titre évocateur pour ce jour et cette planète",
    "globalMessage": "3 phrases sur ce que signifie être né un ${selectedDay} selon la mystique islamique.",
    "planetInfluence": "2-3 phrases sur l'influence de ${jour.planete} sur la personnalité et le destin.",
    "planetArabic": "${jour.planeteArabe}"
  },
  "character": {
    "mainTrait": "trait dominant en 2-3 mots",
    "description": "3 phrases sur la personnalité des natifs du ${selectedDay}.",
    "strengths": ["force 1", "force 2", "force 3", "force 4"],
    "weaknesses": ["faiblesse 1", "faiblesse 2", "faiblesse 3"],
    "deepNature": "2 phrases sur la nature profonde de cette combinaison prénom + jour."
  },
  "numerology": {
    "pmPersonal": ${pm},
    "pmDay": ${jour.poids},
    "pmTotal": ${pmTotal},
    "element": "Feu ou Terre ou Air ou Eau",
    "elementArabic": "النار ou الأرض ou الهواء ou الماء",
    "numberMeaning": "2 phrases sur la signification du PM total ${pmTotal}."
  },
  "divineName": {
    "arabic": "nom SANS ال",
    "withYa": "يا + nom",
    "transliteration": "Ya ...",
    "meaning": "signification",
    "repetitions": 99,
    "bestTime": "Après quelle prière",
    "reason": "2 phrases sur pourquoi ce nom pour ce jour et ce PM."
  },
  "verse": {
    "arabic": "verset SANS harakat",
    "surah": "nom sourate en français",
    "ayah": "numéro",
    "meaning": "traduction française",
    "reason": "Pourquoi ce verset pour ce jour."
  },
  "favorablePeriods": {
    "dailyHours": [
      { "period": "Matin", "hours": "6h - 10h", "activity": "Ce qu'il faut faire pendant ces heures." },
      { "period": "Après-midi", "hours": "14h - 17h", "activity": "Ce qu'il faut faire pendant ces heures." }
    ],
    "favorableDays": ["Lundi", "Jeudi"],
    "unfavorableDays": ["Mardi"],
    "explanation": "2 phrases sur les périodes favorables pour ${firstName}."
  },
  "talisman": {
    "squareType": "3x3",
    "divineName": { "arabic": "nom SANS ال", "withYa": "يا + nom", "meaning": "signification" },
    "verseForTalisman": { "arabic": "verset SANS harakat", "surah": "sourate", "ayah": "numéro" },
    "writingInstructions": "Instructions pour écrire le talisman du ${selectedDay}.",
    "ritualDuration": "7 jours",
    "bestDayToStart": "${selectedDay} matin"
  },
  "invocation": {
    "arabicWithHarakat": "invocation AVEC harakat contenant يا nom divin ${nameArabic} ${ibnBint} ${motherArabic}",
    "meaning": "traduction française",
    "repetitions": 99,
    "when": "Quand réciter cette invocation"
  },
  "plant": {
    "nomFrancais": "nom français",
    "nomBambara": "nom bambara ou langue locale",
    "nomScientifique": "Nom Scientifique exact",
    "lienWikipedia": "https://fr.wikipedia.org/wiki/...",
    "partie": "feuilles/écorce/racines",
    "usage": "comment utiliser",
    "reason": "Pourquoi cette plante pour ce jour."
  },
  "sacrifice": {
    "isRecommended": true,
    "reason": "Pourquoi ce sacrifice.",
    "offerings": [
      { "item": "offrande 1", "quantity": "nombre", "meaning": "signification" },
      { "item": "offrande 2", "quantity": "nombre", "meaning": "signification" }
    ],
    "recipient": "À qui donner",
    "timing": "${selectedDay} matin",
    "instructions": "Instructions complètes du sacrifice."
  },
  "dailyAdvice": "3 phrases de conseil pratique pour tirer le meilleur parti de l'énergie du ${selectedDay}. Adressé directement à ${firstName}.",
  "conclusion": "Message final chaleureux adressé à ${firstName}. 3 phrases encourageantes. Termine par BarakAllahu fik."
}

RÈGLES NOMS DIVINS : Sans ال dans arabic, avec يا dans withYa.
RÈGLES PLANTE : Plantes africaines réelles, nom scientifique exact, lien Wikipedia valide.`;
}

// ─── UI Components ───────────────────────────────────────────────────────────

function Separator() {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(249,168,37,0.45)', margin: '18px 0', letterSpacing: '4px', fontSize: '0.88rem' }}>
      ——— ✦ ———
    </div>
  );
}

function BlocTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: '#f9a825', fontSize: '1rem', fontWeight: '700', marginBottom: '14px' }}>{children}</h2>;
}

function Card({ children, bg = '#111a55', border = 'rgba(249,168,37,0.15)', style }: {
  children: React.ReactNode; bg?: string; border?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '16px 20px', ...style }}>
      {children}
    </div>
  );
}

function ArabicLine({ text, size = '1.6rem', color = '#f9a825' }: { text: string; size?: string; color?: string }) {
  return (
    <div style={{ fontFamily: "'Noto Naskh Arabic', serif", direction: 'rtl', textAlign: 'right', fontSize: size, color, lineHeight: '1.9' }}>
      {text}
    </div>
  );
}

function SquareGrid({ cells, size, arabic = false }: { cells: number[]; size: number; arabic?: boolean }) {
  const px = 64;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, ${px}px)`, gap: '2px', width: 'fit-content', margin: '0 auto' }}>
      {cells.map((v, i) => (
        <div key={i} style={{ width: px, height: px, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '2px solid #f9a825', color: '#1a237e', fontWeight: '700', fontSize: arabic ? '0.85rem' : '0.95rem', borderRadius: '2px', fontFamily: arabic ? "'Noto Naskh Arabic', serif" : undefined }}>
          {arabic ? toArabicIndic(v) : v}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 20px' }}>
      <div style={{ width: '44px', height: '44px', border: '3px solid rgba(249,168,37,0.2)', borderTopColor: '#f9a825', borderRadius: '50%', animation: 'jours-spin 0.8s linear infinite' }} />
      <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.95rem' }}>Révélation des secrets de ton jour...</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function JoursPage() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<JoursData | null>(null);
  const [firstNameAr, setFirstNameAr] = useState('');
  const [motherNameAr, setMotherNameAr] = useState('');
  const [pm, setPm] = useState(0);
  const [pmTotal, setPmTotal] = useState(0);
  const [frenchCells, setFrenchCells] = useState<number[] | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const COST = 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDay || !firstName.trim() || !motherName.trim()) return;
    setError('');

    const cacheKey = `jours_${selectedDay}_${firstName.trim()}_${motherName.trim()}_${gender}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const p = JSON.parse(cached) as { data: JoursData; fnAr: string; mnAr: string; pm: number; pmTotal: number; cells: number[] };
      setData(p.data); setFirstNameAr(p.fnAr); setMotherNameAr(p.mnAr); setPm(p.pm); setPmTotal(p.pmTotal); setFrenchCells(p.cells);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Vous devez être connecté.'); return; }

    const { data: credits } = await supabase.from('user_credits').select('balance').eq('user_id', session.user.id).single();
    const creditBalance = (credits as { balance: number } | null)?.balance ?? 0;
    if (creditBalance < COST) { setBalance(creditBalance); setShowCreditModal(true); return; }

    setLoading(true);
    try {
      const [fnAr, mnAr] = await Promise.all([
        translateName(firstName.trim()),
        translateName(motherName.trim()),
      ]);
      setFirstNameAr(fnAr);
      setMotherNameAr(mnAr);

      const nameWeight = calculateWeight(fnAr);
      const motherWeight = calculateWeight(mnAr);
      const pmVal = nameWeight + motherWeight + GENDER_BONUS[gender];
      const jourData = JOURS_DATA[selectedDay];
      const pmTotalVal = pmVal + jourData.poids;
      setPm(pmVal);
      setPmTotal(pmTotalVal);

      const prompt = buildPrompt(firstName.trim(), fnAr, motherName.trim(), mnAr, gender, selectedDay, pmVal, pmTotalVal);
      let result: JoursData;
      try { result = await callJoursGemini(prompt); }
      catch { result = await callJoursGemini(prompt); }

      const cells = generateSquare3(pmTotalVal);
      setFrenchCells(cells);

      await supabase.from('user_credits').update({ balance: creditBalance - COST, updated_at: new Date().toISOString() }).eq('user_id', session.user.id);
      await supabase.from('credit_transactions').insert({ user_id: session.user.id, type: 'use', amount: -COST, tool: 'jours', balance_after: creditBalance - COST, description: `Jours — ${firstName.trim()} — ${selectedDay}` });
      supabase.from('saved_rituals').insert({ user_id: session.user.id, title: `Jour ${selectedDay} — ${firstName.trim()}`, content: result, page_source: 'jours' }).then(() => {});

      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, fnAr, mnAr, pm: pmVal, pmTotal: pmTotalVal, cells }));
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
      pdf.save(`jours-${firstName.trim()}-${selectedDay}-secretdivin.pdf`);
    } catch { setError('Erreur PDF.'); }
    finally { setDownloadingPDF(false); }
  }

  function handleReset() {
    setSelectedDay(null); setData(null); setError(''); setFirstName(''); setMotherName('');
    setFirstNameAr(''); setMotherNameAr(''); setPm(0); setPmTotal(0); setFrenchCells(null);
  }

  const jourData = selectedDay ? JOURS_DATA[selectedDay] : null;
  const connector = gender === 'homme' ? 'بن' : 'بنت';
  const audioText = data ? [data.dayProfile.globalMessage, data.character.description, data.dailyAdvice, data.conclusion].join('. ') : '';

  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(10,14,46,0.8)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', color: 'white', padding: '10px 14px', fontSize: '0.95rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', paddingBottom: '48px' }}>
      <style>{`
        @keyframes jours-spin { to { transform: rotate(360deg); } }
        @keyframes jours-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .jours-fade { animation: jours-fade 0.4s ease both; }
        .jours-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .jours-trio { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .jours-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .jours-grids { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; justify-items: center; }
        @media (max-width: 700px) {
          .jours-days { grid-template-columns: repeat(2, 1fr); }
          .jours-trio { grid-template-columns: 1fr; }
          .jours-duo { grid-template-columns: 1fr; }
          .jours-grids { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ background: 'linear-gradient(180deg, #111a55 0%, #0a0e2e 100%)', borderBottom: '1px solid rgba(249,168,37,0.15)', padding: '44px 20px 36px', textAlign: 'center' }}>
        <h1 style={{ color: '#f9a825', fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>Jours de Naissance</h1>
        <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.7, marginBottom: '18px' }}>
          Découvre les secrets spirituels de ton jour de naissance<br />selon la tradition islamique africaine
        </p>
        <Separator />
        <div style={{ display: 'inline-block', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '5px 18px', borderRadius: '20px', fontSize: '0.82rem', marginTop: '4px' }}>
          2 crédits par génération
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>

        {showCreditModal && (
          <CreditModal toolName="jours" cost={COST} balance={balance} onClose={() => setShowCreditModal(false)} />
        )}

        {/* Sélecteur de jour */}
        {!data && (
          <div style={{ marginTop: '28px' }}>
            <p style={{ color: '#b0b8d4', fontSize: '0.88rem', textAlign: 'center', marginBottom: '16px' }}>
              Sélectionne ton jour de naissance
            </p>
            <div className="jours-days">
              {DAYS_ORDER.map(day => {
                const j = JOURS_DATA[day];
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      background: isSelected ? `${j.couleurBordure}18` : '#111a55',
                      border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? j.couleurBordure : 'rgba(249,168,37,0.15)'}`,
                      borderRadius: '8px',
                      padding: '12px 6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ color: isSelected ? '#f9a825' : 'white', fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px' }}>{day}</div>
                    {isSelected ? (
                      <div style={{ background: j.couleurBordure, color: 'white', borderRadius: '10px', fontSize: '0.7rem', padding: '1px 6px', display: 'inline-block' }}>{j.planete}</div>
                    ) : (
                      <div style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{j.planete}</div>
                    )}
                    <div style={{ color: '#f9a825', fontSize: '0.68rem', marginTop: '3px' }}>{j.poids}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulaire (visible seulement si jour sélectionné) */}
        {!data && !loading && selectedDay && jourData && (
          <form onSubmit={handleSubmit} style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '24px', marginTop: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '12px', background: 'rgba(249,168,37,0.08)', borderRadius: '6px' }}>
              <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '2px' }}>Jour sélectionné : {selectedDay}</p>
              <p style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Planète : {jourData.planete} — Poids du jour : {jourData.poids}</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Ton prénom (en français)</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex: Mamadou, Mariam..." required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Prénom de ta mère (en français)</label>
              <input value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Ex: Fatoumata..." required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={labelStyle}>Ton sexe</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['homme', 'femme'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', border: `1px solid ${gender === g ? '#f9a825' : 'rgba(249,168,37,0.25)'}`, background: gender === g ? 'rgba(249,168,37,0.12)' : 'transparent', color: gender === g ? '#f9a825' : '#b0b8d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    {g === 'homme' ? 'Homme' : 'Femme'}
                  </button>
                ))}
              </div>
            </div>
            {error && <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: '6px', padding: '10px', color: '#e57373', fontSize: '0.85rem', marginBottom: '14px' }}>{error}</div>}
            <button type="submit" disabled={!firstName.trim() || !motherName.trim()} style={{ width: '100%', background: 'linear-gradient(135deg, #f9a825, #e65100)', color: '#1a237e', fontWeight: '800', fontSize: '1rem', padding: '14px', border: 'none', borderRadius: '6px', cursor: !firstName.trim() || !motherName.trim() ? 'not-allowed' : 'pointer', opacity: !firstName.trim() || !motherName.trim() ? 0.6 : 1 }}>
              RÉVÉLER LES SECRETS DE MON JOUR
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
        {data && selectedDay && jourData && (
          <>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', margin: '24px 0 8px' }}>
              <AudioButton text={audioText} label="Écouter en audio" isLong={true} />
              <button onClick={handlePDF} disabled={downloadingPDF} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', opacity: downloadingPDF ? 0.7 : 1 }}>
                {downloadingPDF ? 'Export...' : 'Télécharger en PDF'}
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Changer de jour
              </button>
            </div>

            <div ref={resultsRef} className="jours-fade">

              {/* BLOC 1 — En-tête profil */}
              <Card style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1a237e 0%, #111a55 100%)', border: `1px solid ${jourData.couleurBordure}60`, borderTop: `3px solid ${jourData.couleurBordure}`, marginBottom: '4px', padding: '24px' }}>
                <p style={{ color: '#f9a825', fontWeight: '800', fontSize: '2rem', marginBottom: '4px' }}>{firstName}</p>
                {firstNameAr && motherNameAr && (
                  <ArabicLine text={`${firstNameAr} ${connector} ${motherNameAr}`} size="1.4rem" />
                )}
                <p style={{ color: 'white', fontSize: '0.95rem', marginTop: '4px', marginBottom: '8px' }}>Né(e) un {selectedDay}</p>
                <p style={{ color: jourData.couleurBordure, fontWeight: '700', fontSize: '1.4rem', marginBottom: '4px' }}>{jourData.planete}</p>
                <ArabicLine text={jourData.planeteArabe} size="1.8rem" color={jourData.couleurBordure} />
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { label: `PM personnel : ${pm}` },
                    { label: `Poids ${selectedDay} : ${jourData.poids}` },
                    { label: `PM total : ${pmTotal}` },
                  ].map((item, i) => (
                    <span key={i} style={{ color: '#b0b8d4', fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '20px' }}>{item.label}</span>
                  ))}
                </div>
              </Card>

              <Separator />

              {/* BLOC 2 — Profil du Jour */}
              <div style={{ marginBottom: '4px' }}>
                <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.4rem', marginBottom: '12px' }}>{data.dayProfile.title}</h2>
                <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: '14px' }}>{data.dayProfile.globalMessage}</p>
                <Separator />
                <p style={{ color: '#b0b8d4', fontSize: '0.9rem', lineHeight: 1.75 }}>{data.dayProfile.planetInfluence}</p>
              </div>

              <Separator />

              {/* BLOC 3 — Numérologie */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Numérologie de ton Jour</BlocTitle>
                <div className="jours-trio" style={{ marginBottom: '14px' }}>
                  {[
                    { label: 'PM Personnel', value: pm },
                    { label: `Poids ${selectedDay}`, value: jourData.poids },
                    { label: 'PM Total', value: pmTotal },
                  ].map((item, i) => (
                    <Card key={i} style={{ textAlign: 'center' }}>
                      <p style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{item.label}</p>
                      <div style={{ fontSize: '2.5rem', color: '#f9a825', fontWeight: '800', lineHeight: 1 }}>{item.value}</div>
                      {i === 2 && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{ background: `${getElementColor(data.numerology.element)}25`, border: `1px solid ${getElementColor(data.numerology.element)}70`, color: getElementColor(data.numerology.element), padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem' }}>
                            {data.numerology.element} — <span style={{ fontFamily: "'Noto Naskh Arabic',serif" }}>{data.numerology.elementArabic}</span>
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7 }}>{data.numerology.numberMeaning}</p>
              </div>

              <Separator />

              {/* BLOC 4 — Personnalité */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ta Personnalité — {data.character.mainTrait}</BlocTitle>
                <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.75, marginBottom: '10px' }}>{data.character.description}</p>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>{data.character.deepNature}</p>
                <div className="jours-duo">
                  <div>
                    <p style={{ color: '#4caf50', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Forces</p>
                    {data.character.strengths.map((s, i) => (
                      <div key={i} style={{ color: '#cdd2e8', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid rgba(76,175,80,0.12)' }}>
                        <span style={{ color: '#4caf50' }}>✓ </span>{s}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ color: '#ff9800', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Défis</p>
                    {data.character.weaknesses.map((w, i) => (
                      <div key={i} style={{ color: '#cdd2e8', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid rgba(255,152,0,0.12)' }}>
                        <span style={{ color: '#ff9800' }}>→ </span>{w}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* BLOC 5 — Nom Divin */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Nom Divin du {selectedDay}</BlocTitle>
                <Card bg="rgba(10,14,46,0.9)" border="rgba(249,168,37,0.35)" style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <ArabicLine text={data.divineName.withYa} size="2.5rem" />
                  <p style={{ color: '#b0b8d4', fontSize: '0.85rem', marginTop: '6px' }}>
                    {data.divineName.transliteration} — {data.divineName.meaning}
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '4px 14px', borderRadius: '4px', fontSize: '0.82rem' }}>
                      À réciter {data.divineName.repetitions} fois
                    </span>
                    <span style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Meilleur moment : {data.divineName.bestTime}</span>
                  </div>
                </Card>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '10px' }}>{data.divineName.reason}</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AudioButton text={data.divineName.withYa} label="Écouter le nom divin" />
                </div>
              </div>

              <Separator />

              {/* BLOC 6 — Verset Coranique */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Verset Coranique</BlocTitle>
                <Card style={{ marginBottom: '10px' }}>
                  <ArabicLine text={data.verse.arabic} size="1.8rem" />
                  <p style={{ color: '#b0b8d4', fontSize: '0.8rem', textAlign: 'center', marginTop: '6px' }}>Sourate {data.verse.surah} — Verset {data.verse.ayah}</p>
                  <p style={{ color: 'white', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.7, marginTop: '10px' }}>{data.verse.meaning}</p>
                  <p style={{ color: '#b0b8d4', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '8px' }}>{data.verse.reason}</p>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                    <AudioButton text={data.verse.arabic} label="Écouter le verset" />
                  </div>
                </Card>
              </div>

              <Separator />

              {/* BLOC 7 — Périodes Favorables */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Tes Périodes Favorables</BlocTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {data.favorablePeriods.dailyHours.map((h, i) => (
                    <Card key={i}>
                      <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.9rem', marginBottom: '6px' }}>{h.period} — {h.hours}</p>
                      <p style={{ color: 'white', fontSize: '0.88rem', lineHeight: 1.6 }}>{h.activity}</p>
                    </Card>
                  ))}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#4caf50', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '8px' }}>Jours favorables :</span>
                  {data.favorablePeriods.favorableDays.map(d => (
                    <span key={d} style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem', marginRight: '6px', display: 'inline-block' }}>{d}</span>
                  ))}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: '#e57373', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginRight: '8px' }}>Jours défavorables :</span>
                  {data.favorablePeriods.unfavorableDays.map(d => (
                    <span key={d} style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', color: '#e57373', padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem', marginRight: '6px', display: 'inline-block' }}>{d}</span>
                  ))}
                </div>
                <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.favorablePeriods.explanation}</p>
              </div>

              <Separator />

              {/* BLOC 8 — Talisman */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Talisman du {selectedDay}</BlocTitle>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <ArabicLine text={data.talisman.divineName.withYa} size="1.8rem" />
                  <p style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{data.talisman.divineName.meaning}</p>
                  <div style={{ marginTop: '10px' }}>
                    <ArabicLine text={data.talisman.verseForTalisman.arabic} size="1.3rem" />
                    <p style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>Sourate {data.talisman.verseForTalisman.surah} — v.{data.talisman.verseForTalisman.ayah}</p>
                  </div>
                </div>
                {frenchCells && (
                  <div style={{ marginBottom: '16px' }}>
                    <div className="jours-grids">
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Disposition de base</p>
                        <SquareGrid cells={SQ_BASE_3} size={3} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Chiffres français</p>
                        <SquareGrid cells={frenchCells} size={3} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Chiffres arabes</p>
                        <SquareGrid cells={frenchCells} size={3} arabic />
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <span style={{ background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '3px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>
                        ✓ Somme = {pmTotal}
                      </span>
                    </div>
                  </div>
                )}
                <Card bg="rgba(10,14,46,0.9)" border="rgba(249,168,37,0.25)" style={{ marginBottom: '10px' }}>
                  <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instructions d'écriture</p>
                  <p style={{ color: 'white', fontSize: '0.88rem', lineHeight: 1.7 }}>{data.talisman.writingInstructions}</p>
                </Card>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-block' }}>
                    Commencer un {data.talisman.bestDayToStart}
                  </span>
                </div>
              </div>

              <Separator />

              {/* BLOC 9 — Invocation */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Ton Invocation du {selectedDay}</BlocTitle>
                <Card style={{ marginBottom: '10px' }}>
                  <ArabicLine text={data.invocation.arabicWithHarakat} size="1.5rem" />
                </Card>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '12px' }}>{data.invocation.meaning}</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '5px 14px', borderRadius: '4px', fontSize: '0.82rem' }}>
                    {data.invocation.repetitions} fois — {data.invocation.when}
                  </span>
                  <AudioButton text={data.invocation.arabicWithHarakat} label="Écouter l'invocation" />
                </div>
              </div>

              <Separator />

              {/* BLOC 10 — Plante */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Plante du {selectedDay}</BlocTitle>
                <Card bg="#0d2b1a" border="rgba(249,168,37,0.3)">
                  <p style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', marginBottom: '2px' }}>{data.plant.nomFrancais}</p>
                  <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '2px' }}>{data.plant.nomBambara}</p>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.78rem', marginBottom: '10px' }}>{data.plant.nomScientifique}</p>
                  <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>Partie : <span style={{ color: 'white' }}>{data.plant.partie}</span></p>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '8px' }}>{data.plant.usage}</p>
                  <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '12px' }}>{data.plant.reason}</p>
                  <button onClick={() => window.open(data.plant.lienWikipedia, '_blank', 'noopener,noreferrer')} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    En savoir plus sur cette plante
                  </button>
                </Card>
              </div>

              <Separator />

              {/* BLOC 11 — Sacrifice */}
              <div style={{ marginBottom: '4px' }}>
                <BlocTitle>Sacrifice du {selectedDay}</BlocTitle>
                {data.sacrifice.isRecommended ? (
                  <>
                    <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '14px' }}>{data.sacrifice.reason}</p>
                    {data.sacrifice.offerings.map((o, i) => (
                      <Card key={i} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ color: '#f9a825', fontWeight: '600' }}>{o.item}</span>
                          <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', padding: '2px 8px', borderRadius: '20px', fontSize: '0.78rem' }}>{o.quantity}</span>
                        </div>
                        <p style={{ color: '#cdd2e8', fontSize: '0.85rem' }}>{o.meaning}</p>
                      </Card>
                    ))}
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', margin: '8px 0 4px' }}>À donner à : <span style={{ color: 'white' }}>{data.sacrifice.recipient}</span></p>
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '10px' }}>Moment : <span style={{ color: 'white' }}>{data.sacrifice.timing}</span></p>
                    <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.7 }}>{data.sacrifice.instructions}</p>
                  </>
                ) : (
                  <p style={{ color: '#b0b8d4' }}>Aucun sacrifice requis. {data.sacrifice.reason}</p>
                )}
              </div>

              <Separator />

              {/* BLOC 12 — Conseils du Jour */}
              <div style={{ marginBottom: '4px' }}>
                <Card border="rgba(249,168,37,0.35)">
                  <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Conseils pour ton {selectedDay}</p>
                  <p style={{ color: 'white', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.8 }}>{data.dailyAdvice}</p>
                </Card>
              </div>

              <Separator />

              {/* BLOC 13 — Conclusion */}
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
                Changer de jour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
