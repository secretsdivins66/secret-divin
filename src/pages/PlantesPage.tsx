import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlantItem {
  number: number;
  nomFrancais: string;
  nomBambara: string;
  nomScientifique: string;
  lienWikipedia: string;
  partie: string;
  quantite: string;
  properties: string;
  why: string;
}

interface VerseItem {
  arabic: string;
  surah: string;
  ayah: string;
  meaning: string;
  why: string;
  writingInstructions: string;
}

interface PlantesData {
  isGuerisson: boolean;
  objectiveSummary: string;
  introduction: string;
  plants: PlantItem[];
  verses: VerseItem[];
  preparation: {
    materials: string[];
    talismanPreparation: { step1: string; step2: string; step3: string; talismanWaterUse: string };
    plantPreparation: { step1: string; step2: string; step3: string; step4: string; fumigationInstructions: string | null };
    mixing: string;
  };
  ritual: {
    isGuerisson: boolean;
    washingInstructions: string;
    drinkingInstructions: string | null;
    fumigationInstructions: string | null;
    duration: string;
    bestTime: string;
    daysToAvoid: string | null;
    dailyRitual: string[];
    importantNotes: string[];
  };
  prayer: {
    opening: string;
    openingMeaning: string;
    mainPrayer: string;
    mainPrayerMeaning: string;
    repetitions: number;
    when: string;
  };
  divineName: {
    arabic: string;
    withYa: string;
    transliteration: string;
    meaning: string;
    repetitions: number;
    reason: string;
  };
  sacrifice: {
    isRecommended: boolean;
    reason: string;
    offerings: { item: string; quantity: string; meaning: string }[];
    recipient: string;
    timing: string;
    instructions: string;
  };
  warnings: string[];
  conclusion: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_25  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const CATEGORIES = [
  'Guérison / Santé',
  'Protection / Désenvoutement',
  'Amour / Mariage',
  'Argent / Richesse',
  'Travail / Réussite',
  'Élévation spirituelle',
  'Chance / Bénédiction',
  'Autre',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPrompt(objectiveText: string, category: string): string {
  return `Tu es un maître herboriste de la tradition mystique islamique ouest-africaine. Tu combines la phytothérapie traditionnelle africaine avec la science des versets coraniques. Tu parles avec 'tu' en français. Ton ton est chaleureux, sage et professionnel.

Objectif décrit : ${objectiveText}
Catégorie : ${category}

RÈGLE nombre de plantes :
Objectif simple (1 problème clair) : 1 à 3 plantes.
Objectif complexe (plusieurs problèmes) : 4 à 5 plantes.
Objectif très complexe : 6 à 7 plantes.
Maximum absolu : 7 plantes.

RÈGLE guérison : Si catégorie = 'Guérison / Santé' OU si le texte mentionne une maladie, une douleur ou un problème de santé : isGuerisson = true. Dans ce cas le patient doit SE LAVER ET BOIRE la préparation.

Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "isGuerisson": false,
  "objectiveSummary": "Résumé en une phrase de l'objectif détecté.",
  "introduction": "2-3 phrases d'introduction personnelle. Utilise tu. Explique pourquoi ces plantes ont été choisies pour cet objectif.",
  "plants": [
    {
      "number": 1,
      "nomFrancais": "Nom français",
      "nomBambara": "Nom bambara",
      "nomScientifique": "Nom scientifique exact",
      "lienWikipedia": "https://fr.wikipedia.org/wiki/...",
      "partie": "feuilles/écorce/racines/tout",
      "quantite": "une grosse poignée de feuilles / 3 morceaux d'écorce / ...",
      "properties": "Propriétés spirituelles et physiques pour cet objectif.",
      "why": "Pourquoi cette plante est choisie pour cet objectif spécifique."
    }
  ],
  "verses": [
    {
      "arabic": "verset SANS harakat",
      "surah": "nom sourate français",
      "ayah": "numéro",
      "meaning": "traduction française",
      "why": "Pourquoi ce verset pour cet objectif et ces plantes.",
      "writingInstructions": "Comment écrire ce verset sur la tablette en bois avec encre naturelle."
    }
  ],
  "preparation": {
    "materials": ["Une grande marmite propre", "Une tablette en bois propre", "Encre naturelle (safran, charbon ou encre noire)", "Un récipient propre pour recueillir l'eau"],
    "talismanPreparation": {
      "step1": "Écrire le(s) verset(s) sur la tablette en bois avec l'encre naturelle",
      "step2": "Laisser sécher la tablette complètement",
      "step3": "Faire tremper la tablette dans de l'eau propre pendant [durée selon objectif]",
      "talismanWaterUse": "Comment utiliser l'eau du talisman (mélanger avec eau des plantes)"
    },
    "plantPreparation": {
      "step1": "Comment préparer les plantes (laver, couper, séparer les parties...)",
      "step2": "Quantité d'eau à utiliser pour la décoction",
      "step3": "Comment faire bouillir (durée exacte, feu doux ou fort)",
      "step4": "Comment filtrer et laisser refroidir",
      "fumigationInstructions": null
    },
    "mixing": "Comment mélanger l'eau des plantes et l'eau du talisman pour obtenir la préparation finale."
  },
  "ritual": {
    "isGuerisson": false,
    "washingInstructions": "Instructions détaillées pour se laver avec le mélange final.",
    "drinkingInstructions": null,
    "fumigationInstructions": null,
    "duration": "14 jours",
    "bestTime": "Matin avant le lever du soleil / Après Fajr",
    "daysToAvoid": null,
    "dailyRitual": ["Étape 1 du rituel quotidien", "Étape 2", "Étape 3", "Étape 4"],
    "importantNotes": ["Note importante 1", "Note importante 2"]
  },
  "prayer": {
    "opening": "بسم الله الرحمن الرحيم",
    "openingMeaning": "Au nom d'Allah le Tout Miséricordieux, le Très Miséricordieux",
    "mainPrayer": "Invocation principale en arabe SANS harakat",
    "mainPrayerMeaning": "Signification en français",
    "repetitions": 7,
    "when": "Pendant le bain rituel / Après Fajr / Avant de dormir"
  },
  "divineName": {
    "arabic": "nom SANS ال",
    "withYa": "يا + nom",
    "transliteration": "Ya ...",
    "meaning": "signification",
    "repetitions": 99,
    "reason": "Pourquoi ce nom divin pour cet objectif."
  },
  "sacrifice": {
    "isRecommended": true,
    "reason": "Pourquoi ce sacrifice accompagne ce rituel.",
    "offerings": [
      { "item": "offrande 1", "quantity": "nombre", "meaning": "signification de cette offrande" },
      { "item": "offrande 2", "quantity": "nombre", "meaning": "signification" }
    ],
    "recipient": "À qui donner",
    "timing": "Quel jour et heure",
    "instructions": "Instructions complètes du sacrifice."
  },
  "warnings": ["Précaution importante 1", "Précaution importante 2 si nécessaire"],
  "conclusion": "Message final chaleureux et encourageant. 3 phrases adressées directement à la personne avec tu. Termine par InchaAllah."
}

RÈGLES plantes : Uniquement vraies plantes africaines connues en médecine traditionnelle. Toujours nom bambara. Toujours nom scientifique exact. Toujours lien Wikipedia valide : https://fr.wikipedia.org/wiki/[Nom]. Plantes disponibles en Afrique de l'Ouest. Varier les parties utilisées.
RÈGLES versets : Versets authentiques du Coran. SANS harakat (sans signes diacritiques). Compatibles avec l'objectif. 1 verset pour objectif simple. 2-3 versets pour objectif complexe.`;
}

async function callGemini(prompt: string, retries = 1): Promise<PlantesData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 3000 },
    }),
  });
  const d = await res.json();
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean) as PlantesData;
  } catch {
    if (retries > 0) return callGemini(prompt, retries - 1);
    throw new Error('Réponse invalide de l\'IA. Veuillez réessayer.');
  }
}

function detectGuerisson(data: PlantesData, category: string, text: string): boolean {
  const t = text.toLowerCase();
  return (
    data.isGuerisson === true ||
    category === 'Guérison / Santé' ||
    t.includes('maladie') ||
    t.includes('douleur') ||
    t.includes('santé') ||
    t.includes('guérir') ||
    t.includes('malade') ||
    t.includes('traitement')
  );
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

function StepItem({ num, text }: { num: number; text: string }) {
  return (
    <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f9a825', color: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{num}</div>
      <div style={{ color: '#e8eaf6', lineHeight: '1.75', paddingTop: '4px', flex: 1 }}>{text}</div>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
      <div style={{ width: '16px', height: '16px', border: '2px solid #f9a825', borderRadius: '2px', flexShrink: 0, marginTop: '3px' }} />
      <span style={{ color: '#e8eaf6', fontSize: '0.92rem', lineHeight: '1.6' }}>{text}</span>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function PlantesPage() {
  const [objectiveText, setObjectiveText] = useState('');
  const [category, setCategory]           = useState(CATEGORIES[0]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [data, setData]                   = useState<PlantesData | null>(null);
  const [balance, setBalance]             = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF]   = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const cacheKey = `plantes_${objectiveText.trim().substring(0, 50)}_${category}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (objectiveText.trim().length < 20) return;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setData(JSON.parse(cached) as PlantesData); return; }

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Veuillez vous connecter.'); return; }

      const { data: creditData } = await supabase
        .from('user_credits').select('balance').eq('user_id', user.id).single();
      const bal = (creditData as { balance: number } | null)?.balance ?? 0;
      if (bal < 2) { setBalance(bal); setShowCreditModal(true); return; }

      const prompt = buildPrompt(objectiveText.trim(), category);
      const result = await callGemini(prompt);

      await supabase.from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await supabase.from('credit_transactions').insert({
        user_id: user.id, type: 'use', amount: -2, tool: 'plantes',
        balance_after: bal - 2,
        description: 'Plantes mystiques — ' + category,
      });

      await supabase.from('saved_rituals').insert({
        user_id: user.id,
        title: 'Plantes — ' + objectiveText.trim().substring(0, 40),
        content: result,
        page_source: 'plantes',
      });

      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Erreur de connexion. Réessaie.');
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
      pdf.save('plantes-secretdivin.pdf');
    } finally {
      setDownloadingPDF(false);
    }
  }

  const isGuerisson = data ? detectGuerisson(data, category, objectiveText) : false;
  const globalAudioText = data
    ? `${data.introduction} ${data.prayer.mainPrayer} ${data.conclusion}`
    : '';

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>Plantes Mystiques</h1>
          <p style={{ color: '#b0b8d4', fontSize: '0.95rem', fontStyle: 'italic', maxWidth: '460px', margin: '0 auto 16px', lineHeight: '1.6' }}>
            Découvre les plantes sacrées africaines et leurs rituels selon ton objectif spirituel
          </p>
          <Sep />
          <span style={{ display: 'inline-block', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '6px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '600' }}>
            2 crédits par génération
          </span>
        </div>

        {/* Formulaire */}
        {!data && (
          <Card style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
                  Décris ton objectif ou ton problème
                </label>
                <textarea
                  value={objectiveText}
                  onChange={e => setObjectiveText(e.target.value)}
                  required minLength={20} rows={5}
                  placeholder={"Ex: Je veux me protéger du mauvais oeil, je cherche à attirer l'amour, je souffre d'une maladie chronique, je veux réussir dans mes affaires, je cherche la paix intérieure..."}
                  style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '12px 14px', borderRadius: '4px', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.7', minHeight: '110px' }}
                />
                <div style={{ textAlign: 'right', color: objectiveText.length < 20 ? '#ef9a9a' : '#b0b8d4', fontSize: '0.75rem', marginTop: '4px' }}>
                  {objectiveText.length} caractères {objectiveText.length < 20 ? '(minimum 20)' : ''}
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px' }}>
                  Catégorie de l'objectif
                </label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 14px', borderRadius: '4px', fontSize: '0.92rem' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef9a9a', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  {error}
                  <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontWeight: '700' }}>✕</button>
                </div>
              )}

              <button type="submit" disabled={loading || objectiveText.trim().length < 20}
                style={{ width: '100%', background: (loading || objectiveText.trim().length < 20) ? '#333' : 'linear-gradient(135deg, #f9a825, #e65100)', color: (loading || objectiveText.trim().length < 20) ? '#888' : '#0a0e2e', fontWeight: '700', fontSize: '0.95rem', padding: '14px', border: 'none', borderRadius: '4px', cursor: (loading || objectiveText.trim().length < 20) ? 'not-allowed' : 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {loading ? 'Recherche en cours...' : 'Trouver mes plantes et mon rituel — 2 crédits'}
              </button>
            </form>
          </Card>
        )}

        {/* Chargement */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '52px', height: '52px', border: '3px solid rgba(249,168,37,0.2)', borderTop: '3px solid #f9a825', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '1rem' }}>Recherche des plantes mystiques pour toi...</div>
          </div>
        )}

        {/* ─── Résultats ─── */}
        {data && !loading && (
          <div ref={resultsRef} style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* En-tête résultats */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'inline-block', background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '8px 20px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>
                {data.objectiveSummary}
              </div>

              {isGuerisson && (
                <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.5)', borderRadius: '8px', padding: '14px 20px', marginBottom: '16px' }}>
                  <div style={{ color: '#4caf50', fontWeight: '700', fontSize: '0.95rem' }}>
                    Rituel de Guérison — Tu devras te laver ET boire la préparation chaque jour
                  </div>
                </div>
              )}

              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto' }}>{data.introduction}</p>
            </div>

            <Sep />

            {/* ── BLOC 1 : Plantes ── */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Tes Plantes ({data.plants.length} plante{data.plants.length > 1 ? 's' : ''})</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {data.plants.map((plant) => (
                  <div key={plant.number} style={{ background: '#0d2b1a', border: '2px solid rgba(249,168,37,0.4)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#f9a825', padding: '10px 16px' }}>
                      <div style={{ color: '#0a0e2e', fontWeight: '700', fontSize: '0.95rem' }}>
                        Plante {plant.number} — {plant.nomFrancais}
                      </div>
                    </div>
                    <div style={{ padding: '18px' }}>
                      <div style={{ color: '#f9a825', fontStyle: 'italic', fontWeight: '600', fontSize: '1rem', marginBottom: '4px' }}>{plant.nomBambara}</div>
                      <div style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.78rem', marginBottom: '14px' }}>{plant.nomScientifique}</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#b0b8d4', fontSize: '0.82rem', minWidth: '100px' }}>Partie :</span>
                          <span style={{ color: '#e8eaf6', fontSize: '0.82rem' }}>{plant.partie}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: '#b0b8d4', fontSize: '0.82rem', minWidth: '100px' }}>Quantité :</span>
                          <span style={{ color: '#e8eaf6', fontSize: '0.82rem', fontWeight: '600' }}>{plant.quantite}</span>
                        </div>
                      </div>

                      <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '10px' }}>{plant.properties}</p>
                      <p style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '16px' }}>{plant.why}</p>

                      <button onClick={() => window.open(plant.lienWikipedia, '_blank', 'noopener,noreferrer')}
                        style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '7px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', width: '100%' }}>
                        En savoir plus sur {plant.nomFrancais}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Sep />

            {/* ── BLOC 2 : Versets ── */}
            <div style={{ marginBottom: '8px' }}>
              <SectionTitle>Verset{data.verses.length > 1 ? 's' : ''} Coranique{data.verses.length > 1 ? 's' : ''}</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.verses.map((v, i) => (
                  <Card key={i}>
                    <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.8em', direction: 'rtl', textAlign: 'right', marginBottom: '12px', lineHeight: '2' }}>
                      {v.arabic}
                    </div>
                    <div style={{ color: '#b0b8d4', textAlign: 'center', fontSize: '0.82rem', marginBottom: '8px' }}>
                      Sourate {v.surah} — Verset {v.ayah}
                    </div>
                    <p style={{ color: '#e8eaf6', fontStyle: 'italic', textAlign: 'center', marginBottom: '12px', lineHeight: '1.7' }}>{v.meaning}</p>
                    <p style={{ color: '#b0b8d4', fontSize: '0.82rem', lineHeight: '1.6', marginBottom: '14px' }}>{v.why}</p>
                    <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.3)', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Comment écrire sur la tablette</div>
                      <p style={{ color: '#e8eaf6', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>{v.writingInstructions}</p>
                    </div>
                    <AudioButton text={v.arabic} label="Écouter ce verset" />
                  </Card>
                ))}
              </div>
            </div>

            <Sep />

            {/* ── BLOC 3 : Préparation ── */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Préparation Complète</SectionTitle>

              {/* Matériel */}
              <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.25)', borderRadius: '6px', padding: '18px', marginBottom: '24px' }}>
                <div style={{ color: '#42a5f5', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Matériel nécessaire</div>
                {data.preparation.materials.map((m, i) => <CheckItem key={i} text={m} />)}
              </div>

              <Sep />

              {/* Étape A */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '16px' }}>Étape A — Prépare le Talisman</div>
                <StepItem num={1} text={data.preparation.talismanPreparation.step1} />
                <StepItem num={2} text={data.preparation.talismanPreparation.step2} />
                <StepItem num={3} text={data.preparation.talismanPreparation.step3} />
                <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.25)', borderRadius: '6px', padding: '14px', marginTop: '8px' }}>
                  <p style={{ color: '#e8eaf6', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{data.preparation.talismanPreparation.talismanWaterUse}</p>
                </div>
              </div>

              <Sep />

              {/* Étape B */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '16px' }}>Étape B — Prépare les Plantes</div>
                <StepItem num={1} text={data.preparation.plantPreparation.step1} />
                <StepItem num={2} text={data.preparation.plantPreparation.step2} />
                <StepItem num={3} text={data.preparation.plantPreparation.step3} />
                <StepItem num={4} text={data.preparation.plantPreparation.step4} />
                {data.preparation.plantPreparation.fumigationInstructions && (
                  <div style={{ background: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.25)', borderRadius: '6px', padding: '14px', marginTop: '8px' }}>
                    <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Fumigation</div>
                    <p style={{ color: '#e8eaf6', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{data.preparation.plantPreparation.fumigationInstructions}</p>
                  </div>
                )}
              </div>

              <Sep />

              {/* Étape C */}
              <div>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.95rem', marginBottom: '14px' }}>Étape C — Mélange Final</div>
                <div style={{ background: 'rgba(249,168,37,0.08)', border: '2px solid rgba(249,168,37,0.4)', borderRadius: '8px', padding: '18px' }}>
                  <p style={{ color: '#e8eaf6', fontWeight: '600', lineHeight: '1.75', margin: 0, fontSize: '1rem' }}>{data.preparation.mixing}</p>
                </div>
              </div>
            </Card>

            <Sep />

            {/* ── BLOC 4 : Rituel ── */}
            <Card style={{ marginBottom: '8px' }}>
              <SectionTitle>Le Rituel ({data.ritual.duration})</SectionTitle>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem' }}>
                  Meilleur moment : {data.ritual.bestTime}
                </div>
              </div>

              {isGuerisson && (
                <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ color: '#4caf50', fontWeight: '700' }}>Pour la guérison : tu dois te laver ET boire cette préparation chaque jour</div>
                </div>
              )}

              {/* Rituel quotidien */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: '#b0b8d4', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Rituel quotidien</div>
                {data.ritual.dailyRitual.map((step, i) => <StepItem key={i} num={i + 1} text={step} />)}
              </div>

              {/* Lavage */}
              <div style={{ background: '#0a0e2e', borderRadius: '6px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(249,168,37,0.15)' }}>
                <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Lavage</div>
                <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.ritual.washingInstructions}</p>
              </div>

              {/* Boisson (guérison) */}
              {isGuerisson && data.ritual.drinkingInstructions && (
                <div style={{ background: 'rgba(76,175,80,0.07)', border: '1px solid rgba(76,175,80,0.35)', borderRadius: '6px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ color: '#4caf50', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Comment boire</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.ritual.drinkingInstructions}</p>
                </div>
              )}

              {/* Fumigation */}
              {data.ritual.fumigationInstructions && (
                <div style={{ background: '#0a0e2e', borderRadius: '6px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(249,168,37,0.15)' }}>
                  <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Fumigation</div>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.ritual.fumigationInstructions}</p>
                </div>
              )}

              {/* Jours à éviter */}
              {data.ritual.daysToAvoid && (
                <div style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ color: '#ff9800', fontWeight: '700', fontSize: '0.9rem' }}>Jours à éviter : {data.ritual.daysToAvoid}</div>
                </div>
              )}

              {/* Notes importantes */}
              {data.ritual.importantNotes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.ritual.importantNotes.map((note, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '12px 16px' }}>
                      <span style={{ color: '#f9a825' }}>✦ </span>
                      <span style={{ color: '#e8eaf6', fontSize: '0.9rem' }}>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Sep />

            {/* ── BLOC 5 : Prière ── */}
            <Card style={{ textAlign: 'center', marginBottom: '8px' }}>
              <SectionTitle>Prière et Invocation</SectionTitle>

              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.6em', direction: 'rtl', textAlign: 'right', marginBottom: '6px', lineHeight: '2' }}>
                {data.prayer.opening}
              </div>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', marginBottom: '20px', lineHeight: '1.6' }}>{data.prayer.openingMeaning}</p>

              <Sep />

              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.8em', direction: 'rtl', textAlign: 'right', marginBottom: '10px', lineHeight: '2' }}>
                {data.prayer.mainPrayer}
              </div>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', marginBottom: '14px', lineHeight: '1.6' }}>{data.prayer.mainPrayerMeaning}</p>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  À réciter {data.prayer.repetitions} fois
                </span>
              </div>
              <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '16px' }}>{data.prayer.when}</p>
              <AudioButton text={data.prayer.mainPrayer} label="Écouter la prière" />
            </Card>

            <Sep />

            {/* ── BLOC 6 : Nom Divin ── */}
            <Card style={{ textAlign: 'center', marginBottom: '8px' }}>
              <SectionTitle>Ton Nom Divin</SectionTitle>
              <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '2.5em', direction: 'rtl', textAlign: 'right', marginBottom: '10px', lineHeight: '1.6' }}>
                {data.divineName.withYa}
              </div>
              <div style={{ color: '#b0b8d4', marginBottom: '10px' }}>
                {data.divineName.transliteration} · {data.divineName.meaning}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '5px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
                  À réciter {data.divineName.repetitions} fois
                </span>
              </div>
              <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.88rem', marginBottom: '16px', lineHeight: '1.6' }}>{data.divineName.reason}</p>
              <AudioButton text={data.divineName.withYa} label="Écouter le nom divin" />
            </Card>

            <Sep />

            {/* ── BLOC 7 : Sacrifice ── */}
            {data.sacrifice.isRecommended && (
              <>
                <Card style={{ marginBottom: '8px' }}>
                  <SectionTitle>Sacrifice Recommandé</SectionTitle>
                  <p style={{ color: '#b0b8d4', fontStyle: 'italic', marginBottom: '18px', lineHeight: '1.6' }}>{data.sacrifice.reason}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    {data.sacrifice.offerings.map((o, i) => (
                      <div key={i} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.1)', borderRadius: '6px', padding: '14px' }}>
                        <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '4px' }}>
                          {o.item} — <span style={{ color: '#e8eaf6', fontWeight: '400' }}>Quantité : {o.quantity}</span>
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
                    <div style={{ color: '#42a5f5', fontWeight: '600', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Instructions</div>
                    <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0, fontSize: '0.92rem' }}>{data.sacrifice.instructions}</p>
                  </div>
                </Card>
                <Sep />
              </>
            )}

            {/* ── BLOC 8 : Avertissements ── */}
            {data.warnings.length > 0 && (
              <>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#ff9800', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✦</span><span>Précautions Importantes</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.warnings.map((w, i) => (
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

            {/* ── BLOC 9 : Conclusion ── */}
            <div style={{ background: '#1a237e', border: '2px solid #f9a825', borderRadius: '8px', padding: '28px', textAlign: 'center', marginBottom: '28px' }}>
              <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.85', fontSize: '1rem', margin: 0 }}>{data.conclusion}</p>
            </div>

            <Sep />

            {/* Boutons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <AudioButton text={globalAudioText} label="Écouter le rituel" isLong={true} />
              <button onClick={handleDownloadPDF} disabled={downloadingPDF}
                style={{ background: downloadingPDF ? '#333' : '#f9a825', color: downloadingPDF ? '#888' : '#0a0e2e', fontWeight: '700', padding: '8px 22px', border: 'none', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                {downloadingPDF ? 'Génération PDF...' : 'Télécharger en PDF'}
              </button>
              <button onClick={() => { setData(null); setError(''); }}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 22px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Décrire un autre objectif
              </button>
            </div>

          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditModal toolName="les Plantes Mystiques" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />
      )}
    </div>
  );
}
