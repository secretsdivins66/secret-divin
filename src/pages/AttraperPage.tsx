import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, toArabicIndic } from '../utils/mystique';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DivineName { arabic: string; withYa: string; transliteration: string; meaning: string }

interface TalismanData {
  divineNames: { name1: DivineName; name2: DivineName; combined: string; reason: string };
  verse: { arabic: string; surah: string; ayah: string; meaning: string; reason: string };
  invocation: { arabicNoHarakat: string; arabicWithHarakat: string; meaning: string; repetitions: number };
  talisman: { squareType: string; choiceReason: string; writingOrder: string[]; bathInstructions: string; ritualDuration: string; bestDayToStart: string };
  zikr: {
    steps: { order: number; title: string; arabic: string; arabicWithHarakat: string; repetitions: number; note: string | null }[];
    bestTime: string; duration: string; important: string;
  };
  plants: { nomFrancais: string; nomBambara: string; nomScientifique: string; lienWikipedia: string; partie: string; preparation: string }[];
  perfume: { name: string; description: string; availability: string; usage: string };
  sacrifice: { isRecommended: boolean; reason: string; offerings: { item: string; quantity: string; meaning: string }[]; recipient: string; timing: string; instructions: string };
  warnings: string[];
  conclusion: string;
}

interface AttraperResult {
  data: TalismanData;
  PMuser: number; PMtarget: number;
  invocationWeight: number;
  cells: number[]; squareSize: 3 | 4 | 5;
  userName: string; userMother: string; userGender: 'homme' | 'femme';
  targetName: string; targetMother: string; targetGender: 'homme' | 'femme';
  userNameArabic: string; userMotherArabic: string;
  targetNameArabic: string; targetMotherArabic: string;
  objectif: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25    = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
const GENDER_BONUS = { homme: 52, femme: 452 };

const OBJECTIFS = [
  'Mariage', 'Amour / Rapprochement', 'Travail / Emploi', 'Argent / Richesse',
  'Voyage', 'Crédit / Prêt', 'Assistance / Aide', 'Réconciliation', 'Protection', 'Autre',
];

// ─── Magic square data (sizes 3/4/5) ─────────────────────────────────────────

const SQ_PARAMS: Record<3|4|5, { subtract: number; divisor: number }> = {
  3: { subtract: 12, divisor: 3 },
  4: { subtract: 30, divisor: 4 },
  5: { subtract: 60, divisor: 5 },
};

const SQ_LAYOUTS: Record<3|4|5, number[]> = {
  3: [4,9,2, 3,5,7, 8,1,6],
  4: [8,11,14,1, 13,2,7,12, 3,16,9,6, 10,5,4,15],
  5: [18,10,22,14,1, 12,4,16,8,25, 6,23,15,2,19, 5,17,9,21,13, 24,11,3,20,7],
};

const SQ_THRESHOLDS: Record<3|4|5, Record<number, number>> = {
  3: { 0:99, 1:7,  2:4 },
  4: { 0:99, 1:13, 2:9,  3:5 },
  5: { 0:99, 1:21, 2:16, 3:11, 4:6 },
};

const SQ_CELL_SIZES: Record<3|4|5, number> = { 3: 64, 4: 56, 5: 48 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSquare(PM: number, size: 3 | 4 | 5): number[] {
  const { subtract, divisor } = SQ_PARAMS[size];
  const layout = SQ_LAYOUTS[size];
  const threshold = SQ_THRESHOLDS[size][(PM - subtract) % divisor] ?? 99;
  const entry = Math.floor((PM - subtract) / divisor);
  return layout.map((L, i) => {
    const val = entry + (L - 1);
    return (i + 1) >= threshold ? val + 1 : val;
  });
}

async function translateName(name: string): Promise<string> {
  const res = await fetch(GEMINI_FLASH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translittère ce prénom en arabe SANS harakat. Retourne UNIQUEMENT du JSON : {"arabic":"النص","weight":0}\nNom : ${name}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
    }),
  });
  const d = await res.json();
  const raw = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}') as string;
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return (JSON.parse(clean) as { arabic: string }).arabic; }
  catch { return name; }
}

async function callMainGemini(prompt: string, retries = 1): Promise<TalismanData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
    }),
  });
  const d = await res.json();
  const raw = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean) as TalismanData; }
  catch {
    if (retries > 0) return callMainGemini(prompt, retries - 1);
    throw new Error('Réponse invalide. Veuillez réessayer.');
  }
}

function buildPrompt(r: Omit<AttraperResult, 'data' | 'invocationWeight' | 'cells' | 'squareSize'>): string {
  return `Tu es un maître de la mystique islamique ouest-africaine et de la science des lettres.

Utilisateur :
Prénom : ${r.userName}
Mère : ${r.userMother}
Prénom arabe : ${r.userNameArabic}
Mère arabe : ${r.userMotherArabic}
Sexe : ${r.userGender}
PM : ${r.PMuser}

Cible :
Prénom : ${r.targetName}
Mère : ${r.targetMother}
Prénom arabe : ${r.targetNameArabic}
Mère arabe : ${r.targetMotherArabic}
Sexe : ${r.targetGender}
PM : ${r.PMtarget}

Objectif : ${r.objectif}

Utilise ces valeurs Abjad :
ا=1 ب=2 ج=3 د=4 ه=5 ة=5 و=6 ز=7 ح=8 ط=9 ي=10 ك=20 ل=30 م=40 ن=50
ص=60 ع=70 ف=80 ض=90 ق=100 ر=200 س=300 ت=400 ث=500 خ=600 ذ=700 ظ=800 غ=900 ش=1000

Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "divineNames": {
    "name1": { "arabic": "nom SANS ال", "withYa": "يا + nom", "transliteration": "Ya ...", "meaning": "signification" },
    "name2": { "arabic": "nom SANS ال", "withYa": "يا + nom", "transliteration": "Ya ...", "meaning": "signification" },
    "combined": "يا nom1 يا nom2",
    "reason": "Pourquoi ces 2 noms divins pour cet objectif et ces 2 personnes."
  },
  "verse": {
    "arabic": "verset SANS harakat",
    "surah": "nom sourate français",
    "ayah": "numéro",
    "meaning": "traduction française",
    "reason": "Pourquoi ce verset pour cet objectif."
  },
  "invocation": {
    "arabicNoHarakat": "invocation complète SANS harakat contenant يا nom1 + يا nom2 + prénom arabe utilisateur + ibn/bint + mère arabe utilisateur + prénom arabe cible + ibn/bint + mère arabe cible + verset",
    "arabicWithHarakat": "même invocation AVEC tous les harakat pour le zikr quotidien",
    "meaning": "traduction française complète de l'invocation",
    "repetitions": 41
  },
  "talisman": {
    "squareType": "3x3 ou 4x4 ou 5x5",
    "choiceReason": "Pourquoi ce type de carré pour cet objectif et ces PM.",
    "writingOrder": [
      "Bismillah en haut de la tablette",
      "Salat sur le Prophète",
      "Les 2 noms divins avec يا",
      "Le verset coranique",
      "Le carré magique",
      "Les noms arabes des 2 personnes"
    ],
    "bathInstructions": "Instructions complètes pour laver la tablette et préparer le bain rituel.",
    "ritualDuration": "7 jours",
    "bestDayToStart": "Quel jour commencer ce rituel"
  },
  "zikr": {
    "steps": [
      { "order": 1, "title": "Bismillah", "arabic": "بسم الله الرحمن الرحيم", "arabicWithHarakat": "بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ", "repetitions": 1, "note": "Toujours commencer par Bismillah" },
      { "order": 2, "title": "Astaghfirullah", "arabic": "أستغفر الله", "arabicWithHarakat": "أَسْتَغْفِرُ اللهَ", "repetitions": 100, "note": null },
      { "order": 3, "title": "Salat sur le Prophète", "arabic": "اللهم صل على سيدنا محمد", "arabicWithHarakat": "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ", "repetitions": 100, "note": null },
      { "order": 4, "title": "Les 2 Noms Divins", "arabic": "[divineNames.combined]", "arabicWithHarakat": "[avec harakat complets]", "repetitions": 99, "note": "يا sans ال obligatoire. Jamais يا الودود." },
      { "order": 5, "title": "Le Verset Coranique", "arabic": "[verse.arabic]", "arabicWithHarakat": "[verset avec harakat]", "repetitions": 7, "note": null },
      { "order": 6, "title": "L'Invocation Complète", "arabic": "[invocation.arabicWithHarakat]", "arabicWithHarakat": "[invocation.arabicWithHarakat]", "repetitions": 41, "note": "Réciter lentement et avec concentration. Penser à ${r.targetName} pendant la récitation." },
      { "order": 7, "title": "Clôture Salat", "arabic": "اللهم صل على سيدنا محمد", "arabicWithHarakat": "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ", "repetitions": 3, "note": "Terminer par Al-Hamdulillah." }
    ],
    "bestTime": "Après Fajr ou avant de dormir",
    "duration": "7 jours",
    "important": "Ne pas interrompre le rituel en cours de route. Faire le zikr chaque jour sans interruption."
  },
  "plants": [
    { "nomFrancais": "nom français", "nomBambara": "nom bambara", "nomScientifique": "nom scientifique exact", "lienWikipedia": "https://fr.wikipedia.org/wiki/...", "partie": "feuilles/écorce/racines", "preparation": "Comment préparer et utiliser avec le bain rituel." },
    { "nomFrancais": "deuxième plante", "nomBambara": "nom bambara", "nomScientifique": "nom scientifique exact", "lienWikipedia": "https://fr.wikipedia.org/wiki/...", "partie": "partie utilisée", "preparation": "Instructions de préparation." }
  ],
  "perfume": {
    "name": "nom du parfum",
    "description": "Pourquoi ce parfum pour cet objectif.",
    "availability": "Où trouver en Afrique de l'Ouest.",
    "usage": "Comment utiliser ce parfum dans le rituel."
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
  "warnings": ["Précaution importante 1", "Précaution importante 2"],
  "conclusion": "Message final chaleureux adressé à ${r.userName}. 3 phrases encourageantes. Termine par InchaAllah."
}

RÈGLES NOMS DIVINS :
TOUJOURS sans ال. TOUJOURS avec يا.
Correct : يا ودود يا جامع — Incorrect : يا الودود يا الجامع

RÈGLES PLANTES :
2 à 3 plantes africaines réelles. Nom scientifique exact. Lien Wikipedia valide.`;
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

function StepBadge({ num }: { num: number }) {
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f9a825', color: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{num}</div>
  );
}

function MagicGrid({ cells, size, cellSize, getCellStyle, formatValue }: {
  cells: number[]; size: number; cellSize: number;
  getCellStyle: () => React.CSSProperties;
  formatValue: (v: number) => string;
}) {
  const fs = cellSize >= 56 ? '0.9rem' : cellSize >= 48 ? '0.82rem' : '0.72rem';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, ${cellSize}px)`, gap: '2px', width: 'fit-content', margin: '0 auto' }}>
      {cells.map((val, i) => (
        <div key={i} style={{ width: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: fs, ...getCellStyle() }}>
          {formatValue(val)}
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function AttraperPage() {
  const [userName,    setUserName]    = useState('');
  const [userMother,  setUserMother]  = useState('');
  const [userGender,  setUserGender]  = useState<'homme' | 'femme'>('homme');
  const [targetName,  setTargetName]  = useState('');
  const [targetMother,setTargetMother]= useState('');
  const [targetGender,setTargetGender]= useState<'homme' | 'femme'>('homme');
  const [objectif,    setObjectif]    = useState(OBJECTIFS[0]);
  const [customObj,   setCustomObj]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState<AttraperResult | null>(null);
  const [balance,     setBalance]     = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [downloadingPDF,  setDownloadingPDF]  = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const effectiveObjectif = objectif === 'Autre' ? customObj.trim() : objectif;
  const formValid = !!(
    userName.trim() && userMother.trim() &&
    targetName.trim() && targetMother.trim() &&
    (objectif !== 'Autre' || customObj.trim().length > 0)
  );

  const cacheKey = `attraper_${userName.trim()}_${userMother.trim()}_${targetName.trim()}_${targetMother.trim()}_${effectiveObjectif}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setResult(JSON.parse(cached) as AttraperResult); return; }

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
      const [unAr, umAr, tnAr, tmAr] = await Promise.all([
        translateName(userName.trim()),
        translateName(userMother.trim()),
        translateName(targetName.trim()),
        translateName(targetMother.trim()),
      ]);

      const PMuser   = calculateWeight(unAr) + calculateWeight(umAr) + GENDER_BONUS[userGender];
      const PMtarget = calculateWeight(tnAr) + calculateWeight(tmAr) + GENDER_BONUS[targetGender];

      const partial: Omit<AttraperResult, 'data' | 'invocationWeight' | 'cells' | 'squareSize'> = {
        userName: userName.trim(), userMother: userMother.trim(), userGender,
        targetName: targetName.trim(), targetMother: targetMother.trim(), targetGender,
        userNameArabic: unAr, userMotherArabic: umAr,
        targetNameArabic: tnAr, targetMotherArabic: tmAr,
        PMuser, PMtarget, objectif: effectiveObjectif,
      };

      const data = await callMainGemini(buildPrompt(partial));

      const squareSize: 3 | 4 | 5 = data.talisman.squareType === '3x3' ? 3 : data.talisman.squareType === '4x4' ? 4 : 5;
      const invocationWeight = calculateWeight(data.invocation.arabicNoHarakat);
      const cells = generateSquare(invocationWeight, squareSize);

      await supabase.from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await supabase.from('credit_transactions').insert({
        user_id: user.id, type: 'use', amount: -2, tool: 'attraper',
        balance_after: bal - 2,
        description: `Talisman attraper — ${userName.trim()} → ${targetName.trim()}`,
      });
      await supabase.from('saved_rituals').insert({
        user_id: user.id,
        title: `Talisman — ${userName.trim()} → ${targetName.trim()}`,
        content: data, page_source: 'attraper',
      });

      const full: AttraperResult = { ...partial, data, invocationWeight, cells, squareSize };
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
      pdf.save(`talisman-${result.userName}-${result.targetName}-secretdivin.pdf`);
    } finally {
      setDownloadingPDF(false);
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)',
    color: '#e8eaf6', padding: '10px 12px', borderRadius: '4px', fontSize: '0.92rem', boxSizing: 'border-box',
  };
  const labelSt: React.CSSProperties = { display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' };

  function TField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
      <div style={{ marginBottom: '14px' }}>
        <label style={labelSt}>{label}</label>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputSt} />
      </div>
    );
  }

  function Radios({ value, onChange, label }: { value: 'homme'|'femme'; onChange: (v: 'homme'|'femme') => void; label: string }) {
    return (
      <div>
        <div style={labelSt}>{label}</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {(['homme','femme'] as const).map(g => (
            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: value === g ? '#f9a825' : '#b0b8d4', fontWeight: value === g ? '700' : '400', fontSize: '0.9rem' }}>
              <input type="radio" value={g} checked={value === g} onChange={() => onChange(g)} style={{ accentColor: '#f9a825' }} />
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>Pour Attraper</h1>
          <p style={{ color: '#b0b8d4', fontStyle: 'italic', maxWidth: '420px', margin: '0 auto 16px', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Génère ton talisman personnalisé basé sur les noms arabes des deux personnes pour atteindre ton objectif
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
              <Card style={{ flex: '1', minWidth: '280px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', textAlign: 'center', marginBottom: '16px' }}>Toi</div>
                <TField label="Ton prénom" value={userName} onChange={setUserName} placeholder="Ton prénom" />
                <TField label="Prénom de ta mère" value={userMother} onChange={setUserMother} placeholder="Prénom de ta mère" />
                <Radios value={userGender} onChange={setUserGender} label="Ton sexe" />
              </Card>
              <Card style={{ flex: '1', minWidth: '280px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', textAlign: 'center', marginBottom: '16px' }}>Ta Cible</div>
                <TField label="Prénom de ta cible" value={targetName} onChange={setTargetName} placeholder="Son prénom" />
                <TField label="Prénom de sa mère" value={targetMother} onChange={setTargetMother} placeholder="Prénom de sa mère" />
                <Radios value={targetGender} onChange={setTargetGender} label="Son sexe" />
              </Card>
            </div>

            <Card style={{ marginBottom: '16px' }}>
              <label style={labelSt}>Ton objectif</label>
              <select value={objectif} onChange={e => setObjectif(e.target.value)}
                style={{ ...inputSt, marginBottom: objectif === 'Autre' ? '12px' : '0', cursor: 'pointer' }}>
                {OBJECTIFS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {objectif === 'Autre' && (
                <div>
                  <label style={labelSt}>Décris ton objectif</label>
                  <input type="text" value={customObj} onChange={e => setCustomObj(e.target.value)} placeholder="Décris précisément..." style={inputSt} />
                </div>
              )}
            </Card>

            {error && (
              <div style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef9a9a', padding: '12px 16px', borderRadius: '4px', marginBottom: '14px', fontSize: '0.9rem' }}>
                {error}
                <button type="button" onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontWeight: '700' }}>✕</button>
              </div>
            )}

            <button type="submit" disabled={loading || !formValid}
              style={{ width: '100%', background: (loading || !formValid) ? '#333' : 'linear-gradient(135deg, #f9a825, #e65100)', color: (loading || !formValid) ? '#888' : '#0a0e2e', fontWeight: '700', fontSize: '0.95rem', padding: '15px', border: 'none', borderRadius: '4px', cursor: (loading || !formValid) ? 'not-allowed' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {loading ? 'Le talisman se prépare...' : 'Générer mon talisman — 2 crédits'}
            </button>
          </form>
        )}

        {/* Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '52px', height: '52px', border: '3px solid rgba(249,168,37,0.2)', borderTop: '3px solid #f9a825', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ color: '#f9a825', fontWeight: '600' }}>Le talisman se prépare pour toi...</div>
          </div>
        )}

        {/* ── Résultats ── */}
        {result && !loading && (
          <div ref={resultsRef} style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* BLOC 1 — Résumé profils */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.9rem', marginBottom: '20px' }}>Ton Talisman Personnalisé</h2>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '18px' }}>
                {[
                  { label: result.userName, nameAr: result.userNameArabic, motherAr: result.userMotherArabic, pm: result.PMuser },
                  { label: result.targetName, nameAr: result.targetNameArabic, motherAr: result.targetMotherArabic, pm: result.PMtarget },
                ].map(({ label, nameAr, motherAr, pm }) => (
                  <div key={label} style={{ flex: '1', minWidth: '200px', background: '#111a55', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '8px', padding: '18px', textAlign: 'right' }}>
                    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.3rem', marginBottom: '8px', textAlign: 'left' }}>{label}</div>
                    <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em', direction: 'rtl', lineHeight: '1.8', marginBottom: '4px' }}>{nameAr}</div>
                    <div style={{ color: '#b0b8d4', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1em', direction: 'rtl', lineHeight: '1.6', marginBottom: '8px' }}>مادة : {motherAr}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.82rem', textAlign: 'left' }}>PM : {pm}</div>
                  </div>
                ))}
              </div>
              <span style={{ display: 'inline-block', background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '7px 22px', borderRadius: '20px', fontWeight: '600', fontSize: '0.9rem' }}>
                {result.objectif}
              </span>
            </div>

            <Sep />

            {/* BLOC 2 — Noms Divins */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Tes 2 Noms Divins</SectionTitle>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {[result.data.divineNames.name1, result.data.divineNames.name2].map((dn, i) => (
                  <div key={i} style={{ flex: '1', minWidth: '200px', background: '#111a55', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '2.2em', direction: 'rtl', lineHeight: '1.6', marginBottom: '8px' }}>{dn.withYa}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.88rem', marginBottom: '6px' }}>{dn.transliteration}</div>
                    <div style={{ color: '#e8eaf6', fontSize: '0.92rem' }}>{dn.meaning}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.8em', direction: 'rtl', lineHeight: '1.8', marginBottom: '10px' }}>
                  {result.data.divineNames.combined}
                </div>
                <p style={{ color: '#b0b8d4', fontStyle: 'italic', maxWidth: '500px', margin: '0 auto 14px', lineHeight: '1.7' }}>{result.data.divineNames.reason}</p>
                <AudioButton text={result.data.divineNames.combined} label="Écouter les noms divins" />
              </div>
            </div>

            <Sep />

            {/* BLOC 3 — Verset */}
            <Card style={{ textAlign: 'center', marginBottom: '8px' }}>
              <SectionTitle>Ton Verset Coranique</SectionTitle>
              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.8em', direction: 'rtl', textAlign: 'right', lineHeight: '2', marginBottom: '10px' }}>
                {result.data.verse.arabic}
              </div>
              <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>
                Sourate {result.data.verse.surah} — Verset {result.data.verse.ayah}
              </div>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', marginBottom: '10px', lineHeight: '1.7' }}>{result.data.verse.meaning}</p>
              <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '14px' }}>{result.data.verse.reason}</p>
              <AudioButton text={result.data.verse.arabic} label="Écouter le verset" />
            </Card>

            <Sep />

            {/* BLOC 4 — Invocation */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Ton Invocation</SectionTitle>
              <div style={{ color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '12px' }}>Version pour écrire (sans harakat)</div>
              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.5em', direction: 'rtl', textAlign: 'right', lineHeight: '2', marginBottom: '16px' }}>
                {result.data.invocation.arabicNoHarakat}
              </div>
              <Sep />
              <p style={{ color: '#b0b8d4', fontStyle: 'italic', lineHeight: '1.7', marginBottom: '16px' }}>{result.data.invocation.meaning}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  Poids de l'invocation : {result.invocationWeight}
                </span>
                <span style={{ background: '#1565c0', color: '#fff', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  Carré : {result.data.talisman.squareType}
                </span>
              </div>
              <AudioButton text={result.data.invocation.arabicWithHarakat} label="Écouter l'invocation" />
            </Card>

            <Sep />

            {/* BLOC 5 — Carré Magique */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Ton Carré Magique {result.data.talisman.squareType}</SectionTitle>
              <p style={{ color: '#b0b8d4', fontStyle: 'italic', marginBottom: '22px', lineHeight: '1.6' }}>{result.data.talisman.choiceReason}</p>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', overflowX: 'auto' }}>
                {/* Grille 1 — Base */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Carré de Base</div>
                  <MagicGrid cells={SQ_LAYOUTS[result.squareSize]} size={result.squareSize} cellSize={SQ_CELL_SIZES[result.squareSize]}
                    getCellStyle={() => ({ background: '#f5f5f5', border: '1px solid #e0e0e0', color: '#1a237e' })}
                    formatValue={v => String(v)} />
                </div>
                {/* Grille 2 — Français */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Chiffres Français</div>
                  <MagicGrid cells={result.cells} size={result.squareSize} cellSize={SQ_CELL_SIZES[result.squareSize]}
                    getCellStyle={() => ({ background: 'white', border: '2px solid #f9a825', color: '#1a237e' })}
                    formatValue={v => String(v)} />
                </div>
                {/* Grille 3 — Arabes */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1rem', direction: 'rtl', marginBottom: '12px' }}>الأرقام العربية</div>
                  <MagicGrid cells={result.cells} size={result.squareSize} cellSize={SQ_CELL_SIZES[result.squareSize]}
                    getCellStyle={() => ({ background: '#1a237e', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl' })}
                    formatValue={v => toArabicIndic(v)} />
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <span style={{ display: 'inline-block', background: 'rgba(76,175,80,0.12)', border: '1px solid #4caf50', color: '#81c784', padding: '6px 18px', borderRadius: '20px', fontSize: '0.88rem', fontWeight: '600' }}>
                  ✦ Somme = {result.invocationWeight}
                </span>
              </div>
            </Card>

            <Sep />

            {/* BLOC 6 — Écrire le Talisman */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Comment Écrire ton Talisman</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {result.data.talisman.writingOrder.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <StepBadge num={i + 1} />
                    <div style={{ color: '#e8eaf6', lineHeight: '1.7', paddingTop: '4px', flex: 1 }}>{step}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instructions du bain rituel</div>
                <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{result.data.talisman.bathInstructions}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  Commencer un {result.data.talisman.bestDayToStart}
                </span>
                <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  Durée : {result.data.talisman.ritualDuration}
                </span>
              </div>
            </Card>

            <Sep />

            {/* BLOC 7 — Plantes et Parfum */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Plantes et Parfum du Rituel</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                {result.data.plants.map((plant, i) => (
                  <div key={i} style={{ background: '#0d2b1a', border: '2px solid rgba(249,168,37,0.4)', borderRadius: '8px', padding: '20px' }}>
                    <div style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{plant.nomFrancais}</div>
                    <div style={{ color: '#f9a825', fontStyle: 'italic', fontWeight: '600', marginBottom: '4px' }}>{plant.nomBambara}</div>
                    <div style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.78rem', marginBottom: '12px' }}>{plant.nomScientifique}</div>
                    <div style={{ color: '#e8eaf6', fontSize: '0.88rem', marginBottom: '10px' }}>Partie : <strong>{plant.partie}</strong></div>
                    <p style={{ color: '#e8eaf6', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '14px' }}>{plant.preparation}</p>
                    <button onClick={() => window.open(plant.lienWikipedia, '_blank', 'noopener,noreferrer')}
                      style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' }}>
                      En savoir plus sur {plant.nomFrancais}
                    </button>
                  </div>
                ))}
              </div>
              <Card style={{ border: '1px solid rgba(249,168,37,0.4)' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '10px' }}>Parfum : {result.data.perfume.name}</div>
                <p style={{ color: '#e8eaf6', lineHeight: '1.7', marginBottom: '8px' }}>{result.data.perfume.description}</p>
                <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.7', marginBottom: '8px' }}>{result.data.perfume.usage}</p>
                <p style={{ color: '#b0b8d4', fontSize: '0.82rem', lineHeight: '1.6', margin: 0 }}>{result.data.perfume.availability}</p>
              </Card>
            </div>

            <Sep />

            {/* BLOC 8 — Zikr */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Ton Zikr Quotidien</SectionTitle>
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div style={{ color: '#f9a825', fontWeight: '600', marginBottom: '4px' }}>Meilleur moment : {result.data.zikr.bestTime}</div>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Durée : {result.data.zikr.duration}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                {result.data.zikr.steps.map((step) => (
                  <Card key={step.order}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <StepBadge num={step.order} />
                      <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem' }}>{step.title}</div>
                    </div>
                    <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.5em', direction: 'rtl', textAlign: 'right', lineHeight: '2', marginBottom: '12px' }}>
                      {step.arabicWithHarakat}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: step.note ? '10px' : '0' }}>
                      <span style={{ background: '#f9a825', color: '#0a0e2e', padding: '3px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                        {step.repetitions} fois
                      </span>
                      <AudioButton text={step.arabicWithHarakat} label={`Écouter étape ${step.order}`} style={{ marginTop: '8px', fontSize: '0.8em' }} />
                    </div>
                    {step.note && (
                      <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.82rem', lineHeight: '1.6', margin: '10px 0 0' }}>{step.note}</p>
                    )}
                  </Card>
                ))}
              </div>
              <div style={{ background: 'rgba(249,168,37,0.07)', border: '1px solid rgba(249,168,37,0.4)', borderRadius: '6px', padding: '16px' }}>
                <p style={{ color: '#f9a825', fontWeight: '600', margin: 0, lineHeight: '1.7' }}>{result.data.zikr.important}</p>
              </div>
            </div>

            <Sep />

            {/* BLOC 9 — Sacrifice */}
            {result.data.sacrifice.isRecommended && (
              <>
                <Card style={{ marginBottom: '8px' }}>
                  <SectionTitle>Sacrifice Recommandé</SectionTitle>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', marginBottom: '16px', lineHeight: '1.6' }}>{result.data.sacrifice.reason}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {result.data.sacrifice.offerings.map((o, i) => (
                      <div key={i} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.1)', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '4px' }}>
                          {o.item} — <span style={{ color: '#e8eaf6', fontWeight: '400' }}>Quantité : {o.quantity}</span>
                        </div>
                        <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>{o.meaning}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#e8eaf6', marginBottom: '6px' }}>À donner à : <span style={{ color: '#f9a825', fontWeight: '700' }}>{result.data.sacrifice.recipient}</span></div>
                  <div style={{ color: '#e8eaf6', marginBottom: '14px' }}>Moment : <span style={{ color: '#b0b8d4' }}>{result.data.sacrifice.timing}</span></div>
                  <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '6px', padding: '14px' }}>
                    <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{result.data.sacrifice.instructions}</p>
                  </div>
                </Card>
                <Sep />
              </>
            )}

            {/* BLOC 10 — Avertissements */}
            {result.data.warnings.length > 0 && (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#ff9800', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✦</span><span>Précautions Importantes</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.data.warnings.map((w, i) => (
                      <div key={i} style={{ background: 'rgba(255,152,0,0.07)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '6px', padding: '14px' }}>
                        <span style={{ color: '#f9a825' }}>✦ </span>
                        <span style={{ color: '#e8eaf6', fontSize: '0.92rem', lineHeight: '1.7' }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Sep />
              </>
            )}

            {/* BLOC 11 — Conclusion */}
            <div style={{ background: '#1a237e', border: '2px solid #f9a825', borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.9', fontSize: '1rem', margin: 0 }}>{result.data.conclusion}</p>
            </div>

            <Sep />

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={handleDownloadPDF} disabled={downloadingPDF}
                style={{ background: downloadingPDF ? '#333' : '#f9a825', color: downloadingPDF ? '#888' : '#0a0e2e', fontWeight: '700', padding: '10px 22px', border: 'none', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Génération PDF...' : 'Télécharger mon talisman en PDF'}
              </button>
              <button onClick={() => { setResult(null); setError(''); }}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '10px 22px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Créer un nouveau talisman
              </button>
            </div>

          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditModal toolName="Pour Attraper" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />
      )}
    </div>
  );
}
