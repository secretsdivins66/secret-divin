import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompatData {
  summary: { title: string; globalMessage: string; score: number };
  profiles: {
    person1: { elementDescription: string; strengths: string[]; weaknesses: string[] };
    person2: { elementDescription: string; strengths: string[]; weaknesses: string[] };
  };
  elementAnalysis: { interaction: string; strengths: string[]; tensions: string[]; advice: string };
  weightsAnalysis: { difference: number; balance: string; description: string; impact: string };
  relationshipAnalysis: { strengths: string[]; challenges: string[]; keyDynamic: string };
  advices: { title: string; content: string }[];
  spiritualProtection: {
    divineName: { arabic: string; withYa: string; transliteration: string; meaning: string; reason: string };
    verse: { arabic: string; surah: string; ayah: string; meaning: string };
    invocation: { arabic: string; meaning: string; repetitions: number; when: string };
    ritual: string;
  };
  sacrifice: {
    isRecommended: boolean;
    reason: string;
    offerings: { item: string; quantity: string; meaning: string }[];
    recipient: string;
    timing: string;
    instructions: string;
  };
  conclusion: string;
}

interface ElementInfo { name: string; color: string }
interface CompatInfo  { score: number; niveau: string; description: string }

interface ResultState {
  data: CompatData;
  name1: string; mother1: string; gender1: 'homme' | 'femme';
  name2: string; mother2: string; gender2: 'homme' | 'femme';
  name1Arabic: string; mother1Arabic: string;
  name2Arabic: string; mother2Arabic: string;
  PM1: number; PM2: number;
  element1: ElementInfo; element2: ElementInfo;
  compat: CompatInfo;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25    = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const ABJAD: Record<string, number> = {
  'ا':1,'ب':2,'ج':3,'د':4,'ه':5,'ة':5,'و':6,'ز':7,'ح':8,'ط':9,
  'ي':10,'ك':20,'ل':30,'م':40,'ن':50,'ص':60,'ع':70,'ف':80,'ض':90,'ق':100,
  'ر':200,'س':300,'ت':400,'ث':500,'خ':600,'ذ':700,'ظ':800,'غ':900,'ش':1000,
};

const GENDER_BONUS = { homme: 52, femme: 452 };

const ELEMENTS: Record<number, ElementInfo> = {
  1: { name: 'Feu',   color: '#e53935' },
  2: { name: 'Terre', color: '#795548' },
  3: { name: 'Air',   color: '#64b5f6' },
  0: { name: 'Eau',   color: '#1565c0' },
};

const COMPAT_TABLE: Record<string, CompatInfo> = {
  'Feu-Feu':   { score: 85, niveau: 'Forte',      description: "Deux âmes de feu : passion, intensité et dynamisme. Relation explosive mais magnétique." },
  'Feu-Air':   { score: 90, niveau: 'Très forte',  description: "Le feu est alimenté par l'air. Relation harmonieuse, créative et pleine d'énergie." },
  'Feu-Terre': { score: 55, niveau: 'Moyenne',     description: "La terre peut étouffer le feu. Relation stable mais des tensions possibles." },
  'Feu-Eau':   { score: 45, niveau: 'Faible',      description: "L'eau éteint le feu. Relation difficile, oppositions fréquentes. Beaucoup d'efforts." },
  'Terre-Terre':{ score: 80, niveau: 'Forte',      description: "Deux âmes de terre : stabilité, fidélité et construction. Relation solide et durable." },
  'Terre-Air': { score: 60, niveau: 'Moyenne',     description: "L'air déstabilise la terre. Relation complémentaire mais ajustements constants." },
  'Terre-Eau': { score: 88, niveau: 'Très forte',  description: "L'eau nourrit la terre. Relation naturellement harmonieuse, féconde et épanouissante." },
  'Air-Air':   { score: 75, niveau: 'Forte',       description: "Deux âmes d'air : communication, liberté et intelligence. Relation légère mais profonde." },
  'Air-Eau':   { score: 65, niveau: 'Moyenne',     description: "L'air agite l'eau. Relation stimulante mais émotionnellement complexe." },
  'Eau-Eau':   { score: 82, niveau: 'Forte',       description: "Deux âmes d'eau : sensibilité, intuition et profondeur. Relation fusionnelle et spirituelle." },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateWeight(arabicText: string): number {
  let total = 0;
  for (const char of arabicText) {
    if (ABJAD[char] !== undefined) total += ABJAD[char];
  }
  return total;
}

function getCompatibilite(el1: string, el2: string): CompatInfo {
  return COMPAT_TABLE[`${el1}-${el2}`] || COMPAT_TABLE[`${el2}-${el1}`] || COMPAT_TABLE['Feu-Feu'];
}

function getScoreColor(score: number): string {
  if (score <= 40) return '#e53935';
  if (score <= 60) return '#ff9800';
  if (score <= 80) return '#1565c0';
  return '#4caf50';
}

function getNiveauColor(niveau: string): string {
  if (niveau === 'Très forte') return '#f9a825';
  if (niveau === 'Forte')      return '#4caf50';
  if (niveau === 'Moyenne')    return '#ff9800';
  return '#e53935';
}

function getBalanceColor(balance: string): string {
  if (balance.includes('Équilibré') && !balance.includes('Légèrement')) return '#4caf50';
  if (balance.includes('Légèrement')) return '#ff9800';
  return '#e53935';
}

async function translateName(name: string): Promise<string> {
  const res = await fetch(GEMINI_FLASH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translittère ce prénom en arabe SANS harakat. Retourne UNIQUEMENT du JSON : {"arabic":"النص"}\nPrénom : ${name}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
    }),
  });
  const d = await res.json();
  const raw = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}') as string;
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return (JSON.parse(clean) as { arabic: string }).arabic; }
  catch { return name; }
}

async function callMainGemini(prompt: string, retries = 1): Promise<CompatData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 3000 },
    }),
  });
  const d = await res.json();
  const raw = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean) as CompatData; }
  catch {
    if (retries > 0) return callMainGemini(prompt, retries - 1);
    throw new Error('Réponse invalide. Veuillez réessayer.');
  }
}

function buildPrompt(r: Omit<ResultState, 'data'>): string {
  return `Tu es un maître de la mystique islamique ouest-africaine et de la science des lettres. Tu parles avec 'tu' en français. Ton ton est chaleureux et personnel. Utilise les prénoms dans tes réponses.

Personne 1 :
Prénom : ${r.name1}
Prénom arabe : ${r.name1Arabic}
Mère : ${r.mother1}
Mère arabe : ${r.mother1Arabic}
Sexe : ${r.gender1}
PM : ${r.PM1}
Élément : ${r.element1.name}

Personne 2 :
Prénom : ${r.name2}
Prénom arabe : ${r.name2Arabic}
Mère : ${r.mother2}
Mère arabe : ${r.mother2Arabic}
Sexe : ${r.gender2}
PM : ${r.PM2}
Élément : ${r.element2.name}

Score élémentaire : ${r.compat.score}%
Niveau : ${r.compat.niveau}

Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "summary": {
    "title": "Titre évocateur 7 mots max",
    "globalMessage": "2-3 phrases résumant cette relation. Utilise les prénoms ${r.name1} et ${r.name2}.",
    "score": ${r.compat.score}
  },
  "profiles": {
    "person1": {
      "elementDescription": "3 phrases sur la personnalité de ${r.name1} selon son élément ${r.element1.name}. Utilise tu.",
      "strengths": ["Force 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse 1", "Faiblesse 2"]
    },
    "person2": {
      "elementDescription": "3 phrases sur la personnalité de ${r.name2} selon son élément ${r.element2.name}.",
      "strengths": ["Force 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse 1", "Faiblesse 2"]
    }
  },
  "elementAnalysis": {
    "interaction": "Comment interagissent ${r.element1.name} et ${r.element2.name} dans cette relation. 3-4 phrases.",
    "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
    "tensions": ["Tension 1", "Tension 2"],
    "advice": "2-3 phrases pour harmoniser ces deux éléments."
  },
  "weightsAnalysis": {
    "difference": ${Math.abs(r.PM1 - r.PM2)},
    "balance": "Équilibré / Légèrement déséquilibré / Très déséquilibré",
    "description": "3 phrases sur l'équilibre des poids entre ${r.name1} et ${r.name2}.",
    "impact": "2 phrases sur l'impact de cet équilibre sur la relation."
  },
  "relationshipAnalysis": {
    "strengths": ["Force 1", "Force 2", "Force 3", "Force 4"],
    "challenges": ["Défi 1", "Défi 2", "Défi 3"],
    "keyDynamic": "La dynamique principale en une phrase courte et percutante."
  },
  "advices": [
    {"title": "Conseil 1", "content": "2 phrases. Utilise ${r.name1} et ${r.name2}."},
    {"title": "Conseil 2", "content": "2 phrases."},
    {"title": "Conseil 3", "content": "2 phrases."}
  ],
  "spiritualProtection": {
    "divineName": {
      "arabic": "nom SANS ال",
      "withYa": "يا + nom",
      "transliteration": "Ya ...",
      "meaning": "signification",
      "reason": "Pourquoi ce nom pour cette relation."
    },
    "verse": {
      "arabic": "verset SANS harakat",
      "surah": "nom sourate français",
      "ayah": "numéro",
      "meaning": "traduction française"
    },
    "invocation": {
      "arabic": "invocation SANS harakat",
      "meaning": "traduction française",
      "repetitions": 7,
      "when": "Quand réciter ensemble"
    },
    "ritual": "2-3 phrases sur le rituel recommandé pour renforcer cette relation."
  },
  "sacrifice": {
    "isRecommended": true,
    "reason": "Pourquoi ce sacrifice pour cette relation.",
    "offerings": [
      {"item": "offrande 1", "quantity": "nombre", "meaning": "signification"},
      {"item": "offrande 2", "quantity": "nombre", "meaning": "signification"}
    ],
    "recipient": "À qui donner",
    "timing": "Quel jour et heure",
    "instructions": "Instructions complètes du sacrifice."
  },
  "conclusion": "Message final chaleureux adressé à ${r.name1} et ${r.name2} par leurs prénoms. 3 phrases encourageantes. Termine par InchaAllah."
}

RÈGLES noms divins : SANS ال. Avec يا. Correct : يا ودود — Incorrect : يا الودود`;
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
    <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '22px', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span>✦</span><span>{children}</span>
    </div>
  );
}

function GreenItem({ text }: { text: string }) {
  return (
    <div style={{ background: 'rgba(76,175,80,0.07)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: '6px', padding: '10px 14px', marginBottom: '8px', fontSize: '0.9rem', color: '#e8eaf6' }}>
      <span style={{ color: '#4caf50', fontWeight: '700' }}>✓ </span>{text}
    </div>
  );
}

function OrangeItem({ text }: { text: string }) {
  return (
    <div style={{ background: 'rgba(255,152,0,0.07)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: '6px', padding: '10px 14px', marginBottom: '8px', fontSize: '0.9rem', color: '#e8eaf6' }}>
      <span style={{ color: '#ff9800', fontWeight: '700' }}>→ </span>{text}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function CompatibilitePage() {
  const [name1, setName1]   = useState('');
  const [mother1, setMother1] = useState('');
  const [gender1, setGender1] = useState<'homme' | 'femme'>('homme');
  const [name2, setName2]   = useState('');
  const [mother2, setMother2] = useState('');
  const [gender2, setGender2] = useState<'homme' | 'femme'>('homme');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [result, setResult]   = useState<ResultState | null>(null);
  const [balance, setBalance] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF]   = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const formValid = name1.trim() && mother1.trim() && name2.trim() && mother2.trim();

  const cacheKey = `compat_${name1.trim()}_${mother1.trim()}_${gender1}_${name2.trim()}_${mother2.trim()}_${gender2}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setResult(JSON.parse(cached) as ResultState); return; }

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Veuillez vous connecter.'); return; }

      const { data: creditData } = await supabase
        .from('user_credits').select('balance').eq('user_id', user.id).single();
      const bal = (creditData as { balance: number } | null)?.balance ?? 0;
      if (bal < 2) { setBalance(bal); setShowCreditModal(true); return; }

      // 4 parallel translations
      const [n1Ar, m1Ar, n2Ar, m2Ar] = await Promise.all([
        translateName(name1.trim()),
        translateName(mother1.trim()),
        translateName(name2.trim()),
        translateName(mother2.trim()),
      ]);

      // Client-side calculations
      const w1  = calculateWeight(n1Ar);
      const wm1 = calculateWeight(m1Ar);
      const PM1 = w1 + wm1 + GENDER_BONUS[gender1];

      const w2  = calculateWeight(n2Ar);
      const wm2 = calculateWeight(m2Ar);
      const PM2 = w2 + wm2 + GENDER_BONUS[gender2];

      const element1 = ELEMENTS[PM1 % 4];
      const element2 = ELEMENTS[PM2 % 4];
      const compat   = getCompatibilite(element1.name, element2.name);

      const partial: Omit<ResultState, 'data'> = {
        name1: name1.trim(), mother1: mother1.trim(), gender1,
        name2: name2.trim(), mother2: mother2.trim(), gender2,
        name1Arabic: n1Ar, mother1Arabic: m1Ar,
        name2Arabic: n2Ar, mother2Arabic: m2Ar,
        PM1, PM2, element1, element2, compat,
      };

      const data = await callMainGemini(buildPrompt(partial));
      data.summary.score = compat.score; // enforce client-side score

      await supabase.from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await supabase.from('credit_transactions').insert({
        user_id: user.id, type: 'use', amount: -2, tool: 'compatibilite',
        balance_after: bal - 2,
        description: `Compatibilité — ${name1.trim()} / ${name2.trim()}`,
      });
      await supabase.from('saved_rituals').insert({
        user_id: user.id,
        title: `Compatibilité ${name1.trim()} & ${name2.trim()}`,
        content: { ...partial, data },
        page_source: 'compatibilite',
      });

      const full: ResultState = { ...partial, data };
      sessionStorage.setItem(cacheKey, JSON.stringify(full));
      setResult(full);
    } catch (err) {
      setError((err as Error).message || 'Erreur de connexion. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!resultsRef.current || !result) return;
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
      pdf.save(`compatibilite-${result.name1}-${result.name2}-secretdivin.pdf`);
    } finally {
      setDownloadingPDF(false);
    }
  }

  function reset() {
    setResult(null);
    setError('');
  }

  // ── Radio helper ──
  function RadioGroup({ value, onChange, label }: { value: 'homme' | 'femme'; onChange: (v: 'homme' | 'femme') => void; label: string }) {
    return (
      <div style={{ marginBottom: '0' }}>
        <div style={{ color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {(['homme', 'femme'] as const).map(g => (
            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: value === g ? '#f9a825' : '#b0b8d4', fontWeight: value === g ? '700' : '400', fontSize: '0.9rem' }}>
              <input type="radio" name={label} value={g} checked={value === g} onChange={() => onChange(g)}
                style={{ accentColor: '#f9a825' }} />
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // ── Input helper ──
  function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
          style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 12px', borderRadius: '4px', fontSize: '0.92rem', boxSizing: 'border-box' }} />
      </div>
    );
  }

  // ── Score bar ──
  function ScoreBar({ score }: { score: number }) {
    const color = getScoreColor(score);
    return (
      <div style={{ margin: '0 auto 14px', maxWidth: '400px' }}>
        <div style={{ background: '#333', borderRadius: '12px', height: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '12px', transition: 'width 1s ease' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
            {score}%
          </div>
        </div>
      </div>
    );
  }

  // ── Person card ──
  function PersonCard({ name, nameArabic, motherArabic, gender, pm, element, profile }: {
    name: string; nameArabic: string; motherArabic: string;
    gender: 'homme' | 'femme'; pm: number; element: ElementInfo;
    profile: ResultState['data']['profiles']['person1'];
  }) {
    const connector = gender === 'homme' ? 'بن' : 'بنت';
    return (
      <div style={{ border: '2px solid rgba(249,168,37,0.3)', borderRadius: '8px', overflow: 'hidden', flex: '1', minWidth: '260px' }}>
        <div style={{ background: element.color, padding: '16px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '1.3rem' }}>{name}</div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>{element.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>PM : {pm}</div>
        </div>
        <div style={{ background: '#111a55', padding: '18px' }}>
          <div style={{ direction: 'rtl', textAlign: 'right', color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.5em', marginBottom: '14px', lineHeight: '1.8' }}>
            {nameArabic} {connector} {motherArabic}
          </div>
          <p style={{ color: '#e8eaf6', lineHeight: '1.75', marginBottom: '14px', fontSize: '0.92rem' }}>{profile.elementDescription}</p>
          <div style={{ marginBottom: '8px' }}>
            {profile.strengths.map((s, i) => (
              <div key={i} style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.88rem', marginBottom: '4px' }}>✓ {s}</div>
            ))}
          </div>
          <div>
            {profile.weaknesses.map((w, i) => (
              <div key={i} style={{ color: '#ff9800', fontSize: '0.88rem', marginBottom: '4px' }}>→ {w}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const globalAudioText = result
    ? `${result.data.summary.globalMessage} ${result.data.elementAnalysis.interaction} ${result.data.conclusion}`
    : '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>Compatibilité Spirituelle</h1>
          <p style={{ color: '#b0b8d4', fontStyle: 'italic', maxWidth: '420px', margin: '0 auto 16px', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Découvre la compatibilité mystique entre deux personnes selon la science islamique des lettres
          </p>
          <Sep />
          <span style={{ display: 'inline-block', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '6px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
            2 crédits par génération
          </span>
        </div>

        {/* ── Formulaire ── */}
        {!result && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {/* Carte Toi */}
              <Card style={{ flex: '1', minWidth: '280px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', textAlign: 'center', marginBottom: '18px' }}>Toi</div>
                <TextInput label="Ton prénom" value={name1} onChange={setName1} placeholder="Ton prénom" />
                <TextInput label="Prénom de ta mère" value={mother1} onChange={setMother1} placeholder="Prénom de ta mère" />
                <RadioGroup value={gender1} onChange={setGender1} label="Ton sexe" />
              </Card>

              {/* Carte Ta Cible */}
              <Card style={{ flex: '1', minWidth: '280px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', textAlign: 'center', marginBottom: '18px' }}>Ta Cible</div>
                <TextInput label="Prénom de la personne" value={name2} onChange={setName2} placeholder="Son prénom" />
                <TextInput label="Prénom de sa mère" value={mother2} onChange={setMother2} placeholder="Prénom de sa mère" />
                <RadioGroup value={gender2} onChange={setGender2} label="Son sexe" />
              </Card>
            </div>

            {error && (
              <div style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef9a9a', padding: '12px 16px', borderRadius: '4px', marginBottom: '14px', fontSize: '0.9rem' }}>
                {error}
                <button type="button" onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontWeight: '700' }}>✕</button>
              </div>
            )}

            <button type="submit" disabled={loading || !formValid}
              style={{ width: '100%', background: (loading || !formValid) ? '#333' : 'linear-gradient(135deg, #f9a825, #e65100)', color: (loading || !formValid) ? '#888' : '#0a0e2e', fontWeight: '700', fontSize: '0.95rem', padding: '15px', border: 'none', borderRadius: '4px', cursor: (loading || !formValid) ? 'not-allowed' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {loading ? 'Analyse en cours...' : 'Analyser la compatibilité — 2 crédits'}
            </button>
          </form>
        )}

        {/* Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '52px', height: '52px', border: '3px solid rgba(249,168,37,0.2)', borderTop: '3px solid #f9a825', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '1rem' }}>Analyse de la compatibilité en cours...</div>
          </div>
        )}

        {/* ── Résultats ── */}
        {result && !loading && (
          <div ref={resultsRef} style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* BLOC 1 — Résumé */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.8rem', marginBottom: '20px' }}>{result.data.summary.title}</h2>
              <ScoreBar score={result.data.summary.score} />
              <span style={{ display: 'inline-block', background: getNiveauColor(result.compat.niveau), color: '#0a0e2e', padding: '4px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '16px' }}>
                {result.compat.niveau}
              </span>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.8', maxWidth: '560px', margin: '0 auto' }}>{result.data.summary.globalMessage}</p>
            </div>

            <Sep />

            {/* BLOC 2 — Profils */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Vos Profils Mystiques</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <PersonCard name={result.name1} nameArabic={result.name1Arabic} motherArabic={result.mother1Arabic} gender={result.gender1} pm={result.PM1} element={result.element1} profile={result.data.profiles.person1} />
                <PersonCard name={result.name2} nameArabic={result.name2Arabic} motherArabic={result.mother2Arabic} gender={result.gender2} pm={result.PM2} element={result.element2} profile={result.data.profiles.person2} />
              </div>
            </div>

            <Sep />

            {/* BLOC 3 — Éléments */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Analyse des Éléments</SectionTitle>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ color: result.element1.color, fontWeight: '700', fontSize: '1.5rem', textAlign: 'center' }}>{result.element1.name}</div>
                <div style={{ color: 'rgba(249,168,37,0.5)', letterSpacing: '4px', fontSize: '0.85rem' }}>——— ✦ ———</div>
                <div style={{ color: result.element2.color, fontWeight: '700', fontSize: '1.5rem', textAlign: 'center' }}>{result.element2.name}</div>
              </div>
              <p style={{ color: '#e8eaf6', lineHeight: '1.75', marginBottom: '18px' }}>{result.data.elementAnalysis.interaction}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {result.data.elementAnalysis.strengths.map((s, i) => <GreenItem key={i} text={s} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginBottom: '18px' }}>
                {result.data.elementAnalysis.tensions.map((t, i) => <OrangeItem key={i} text={t} />)}
              </div>
              <div style={{ background: 'rgba(249,168,37,0.07)', border: '1px solid rgba(249,168,37,0.4)', borderRadius: '6px', padding: '16px' }}>
                <p style={{ color: '#e8eaf6', margin: 0, lineHeight: '1.7' }}>{result.data.elementAnalysis.advice}</p>
              </div>
            </Card>

            <Sep />

            {/* BLOC 4 — Poids */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Équilibre des Poids Mystiques</SectionTitle>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {[
                  { label: result.name1, val: result.PM1 },
                  { label: result.name2, val: result.PM2 },
                  { label: 'Différence', val: Math.abs(result.PM1 - result.PM2) },
                ].map(({ label, val }) => (
                  <div key={label} style={{ flex: '1', minWidth: '140px', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '6px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '4px' }}>{label}</div>
                    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.4rem' }}>PM {val}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ display: 'inline-block', background: getBalanceColor(result.data.weightsAnalysis.balance), color: '#0a0e2e', padding: '4px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  {result.data.weightsAnalysis.balance}
                </span>
              </div>
              <p style={{ color: '#e8eaf6', lineHeight: '1.75', marginBottom: '10px' }}>{result.data.weightsAnalysis.description}</p>
              <p style={{ color: '#f9a825', fontStyle: 'italic', lineHeight: '1.75', margin: 0 }}>{result.data.weightsAnalysis.impact}</p>
            </Card>

            <Sep />

            {/* BLOC 5 — Relation */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Analyse de la Relation</SectionTitle>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#f9a825', fontStyle: 'italic', fontSize: '1.2rem', margin: 0 }}>"{result.data.relationshipAnalysis.keyDynamic}"</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {result.data.relationshipAnalysis.strengths.map((s, i) => <GreenItem key={i} text={s} />)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {result.data.relationshipAnalysis.challenges.map((c, i) => <OrangeItem key={i} text={c} />)}
              </div>
            </Card>

            <Sep />

            {/* BLOC 6 — Conseils */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Conseils pour Réussir Votre Relation</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {result.data.advices.map((conseil, i) => (
                  <Card key={i} style={{ border: '1px solid rgba(249,168,37,0.4)' }}>
                    <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '8px' }}>{conseil.title}</div>
                    <p style={{ color: '#e8eaf6', margin: 0, lineHeight: '1.7' }}>{conseil.content}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Sep />

            {/* BLOC 7 — Protection Spirituelle */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Protection Spirituelle</SectionTitle>

              {/* Nom Divin */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '2.5em', direction: 'rtl', marginBottom: '8px', lineHeight: '1.6' }}>
                  {result.data.spiritualProtection.divineName.withYa}
                </div>
                <div style={{ color: '#b0b8d4', marginBottom: '10px' }}>
                  {result.data.spiritualProtection.divineName.transliteration} · {result.data.spiritualProtection.divineName.meaning}
                </div>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto' }}>
                  {result.data.spiritualProtection.divineName.reason}
                </p>
              </div>

              <Sep />

              {/* Verset */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.6em', direction: 'rtl', textAlign: 'right', marginBottom: '10px', lineHeight: '2' }}>
                  {result.data.spiritualProtection.verse.arabic}
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>
                  Sourate {result.data.spiritualProtection.verse.surah} — Verset {result.data.spiritualProtection.verse.ayah}
                </div>
                <p style={{ color: '#e8eaf6', fontStyle: 'italic', margin: '0 0 14px' }}>{result.data.spiritualProtection.verse.meaning}</p>
                <AudioButton text={result.data.spiritualProtection.verse.arabic} label="Écouter le verset" />
              </div>

              <Sep />

              {/* Invocation */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em', direction: 'rtl', textAlign: 'right', marginBottom: '10px', lineHeight: '2' }}>
                  {result.data.spiritualProtection.invocation.arabic}
                </div>
                <p style={{ color: '#e8eaf6', fontStyle: 'italic', marginBottom: '10px' }}>{result.data.spiritualProtection.invocation.meaning}</p>
                <span style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '4px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px' }}>
                  À réciter ensemble {result.data.spiritualProtection.invocation.repetitions} fois
                </span>
                <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '14px' }}>{result.data.spiritualProtection.invocation.when}</p>
                <AudioButton text={result.data.spiritualProtection.invocation.arabic} label="Écouter l'invocation" />
              </div>

              <div style={{ background: 'rgba(249,168,37,0.07)', border: '1px solid rgba(249,168,37,0.4)', borderRadius: '6px', padding: '16px' }}>
                <p style={{ color: '#e8eaf6', margin: 0, lineHeight: '1.7' }}>{result.data.spiritualProtection.ritual}</p>
              </div>
            </Card>

            <Sep />

            {/* BLOC 8 — Sacrifice */}
            {result.data.sacrifice.isRecommended && (
              <>
                <Card style={{ marginBottom: '8px' }}>
                  <SectionTitle>Sacrifice Recommandé</SectionTitle>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', marginBottom: '18px', lineHeight: '1.6' }}>{result.data.sacrifice.reason}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    {result.data.sacrifice.offerings.map((o, i) => (
                      <div key={i} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.1)', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '4px' }}>
                          {o.item} — <span style={{ color: '#e8eaf6', fontWeight: '400' }}>Quantité : {o.quantity}</span>
                        </div>
                        <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{o.meaning}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#e8eaf6', marginBottom: '6px' }}>
                    À donner à : <span style={{ color: '#f9a825', fontWeight: '700' }}>{result.data.sacrifice.recipient}</span>
                  </div>
                  <div style={{ color: '#e8eaf6', marginBottom: '16px' }}>
                    Moment : <span style={{ color: '#b0b8d4' }}>{result.data.sacrifice.timing}</span>
                  </div>
                  <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instructions</div>
                    <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{result.data.sacrifice.instructions}</p>
                  </div>
                </Card>
                <Sep />
              </>
            )}

            {/* BLOC 9 — Conclusion */}
            <div style={{ background: '#1a237e', border: '2px solid #f9a825', borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.9', fontSize: '1rem', margin: 0 }}>{result.data.conclusion}</p>
            </div>

            <Sep />

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <AudioButton text={globalAudioText} label="Écouter l'analyse" isLong={true} />
              <button onClick={handleDownloadPDF} disabled={downloadingPDF}
                style={{ background: downloadingPDF ? '#333' : '#f9a825', color: downloadingPDF ? '#888' : '#0a0e2e', fontWeight: '700', padding: '9px 22px', border: 'none', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Génération PDF...' : 'Télécharger en PDF'}
              </button>
              <button onClick={reset}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '9px 22px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Analyser une autre compatibilité
              </button>
            </div>

          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditModal toolName="la Compatibilité Spirituelle" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />
      )}
    </div>
  );
}
