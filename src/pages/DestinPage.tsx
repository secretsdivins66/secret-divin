import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, calculatePM, toArabicIndic } from '../utils/mystique';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DivName { arabic: string; withYa: string; transliteration: string; meaning: string }
interface DestinData {
  pm: { value: number; element: string; elementArabic: string; elementColor: string; explanation: string };
  dominantStar: { number: number; name: string; nameArabic: string; planet: string; planetArabic: string; description: string };
  divineName: DivName & { repetitions: number; reason: string };
  verse: { arabic: string; surah: string; ayah: string; meaning: string; reason: string };
  totem: { animal: string; animalArabic: string; qualities: string[]; description: string };
  character: { mainTrait: string; description: string; strengths: string[]; weaknesses: string[] };
  destiny: { lifePath: string; mission: string; period1: { age: string; description: string }; period2: { age: string; description: string }; period3: { age: string; description: string } };
  favorableDays: { days: string[]; hours: string; explanation: string };
  favorableColors: { colors: { name: string; hex: string; meaning: string }[]; advice: string };
  number: { value: number; meaning: string };
  perfume: { name: string; description: string; availability: string };
  plant: { nomFrancais: string; nomBambara: string; nomScientifique: string; lienWikipedia: string; partie: string; usage: string; reason: string };
  talisman: { squareType: string; divineName1: DivName; divineName2: DivName; verseForTalisman: { arabic: string; surah: string; ayah: string }; writingInstructions: string; ritualDuration: string };
  sacrifice: { isRecommended: boolean; reason: string; offerings: { item: string; quantity: string; meaning: string }[]; recipient: string; timing: string; instructions: string };
  protection: { mainDanger: string; protectionVerse: { arabic: string; meaning: string }; advice: string };
  loveLife: { profile: string; idealPartner: string; challenge: string };
  career: { domains: string[]; advice: string; talent: string };
  spiritualLevel: { level: string; description: string; nextStep: string };
  conclusion: string;
}

// ─── Square helpers (talisman) ──────────────────────────────────────────────

type TalismanSize = 3 | 4 | 5;

const T_PARAMS: Record<TalismanSize, { subtract: number; divisor: number }> = {
  3: { subtract: 12, divisor: 3 },
  4: { subtract: 30, divisor: 4 },
  5: { subtract: 60, divisor: 5 },
};

const T_LAYOUTS: Record<TalismanSize, number[]> = {
  3: [4,9,2, 3,5,7, 8,1,6],
  4: [8,11,14,1, 13,2,7,12, 3,16,9,6, 10,5,4,15],
  5: [18,10,22,14,1, 12,4,16,8,25, 6,23,15,2,19, 5,17,9,21,13, 24,11,3,20,7],
};

const T_THRESHOLDS: Record<TalismanSize, Record<number, number>> = {
  3: { 0:99, 1:7, 2:4 },
  4: { 0:99, 1:13, 2:9, 3:5 },
  5: { 0:99, 1:21, 2:16, 3:11, 4:6 },
};

function generateTalisman(PM: number, size: TalismanSize): number[] {
  const { subtract, divisor } = T_PARAMS[size];
  const layout = T_LAYOUTS[size];
  const remainder = (PM - subtract) % divisor;
  const threshold = T_THRESHOLDS[size][remainder] ?? 99;
  const entry = Math.floor((PM - subtract) / divisor);
  return layout.map((L, i) => {
    const val = entry + (L - 1);
    return (i + 1) >= threshold ? val + 1 : val;
  });
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 20px' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid rgba(249,168,37,0.2)', borderTopColor: '#f9a825', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#b0b8d4', fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px' }}>
        Révélation de ton destin en cours…<br />
        <span style={{ fontSize: '0.8rem', color: 'rgba(176,184,212,0.6)' }}>Connexion spirituelle en cours — analyse de vos données</span>
      </p>
    </div>
  );
}

function BlocCard({ title, icon, children, accent = 'rgba(249,168,37,0.15)', topBorder = false }: {
  title: string; icon: string; children: React.ReactNode; accent?: string; topBorder?: boolean;
}) {
  return (
    <div style={{ background: '#111a55', border: `1px solid ${accent}`, borderTop: topBorder ? `3px solid #f9a825` : undefined, borderRadius: '8px', padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ color: '#b0b8d4', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2.5px', margin: 0 }}>{title}</h3>
      </div>
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

function Tag({ children, color = '#f9a825' }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: `${color}20`, border: `1px solid ${color}60`, color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'inline-block' }}>
      {children}
    </span>
  );
}

function TalismanGrid({ cells, size }: { cells: number[]; size: number }) {
  const cellPx = size === 3 ? 64 : size === 4 ? 56 : 48;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, ${cellPx}px)`, gap: '2px', width: 'fit-content', margin: '0 auto' }}>
      {cells.map((val, i) => (
        <div key={i} style={{ width: cellPx, height: cellPx, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '2px solid #f9a825', color: '#1a237e', fontWeight: '700', fontSize: '0.95rem', borderRadius: '2px' }}>
          {val}
        </div>
      ))}
    </div>
  );
}

// ─── Gemini API ─────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function translateName(name: string): Promise<string> {
  const res = await fetch(GEMINI_FLASH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translitère ce prénom en arabe classique (sans voyelles supplémentaires, écriture standard). Réponds UNIQUEMENT avec le prénom en arabe, rien d'autre.\n\nPrénom: ${name}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 30 },
    }),
  });
  const j = await res.json();
  return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

async function callDestinGemini(prompt: string): Promise<DestinData> {
  const res = await fetch(GEMINI_25_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4000 },
    }),
  });
  if (!res.ok) throw new Error(`Erreur de connexion (${res.status})`);
  const j = await res.json();
  const raw = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as DestinData;
}

function buildPrompt(
  firstName: string, firstNameArabic: string,
  motherName: string, motherNameArabic: string,
  gender: string, religion: string, pm: number, element: string
): string {
  const genderAr = gender === 'homme' ? 'ذكر' : 'أنثى';
  const connector = gender === 'homme' ? 'بن' : 'بنت';
  return `Tu es un maître du ʿilm al-ḥurūf (science des lettres islamiques) et un érudit en mystique africaine. Génère une analyse de destin spirituelle complète et profonde.

IDENTITÉ SPIRITUELLE:
- Prénom: ${firstName} (${firstNameArabic})
- Mère: ${motherName} (${motherNameArabic})
- Identité arabe: ${firstNameArabic} ${connector} ${motherNameArabic}
- Genre: ${gender} (${genderAr})
- Religion: ${religion}
- Poids Mystique (PM): ${pm}
- Élément dominant: ${element}

RÈGLES ABSOLUES:
1. Les noms divins (أسماء الله الحسنى) doivent être SANS le préfixe ال dans le champ "arabic", mais AVEC "يا" dans le champ "withYa" (ex: arabic:"ودود", withYa:"يا ودود")
2. La plante doit être une plante africaine réelle avec nom scientifique exact et lien Wikipedia valide
3. Adapte le contenu à la religion: si islam → versets coraniques, sacrifices islamiques; si autre → sagesse africaine traditionnelle
4. Tous les textes de réponse doivent être en FRANÇAIS (sauf les champs arabes)
5. squareType: choisir '3x3' si PM < 100, '4x4' si 100 ≤ PM < 500, '5x5' si PM ≥ 500

Réponds UNIQUEMENT avec un JSON valide respectant exactement ce schéma:
{
  "pm": { "value": ${pm}, "element": "${element}", "elementArabic": "النار|الأرض|الهواء|الماء", "elementColor": "#hex", "explanation": "explication de 2-3 phrases sur la signification de ce PM et cet élément pour cette personne" },
  "dominantStar": { "number": 1-9, "name": "nom de l'étoile en français", "nameArabic": "اسم النجم", "planet": "planète associée", "planetArabic": "الكوكب", "description": "description de 2-3 phrases" },
  "divineName": { "arabic": "اسم بدون ال", "withYa": "يا اسم", "transliteration": "Al-Wadud", "meaning": "signification en français", "repetitions": 33, "reason": "pourquoi ce nom pour cette personne" },
  "verse": { "arabic": "الآية الكريمة", "surah": "nom de la sourate ou sagesse", "ayah": "numéro ou référence", "meaning": "traduction en français", "reason": "pourquoi ce verset pour cette personne" },
  "totem": { "animal": "nom en français", "animalArabic": "الحيوان", "qualities": ["qualité1", "qualité2", "qualité3"], "description": "description du totem et son lien avec la personne" },
  "character": { "mainTrait": "trait principal", "description": "analyse de personnalité en 3-4 phrases", "strengths": ["force1", "force2", "force3", "force4"], "weaknesses": ["faiblesse1", "faiblesse2", "faiblesse3"] },
  "destiny": { "lifePath": "chemin de vie principal en 2 phrases", "mission": "mission spirituelle en 1-2 phrases", "period1": { "age": "0-30 ans", "description": "description de la première période" }, "period2": { "age": "30-60 ans", "description": "description de la deuxième période" }, "period3": { "age": "60+ ans", "description": "description de la troisième période" } },
  "favorableDays": { "days": ["Lundi", "Jeudi"], "hours": "7h-9h et 18h-20h", "explanation": "explication spirituelle" },
  "favorableColors": { "colors": [{ "name": "Or", "hex": "#f9a825", "meaning": "signification" }, { "name": "Bleu", "hex": "#1565c0", "meaning": "signification" }], "advice": "conseil sur l'utilisation des couleurs" },
  "number": { "value": 7, "meaning": "signification du nombre mystique personnel" },
  "perfume": { "name": "nom du parfum", "description": "description et propriétés spirituelles", "availability": "où le trouver en Afrique de l'Ouest" },
  "plant": { "nomFrancais": "nom français", "nomBambara": "nom en bambara ou langue locale", "nomScientifique": "Nom Scientifique", "lienWikipedia": "https://fr.wikipedia.org/wiki/...", "partie": "feuilles/racines/écorce", "usage": "comment utiliser la plante", "reason": "pourquoi cette plante pour cette personne" },
  "talisman": { "squareType": "3x3|4x4|5x5", "divineName1": { "arabic": "اسم", "withYa": "يا اسم", "transliteration": "...", "meaning": "..." }, "divineName2": { "arabic": "اسم", "withYa": "يا اسم", "transliteration": "...", "meaning": "..." }, "verseForTalisman": { "arabic": "الآية", "surah": "nom", "ayah": "numéro" }, "writingInstructions": "instructions détaillées pour écrire le talisman", "ritualDuration": "durée et fréquence du rituel" },
  "sacrifice": { "isRecommended": true, "reason": "pourquoi le sacrifice est recommandé", "offerings": [{ "item": "objet", "quantity": "quantité", "meaning": "signification" }], "recipient": "à qui donner", "timing": "moment propice", "instructions": "instructions du rituel" },
  "protection": { "mainDanger": "principal danger spirituel identifié", "protectionVerse": { "arabic": "الآية أو الحكمة", "meaning": "traduction" }, "advice": "conseil de protection en 2-3 phrases" },
  "loveLife": { "profile": "profil sentimental en 2-3 phrases", "idealPartner": "description du partenaire idéal", "challenge": "principal défi amoureux" },
  "career": { "domains": ["domaine1", "domaine2", "domaine3"], "advice": "conseil de carrière en 2-3 phrases", "talent": "talent principal à développer" },
  "spiritualLevel": { "level": "Initié|Aspirant|Chercheur|Maître|Sage", "description": "description du niveau actuel", "nextStep": "prochaine étape sur le chemin spirituel" },
  "conclusion": "Message de clôture inspirant et personnel de 3-4 phrases, intégrant le nom ${firstName}, l'élément ${element} et la mission spirituelle"
}`;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DestinPage() {
  const [firstName, setFirstName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [religion, setReligion] = useState('islam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<DestinData | null>(null);
  const [firstNameAr, setFirstNameAr] = useState('');
  const [motherNameAr, setMotherNameAr] = useState('');
  const [pm, setPm] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const COST = 2;

  function getElement(pmVal: number) {
    const r = pmVal % 4;
    if (r === 1) return { name: 'Feu', arabic: 'النار', color: '#e53935' };
    if (r === 2) return { name: 'Terre', arabic: 'الأرض', color: '#795548' };
    if (r === 3) return { name: 'Air', arabic: 'الهواء', color: '#64b5f6' };
    return { name: 'Eau', arabic: 'الماء', color: '#1565c0' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !motherName.trim()) return;
    setError('');

    const cacheKey = `destin_${firstName.trim()}_${motherName.trim()}_${gender}_${religion}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { data: DestinData; firstNameAr: string; motherNameAr: string; pm: number };
      setData(parsed.data);
      setFirstNameAr(parsed.firstNameAr);
      setMotherNameAr(parsed.motherNameAr);
      setPm(parsed.pm);
      return;
    }

    // Check auth + credits
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Vous devez être connecté.'); return; }

    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
    const credits = (profile as { credits: number } | null)?.credits ?? 0;
    if (credits < COST) {
      setBalance(credits);
      setShowCreditModal(true);
      return;
    }

    setLoading(true);
    try {
      // Translitération parallèle
      const [fnAr, mnAr] = await Promise.all([
        translateName(firstName.trim()),
        translateName(motherName.trim()),
      ]);
      setFirstNameAr(fnAr);
      setMotherNameAr(mnAr);

      // PM côté client
      const pmVal = calculatePM(calculateWeight(fnAr), calculateWeight(mnAr), gender);
      setPm(pmVal);
      const el = getElement(pmVal);

      // Appel Gemini 2.5-flash
      const prompt = buildPrompt(firstName.trim(), fnAr, motherName.trim(), mnAr, gender, religion, pmVal, el.name);
      let result: DestinData;
      try {
        result = await callDestinGemini(prompt);
      } catch {
        // Retry once
        result = await callDestinGemini(prompt);
      }

      // Déduction crédits
      await supabase.from('profiles').update({ credits: credits - COST }).eq('id', session.user.id);
      await supabase.from('credit_transactions').insert({
        user_id: session.user.id, tool: 'destin', amount: -COST,
        description: `Analyse destin: ${firstName}`,
      });

      // Sauvegarde rituel (non-bloquant)
      supabase.from('saved_rituals').insert({
        user_id: session.user.id, tool: 'destin',
        title: `Destin de ${firstName}`,
        content: result,
      }).then(() => {});

      // Cache
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, firstNameAr: fnAr, motherNameAr: mnAr, pm: pmVal }));

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue. Réessayez.');
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
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let pos = 0;
      pdf.addImage(imgData, 'PNG', 0, pos, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        pos -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, pos, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`destin-${firstName.trim()}-secretdivin.pdf`);
    } catch {
      setError('Erreur lors de la génération PDF.');
    } finally {
      setDownloadingPDF(false);
    }
  }

  function handleReset() {
    setData(null);
    setError('');
    setFirstNameAr('');
    setMotherNameAr('');
    setPm(0);
  }

  const el = pm > 0 ? getElement(pm) : null;
  const connector = gender === 'homme' ? 'بن' : 'بنت';

  // Talisman square
  const talismanCells = data ? (() => {
    const sz: TalismanSize = data.talisman.squareType === '5x5' ? 5 : data.talisman.squareType === '4x4' ? 4 : 3;
    try { return { cells: generateTalisman(pm, sz), size: sz }; } catch { return null; }
  })() : null;

  // Audio text for full reading
  const audioText = data ? [
    data.pm.explanation,
    data.character.description,
    data.destiny.lifePath,
    data.destiny.mission,
    data.conclusion,
  ].join('. ') : '';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', padding: '0 0 40px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .destin-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .destin-trio { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .destin-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) {
          .destin-form-grid { grid-template-columns: 1fr; }
          .destin-trio { grid-template-columns: 1fr; }
          .destin-duo { grid-template-columns: 1fr; }
        }
        .result-bloc { animation: fadeIn 0.4s ease both; }
      `}</style>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #111a55 0%, #0a0e2e 100%)', borderBottom: '1px solid rgba(249,168,37,0.15)', padding: '40px 20px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✦</div>
        <h1 style={{ color: '#f9a825', fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Destin Mystique</h1>
        <p style={{ color: '#b0b8d4', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 12px' }}>
          Découvrez votre destinée spirituelle en 17 points — une analyse mystique complète et profonde
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>2 crédits</span>
          <span style={{ background: 'rgba(176,184,212,0.1)', border: '1px solid rgba(176,184,212,0.2)', color: '#b0b8d4', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>Analyse mystique approfondie</span>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 16px' }}>

        {/* Credit modal */}
        {showCreditModal && (
          <CreditModal toolName="destin" cost={COST} balance={balance} onClose={() => setShowCreditModal(false)} />
        )}

        {/* Form */}
        {!data && !loading && (
          <form onSubmit={handleSubmit} style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '28px', marginTop: '24px' }}>
            <h2 style={{ color: '#f9a825', fontSize: '1rem', fontWeight: '700', marginBottom: '20px' }}>Vos informations spirituelles</h2>
            <div className="destin-form-grid" style={{ marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Votre prénom *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex: Mamadou" required style={{ width: '100%', background: 'rgba(10,14,46,0.8)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', color: 'white', padding: '10px 14px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Prénom de votre mère *</label>
                <input value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Ex: Fatoumata" required style={{ width: '100%', background: 'rgba(10,14,46,0.8)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', color: 'white', padding: '10px 14px', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div className="destin-form-grid" style={{ marginBottom: '24px' }}>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Genre</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['homme', 'femme'] as const).map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)} style={{ flex: 1, padding: '10px', border: `1px solid ${gender === g ? '#f9a825' : 'rgba(249,168,37,0.25)'}`, background: gender === g ? 'rgba(249,168,37,0.15)' : 'transparent', color: gender === g ? '#f9a825' : '#b0b8d4', borderRadius: '6px', cursor: 'pointer', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                      {g === 'homme' ? '♂ Homme' : '♀ Femme'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Religion / Tradition</label>
                <select value={religion} onChange={e => setReligion(e.target.value)} style={{ width: '100%', background: 'rgba(10,14,46,0.8)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', color: 'white', padding: '10px 14px', fontSize: '0.95rem', boxSizing: 'border-box' }}>
                  <option value="islam">Islam</option>
                  <option value="autre">Tradition africaine</option>
                </select>
              </div>
            </div>
            {error && <p style={{ color: '#e53935', fontSize: '0.85rem', marginBottom: '16px', padding: '10px', background: 'rgba(229,57,53,0.1)', borderRadius: '6px' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', background: 'linear-gradient(135deg, #f9a825, #e65100)', color: '#1a237e', fontWeight: '800', fontSize: '1rem', padding: '14px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              ✦ Révéler mon Destin — 2 crédits
            </button>
          </form>
        )}

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error standalone */}
        {!loading && error && !data && (
          <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)', borderRadius: '8px', padding: '20px', marginTop: '24px', color: '#e53935', textAlign: 'center' }}>
            <p style={{ marginBottom: '12px' }}>{error}</p>
            <button onClick={() => setError('')} style={{ background: 'transparent', border: '1px solid #e53935', color: '#e53935', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer' }}>Réessayer</button>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '20px 0 4px', justifyContent: 'center' }}>
              <AudioButton text={audioText} label="▶ Lecture vocale" isLong={true} />
              <button onClick={handlePDF} disabled={downloadingPDF} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '8px 20px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', opacity: downloadingPDF ? 0.7 : 1 }}>
                {downloadingPDF ? 'Export…' : '⬇ Télécharger PDF'}
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                ↺ Nouvelle consultation
              </button>
            </div>

            <div ref={resultsRef} style={{ paddingTop: '8px' }}>

              {/* BLOC 1 – Identité */}
              <div className="result-bloc" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #111a55 100%)', border: '1px solid rgba(249,168,37,0.3)', borderTop: '3px solid #f9a825', borderRadius: '8px', padding: '24px', marginBottom: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#b0b8d4', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>✦ Identité Spirituelle ✦</div>
                <ArabicLine text={`${firstNameAr} ${connector} ${motherNameAr}`} size="2rem" />
                <p style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', margin: '8px 0 4px' }}>{firstName} {gender === 'homme' ? 'ibn' : 'bint'} {motherName}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Tag>{gender === 'homme' ? '♂ Homme' : '♀ Femme'}</Tag>
                  <Tag color={el?.color}>{el?.name}</Tag>
                  <Tag color="#b0b8d4">PM: {toArabicIndic(pm)} ({pm})</Tag>
                  <Tag color="#64b5f6">{religion === 'islam' ? 'Islam' : 'Tradition africaine'}</Tag>
                </div>
              </div>

              {/* BLOC 2 – PM + Élément */}
              <div className="result-bloc destin-duo" style={{ marginBottom: '12px' }}>
                <BlocCard title="Poids Mystique" icon="⚖" accent="rgba(249,168,37,0.2)" topBorder>
                  <div style={{ fontSize: '3rem', color: '#f9a825', fontWeight: '800', textAlign: 'center', margin: '8px 0' }}>{pm}</div>
                  <div style={{ textAlign: 'center', color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '8px' }}>{toArabicIndic(pm)}</div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.pm.explanation}</p>
                </BlocCard>
                <BlocCard title="Élément Dominant" icon="🜁" accent={`${el?.color}40`}>
                  <div style={{ textAlign: 'center', margin: '8px 0' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: el?.color, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                      {data.pm.element === 'Feu' ? '🔥' : data.pm.element === 'Terre' ? '🌍' : data.pm.element === 'Air' ? '💨' : '💧'}
                    </div>
                    <div style={{ color: el?.color, fontWeight: '700', fontSize: '1.1rem' }}>{data.pm.element}</div>
                    <ArabicLine text={data.pm.elementArabic} size="1.2rem" color={el?.color} />
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 3 – Étoile */}
              <div className="result-bloc">
                <BlocCard title="Étoile Dominante" icon="★" accent="rgba(100,181,246,0.2)">
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '2.5rem', color: '#64b5f6', fontWeight: '800', lineHeight: 1 }}>{data.dominantStar.number}</div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>Nombre</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>{data.dominantStar.name}</div>
                      <ArabicLine text={data.dominantStar.nameArabic} size="1.1rem" />
                      <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginTop: '4px' }}>
                        <span style={{ color: '#64b5f6' }}>{data.dominantStar.planet}</span> — <span style={{ fontFamily: "'Noto Naskh Arabic',serif" }}>{data.dominantStar.planetArabic}</span>
                      </div>
                      <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6, marginTop: '8px' }}>{data.dominantStar.description}</p>
                    </div>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 4 – Nom Divin */}
              <div className="result-bloc">
                <BlocCard title="Nom Divin" icon="☪" accent="rgba(249,168,37,0.3)" topBorder>
                  <div style={{ background: 'rgba(10,14,46,0.5)', borderRadius: '6px', padding: '16px', marginBottom: '12px', textAlign: 'center' }}>
                    <ArabicLine text={data.divineName.withYa} size="2.2rem" />
                    <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginTop: '4px', fontStyle: 'italic' }}>{data.divineName.transliteration} — {data.divineName.meaning}</div>
                    <div style={{ marginTop: '12px' }}>
                      <AudioButton text={data.divineName.withYa} label="▶ Écouter (arabe)" />
                    </div>
                  </div>
                  <div className="destin-duo">
                    <div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Répétitions</div>
                      <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.4rem' }}>{data.divineName.repetitions}×</div>
                    </div>
                    <div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Pourquoi ce nom</div>
                      <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.5 }}>{data.divineName.reason}</p>
                    </div>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 5 – Verset */}
              <div className="result-bloc">
                <BlocCard title={religion === 'islam' ? 'Verset Coranique' : 'Sagesse Ancestrale'} icon="📖" accent="rgba(249,168,37,0.15)">
                  <div style={{ background: 'rgba(10,14,46,0.5)', borderRadius: '6px', padding: '16px', marginBottom: '12px' }}>
                    <ArabicLine text={data.verse.arabic} size="1.4rem" />
                    <div style={{ borderTop: '1px solid rgba(249,168,37,0.15)', marginTop: '10px', paddingTop: '10px' }}>
                      <p style={{ color: '#cdd2e8', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: 1.6 }}>{data.verse.meaning}</p>
                      <div style={{ color: '#b0b8d4', fontSize: '0.78rem', marginTop: '6px' }}>{data.verse.surah}{data.verse.ayah ? ` — v.${data.verse.ayah}` : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <AudioButton text={data.verse.arabic} label="▶ Écouter (arabe)" />
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', lineHeight: 1.5, flex: 1 }}>{data.verse.reason}</p>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 6 – Totem */}
              <div className="result-bloc">
                <BlocCard title="Animal Totem" icon="🐾" accent="rgba(121,85,72,0.3)">
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                      <ArabicLine text={data.totem.animalArabic} size="1.3rem" />
                      <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem' }}>{data.totem.animal}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {data.totem.qualities.map((q, i) => <Tag key={i} color="#795548">{q}</Tag>)}
                      </div>
                      <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.totem.description}</p>
                    </div>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 7 – Caractère */}
              <div className="result-bloc">
                <BlocCard title="Analyse de Caractère" icon="🧠" accent="rgba(100,181,246,0.15)">
                  <div style={{ background: 'rgba(10,14,46,0.4)', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '6px' }}>{data.character.mainTrait}</div>
                    <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.character.description}</p>
                  </div>
                  <div className="destin-duo">
                    <div>
                      <div style={{ color: '#4caf50', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>✓ Forces</div>
                      {data.character.strengths.map((s, i) => <div key={i} style={{ color: '#cdd2e8', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>• {s}</div>)}
                    </div>
                    <div>
                      <div style={{ color: '#e57373', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>⚠ Défis</div>
                      {data.character.weaknesses.map((w, i) => <div key={i} style={{ color: '#cdd2e8', fontSize: '0.85rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>• {w}</div>)}
                    </div>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 8 – Destin */}
              <div className="result-bloc">
                <BlocCard title="Chemin de Destin" icon="🗺" accent="rgba(249,168,37,0.15)" topBorder>
                  <p style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '8px' }}>{data.destiny.lifePath}</p>
                  <p style={{ color: '#b0b8d4', fontSize: '0.88rem', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '16px' }}>{data.destiny.mission}</p>
                  <div className="destin-trio">
                    {[data.destiny.period1, data.destiny.period2, data.destiny.period3].map((p, i) => (
                      <div key={i} style={{ background: 'rgba(10,14,46,0.5)', borderRadius: '6px', padding: '12px', borderLeft: '3px solid #f9a825' }}>
                        <div style={{ color: '#f9a825', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px' }}>{p.age}</div>
                        <p style={{ color: '#cdd2e8', fontSize: '0.82rem', lineHeight: 1.5 }}>{p.description}</p>
                      </div>
                    ))}
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 9 – Jours Fastes */}
              <div className="result-bloc">
                <BlocCard title="Jours & Heures Fastes" icon="📅" accent="rgba(100,181,246,0.15)">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {data.favorableDays.days.map((d, i) => <Tag key={i} color="#64b5f6">{d}</Tag>)}
                    <Tag color="#b0b8d4">🕐 {data.favorableDays.hours}</Tag>
                  </div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.favorableDays.explanation}</p>
                </BlocCard>
              </div>

              {/* BLOC 10 – Couleurs */}
              <div className="result-bloc">
                <BlocCard title="Couleurs Favorables" icon="🎨" accent="rgba(249,168,37,0.1)">
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {data.favorableColors.colors.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: c.hex, border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                        <div>
                          <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.9rem' }}>{c.name}</div>
                          <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>{c.meaning}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.6 }}>{data.favorableColors.advice}</p>
                </BlocCard>
              </div>

              {/* BLOC 11 – Nombre Mystique */}
              <div className="result-bloc">
                <BlocCard title="Nombre Mystique Personnel" icon="✧" accent="rgba(249,168,37,0.2)">
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '3.5rem', color: '#f9a825', fontWeight: '800', lineHeight: 1 }}>{data.number.value}</div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.75rem' }}>{toArabicIndic(data.number.value)}</div>
                    </div>
                    <p style={{ color: '#cdd2e8', fontSize: '0.9rem', lineHeight: 1.7, flex: 1 }}>{data.number.meaning}</p>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 12 – Parfum */}
              <div className="result-bloc">
                <BlocCard title="Parfum Spirituel" icon="🌸" accent="rgba(186,104,200,0.2)">
                  <div style={{ color: '#ce93d8', fontWeight: '700', fontSize: '1.1rem', marginBottom: '6px' }}>{data.perfume.name}</div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '8px' }}>{data.perfume.description}</p>
                  <div style={{ background: 'rgba(186,104,200,0.1)', border: '1px solid rgba(186,104,200,0.2)', borderRadius: '4px', padding: '8px 12px' }}>
                    <span style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>📍 Disponibilité: </span>
                    <span style={{ color: '#ce93d8', fontSize: '0.85rem' }}>{data.perfume.availability}</span>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 13 – Plante */}
              <div className="result-bloc">
                <BlocCard title="Plante Sacrée" icon="🌿" accent="rgba(76,175,80,0.25)">
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '160px' }}>
                      <div style={{ color: '#66bb6a', fontWeight: '700', fontSize: '1rem' }}>{data.plant.nomFrancais}</div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.82rem', fontStyle: 'italic' }}>{data.plant.nomBambara}</div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.78rem', fontStyle: 'italic', marginTop: '2px' }}>{data.plant.nomScientifique}</div>
                      <a href={data.plant.lienWikipedia} target="_blank" rel="noopener noreferrer" style={{ color: '#64b5f6', fontSize: '0.78rem', display: 'block', marginTop: '6px' }}>Voir sur Wikipedia →</a>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Partie utilisée</div>
                      <Tag color="#66bb6a">{data.plant.partie}</Tag>
                      <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '10px 0 4px' }}>Usage</div>
                      <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.5 }}>{data.plant.usage}</p>
                      <p style={{ color: '#b0b8d4', fontSize: '0.82rem', lineHeight: 1.5, marginTop: '6px', fontStyle: 'italic' }}>{data.plant.reason}</p>
                    </div>
                  </div>
                </BlocCard>
              </div>

              {/* BLOC 14 – Talisman */}
              <div className="result-bloc">
                <BlocCard title="Talisman Mystique" icon="◈" accent="rgba(249,168,37,0.3)" topBorder>
                  <div className="destin-duo" style={{ marginBottom: '16px' }}>
                    {[data.talisman.divineName1, data.talisman.divineName2].map((dn, i) => (
                      <div key={i} style={{ background: 'rgba(10,14,46,0.5)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ color: '#b0b8d4', fontSize: '0.7rem', marginBottom: '4px' }}>Nom divin {i + 1}</div>
                        <ArabicLine text={dn.withYa} size="1.5rem" />
                        <div style={{ color: '#b0b8d4', fontSize: '0.78rem', fontStyle: 'italic' }}>{dn.transliteration} — {dn.meaning}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Verset du talisman</div>
                    <ArabicLine text={data.talisman.verseForTalisman.arabic} size="1.2rem" />
                    <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>{data.talisman.verseForTalisman.surah} — v.{data.talisman.verseForTalisman.ayah}</div>
                  </div>
                  {talismanCells && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', textAlign: 'center' }}>
                        Carré {data.talisman.squareType} — PM {pm}
                      </div>
                      <TalismanGrid cells={talismanCells.cells} size={talismanCells.size} />
                    </div>
                  )}
                  <div style={{ background: 'rgba(249,168,37,0.08)', borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ color: '#f9a825', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Instructions d'écriture</div>
                    <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.6 }}>{data.talisman.writingInstructions}</p>
                  </div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>⏱ Durée: <span style={{ color: '#f9a825' }}>{data.talisman.ritualDuration}</span></div>
                </BlocCard>
              </div>

              {/* BLOC 15 – Sacrifice */}
              <div className="result-bloc">
                <BlocCard title="Sacrifice Recommandé" icon="🕊" accent="rgba(255,183,77,0.2)">
                  {data.sacrifice.isRecommended ? (
                    <>
                      <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '14px' }}>{data.sacrifice.reason}</p>
                      <div style={{ marginBottom: '12px' }}>
                        {data.sacrifice.offerings.map((o, i) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <Tag color="#ffb74d">{o.quantity}</Tag>
                            <span style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.9rem' }}>{o.item}</span>
                            <span style={{ color: '#b0b8d4', fontSize: '0.82rem', flex: 1 }}>{o.meaning}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div><span style={{ color: '#b0b8d4', fontSize: '0.75rem', display: 'block' }}>Bénéficiaire</span><span style={{ color: '#cdd2e8', fontSize: '0.85rem' }}>{data.sacrifice.recipient}</span></div>
                        <div><span style={{ color: '#b0b8d4', fontSize: '0.75rem', display: 'block' }}>Moment</span><span style={{ color: '#cdd2e8', fontSize: '0.85rem' }}>{data.sacrifice.timing}</span></div>
                      </div>
                      <p style={{ color: '#b0b8d4', fontSize: '0.82rem', lineHeight: 1.5, fontStyle: 'italic' }}>{data.sacrifice.instructions}</p>
                    </>
                  ) : (
                    <p style={{ color: '#b0b8d4', fontSize: '0.88rem' }}>Aucun sacrifice obligatoire pour ce profil. {data.sacrifice.reason}</p>
                  )}
                </BlocCard>
              </div>

              {/* BLOC 16 – Protection */}
              <div className="result-bloc">
                <BlocCard title="Protection Spirituelle" icon="🛡" accent="rgba(229,57,53,0.2)">
                  <div style={{ background: 'rgba(229,57,53,0.1)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px' }}>
                    <span style={{ color: '#ef9a9a', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Danger principal</span>
                    <div style={{ color: '#e57373', fontWeight: '600', fontSize: '0.95rem', marginTop: '4px' }}>{data.protection.mainDanger}</div>
                  </div>
                  <div style={{ background: 'rgba(10,14,46,0.5)', borderRadius: '6px', padding: '14px', marginBottom: '12px' }}>
                    <ArabicLine text={data.protection.protectionVerse.arabic} size="1.3rem" />
                    <p style={{ color: '#cdd2e8', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '8px' }}>{data.protection.protectionVerse.meaning}</p>
                  </div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.88rem', lineHeight: 1.6 }}>{data.protection.advice}</p>
                </BlocCard>
              </div>

              {/* BLOC 17 – Amour / Carrière / Niveau Spirituel */}
              <div className="destin-trio result-bloc" style={{ marginBottom: '12px' }}>
                <BlocCard title="Vie Amoureuse" icon="💕" accent="rgba(236,64,122,0.2)">
                  <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '8px' }}>{data.loveLife.profile}</p>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Partenaire idéal</div>
                  <p style={{ color: '#f48fb1', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '8px' }}>{data.loveLife.idealPartner}</p>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Défi</div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.82rem', lineHeight: 1.5 }}>{data.loveLife.challenge}</p>
                </BlocCard>
                <BlocCard title="Carrière & Talents" icon="💼" accent="rgba(76,175,80,0.2)">
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {data.career.domains.map((d, i) => <Tag key={i} color="#66bb6a">{d}</Tag>)}
                  </div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '8px' }}>{data.career.advice}</p>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Talent principal</div>
                  <p style={{ color: '#a5d6a7', fontSize: '0.85rem' }}>{data.career.talent}</p>
                </BlocCard>
                <BlocCard title="Niveau Spirituel" icon="🌟" accent="rgba(249,168,37,0.2)">
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ color: '#f9a825', fontWeight: '800', fontSize: '1.1rem' }}>{data.spiritualLevel.level}</div>
                  </div>
                  <p style={{ color: '#cdd2e8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '8px' }}>{data.spiritualLevel.description}</p>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>Prochaine étape</div>
                  <p style={{ color: '#ffe082', fontSize: '0.85rem', lineHeight: 1.5 }}>{data.spiritualLevel.nextStep}</p>
                </BlocCard>
              </div>

              {/* BLOC 18 – Conclusion */}
              <div className="result-bloc" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #0a0e2e 100%)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '8px', padding: '28px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✦</div>
                <div style={{ color: '#b0b8d4', fontSize: '0.7rem', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '14px' }}>Message Divin</div>
                <p style={{ color: '#f9a825', fontSize: '1.05rem', lineHeight: 1.8, fontStyle: 'italic', maxWidth: '600px', margin: '0 auto' }}>{data.conclusion}</p>
                <div style={{ marginTop: '20px' }}>
                  <ArabicLine text={data.divineName.withYa} size="1.4rem" />
                </div>
              </div>

            </div>

            {/* Bottom actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
              <AudioButton text={audioText} label="▶ Lecture vocale complète" isLong={true} />
              <button onClick={handlePDF} disabled={downloadingPDF} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Export en cours…' : '⬇ Télécharger PDF'}
              </button>
              <button onClick={handleReset} style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                ↺ Nouvelle consultation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
