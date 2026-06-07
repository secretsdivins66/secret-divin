import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CreditModal } from '../components/CreditModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonDef {
  id: string;
  title: string;
  description: string;
  topic: string;
  duration: string;
}

interface ModuleDef {
  id: number;
  niveau: 1 | 2 | 3;
  titre: string;
  description: string;
  couleur: string;
  lessons: LessonDef[];
}

interface LessonSection {
  title: string;
  content: string;
  arabicContent: string | null;
  keyPoints: string[];
}

interface LessonContent {
  title: string;
  introduction: string;
  sections: LessonSection[];
  practicalExercise: { title: string; description: string; steps: string[]; expectedResult: string };
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  conclusion: string;
}

// ─── Modules ─────────────────────────────────────────────────────────────────

const MODULES: ModuleDef[] = [
  {
    id: 1, niveau: 1, couleur: '#4caf50',
    titre: 'Le Poids Mystique',
    description: "Maîtrise le calcul et l'interprétation du poids mystique islamique",
    lessons: [
      { id: 'm1l1', title: 'La Table Abjad : Valeurs et Origines',       description: 'Découvre les valeurs numériques des 28 lettres arabes', topic: 'table abjad 28 lettres arabes valeurs numériques origines islamiques histoire', duration: '15 min' },
      { id: 'm1l2', title: 'Calculer son Poids Mystique',                  description: 'Méthode complète avec prénom, mère et genre',          topic: 'calcul poids mystique prénom mère genre bonus homme 52 femme 452 formule étapes', duration: '20 min' },
      { id: 'm1l3', title: 'Interpréter son Poids Mystique',               description: 'Les 4 éléments et leur signification spirituelle',     topic: 'interprétation poids mystique 4 éléments feu air terre eau personnalité destin modulo 4', duration: '20 min' },
    ],
  },
  {
    id: 2, niveau: 1, couleur: '#4caf50',
    titre: 'Les Carrés Magiques',
    description: 'Construis les 7 types de carrés magiques islamiques pas à pas',
    lessons: [
      { id: 'm2l1', title: 'Introduction aux Carrés Magiques',             description: 'Origines et types des carrés magiques islamiques',       topic: 'carrés magiques islamiques types 7 planètes saturne jupiter mars soleil vénus mercure lune origine', duration: '15 min' },
      { id: 'm2l2', title: 'Le Carré 3×3 Moussalas (Saturne)',             description: 'Algorithme complet du carré de Saturne pas à pas',       topic: 'carré 3x3 moussalas saturne subtract 12 divisor 3 layout threshold formule construction somme', duration: '25 min' },
      { id: 'm2l3', title: 'Les Grands Carrés 4×4 à 9×9',                  description: 'Technique avancée pour tous les types de carrés',        topic: 'carrés 4x4 5x5 6x6 7x7 8x8 9x9 mourabbah moukhams moussadis moussabbia mouthammin moutassiou', duration: '30 min' },
    ],
  },
  {
    id: 3, niveau: 1, couleur: '#4caf50',
    titre: 'La Science des Lettres',
    description: "Comprends les secrets de l'Ilm al-Huruf et ses applications",
    lessons: [
      { id: 'm3l1', title: "L'Ilm al-Huruf : Science des Lettres",         description: 'Fondements de la science islamique des lettres',          topic: 'ilm al huruf science lettres mystiques islamiques fondements signification spirituelle lettres', duration: '20 min' },
      { id: 'm3l2', title: 'Les Noms Divins (Asma al-Husna)',               description: "Les 99 noms de Dieu et leur usage spirituel",             topic: "asma husna 99 noms divins Allah يا règle sans ال talisman invocation pratique", duration: '20 min' },
      { id: 'm3l3', title: 'Construire une Invocation Personnalisée',        description: 'Compose une invocation avec les noms arabes',            topic: 'invocation personnalisée prénom arabe mère noms divins verset construction ibn bint poids mystique', duration: '25 min' },
    ],
  },
  {
    id: 4, niveau: 2, couleur: '#f9a825',
    titre: 'La Géomancie Africaine',
    description: "Maîtrise l'art de la géomancie islamique ouest-africaine",
    lessons: [
      { id: 'm4l1', title: 'Les 16 Figures Géomantiques',                  description: 'Connais et mémorise les 16 figures et leurs sens',        topic: '16 figures géomantiques noms arabes bambara éléments nature influence feu terre air eau signification', duration: '20 min' },
      { id: 'm4l2', title: 'Construire un Thème Géomantique',              description: 'Mères, filles, nièces, témoins et juge',                 topic: 'thème géomantique mères filles nièces témoins juge réconciliateur 16 maisons construction méthode', duration: '25 min' },
      { id: 'm4l3', title: 'Interpréter un Thème Géomantique',             description: 'Lecture complète des 16 maisons et synthèse',            topic: 'interprétation thème géomantique 16 maisons clés santé amour argent juge synthèse réponse', duration: '30 min' },
    ],
  },
  {
    id: 5, niveau: 2, couleur: '#f9a825',
    titre: "L'Interprétation des Rêves",
    description: "Maîtrise la science du Tabir selon la tradition islamique",
    lessons: [
      { id: 'm5l1', title: "Fondements du Tabir al-Ru'ya",                  description: "Les bases de l'interprétation islamique des rêves",       topic: "tabir ruya interprétation rêves islamique ibn sirin fondements types bons mauvais vérité", duration: '15 min' },
      { id: 'm5l2', title: 'Les Grands Symboles Oniriques',                 description: 'Eau, feu, lumière, serpent, maison et leur sens',          topic: 'symboles rêves eau feu lumière serpent mort mariage maison animaux arbres signification islamique', duration: '25 min' },
      { id: 'm5l3', title: "Méthode d'Interprétation Complète",              description: 'De la nature du rêve à la vision spirituelle',            topic: 'méthode interprétation rêve nature état actuel symboles vision spirituelle nom divin plante sacrifice', duration: '25 min' },
    ],
  },
  {
    id: 6, niveau: 2, couleur: '#f9a825',
    titre: 'Les Plantes Mystiques',
    description: "Connais et utilise les plantes sacrées d'Afrique de l'Ouest",
    lessons: [
      { id: 'm6l1', title: "Les Plantes Sacrées d'Afrique",                 description: 'Catalogue des principales plantes mystiques africaines',   topic: 'plantes mystiques africaines neem karité baobab moringa kinkeliba propriétés noms bambara scientifiques', duration: '20 min' },
      { id: 'm6l2', title: 'Préparer une Décoction Mystique',               description: 'Technique complète du bain rituel aux plantes',            topic: 'décoction mystique bain rituel plantes préparation eau bouillir filtrer mélange talisman lavage durée', duration: '20 min' },
      { id: 'm6l3', title: 'Les Rituels de Guérison par les Plantes',       description: 'Protocoles complets de guérison mystique',                 topic: 'guérison plantes rituels boire laver protocole verset invocation durée jours éviter isGuerisson', duration: '25 min' },
    ],
  },
  {
    id: 7, niveau: 3, couleur: '#e53935',
    titre: 'Les Talismans et Rituels',
    description: 'Crée et utilise des talismans mystiques efficaces',
    lessons: [
      { id: 'm7l1', title: "L'Art du Talisman (Hijab)",                     description: 'Fondements et types de talismans islamiques',               topic: 'talisman hijab types islamiques tablette bois encre naturelle safran charbon écriture arabe étapes', duration: '25 min' },
      { id: 'm7l2', title: 'Écrire et Activer un Talisman',                 description: "Protocole complet d'écriture et d'activation rituelle",     topic: 'écriture talisman bismillah salat verset carré magique noms arabes bain eau activation rituel', duration: '30 min' },
      { id: 'm7l3', title: 'Le Zikr et les Répétitions Mystiques',          description: 'Science du zikr et des répétitions',                        topic: 'zikr répétitions mystiques bismillah astaghfirullah salat nabi noms divins invocation 7 41 99 100 harakat', duration: '25 min' },
    ],
  },
  {
    id: 8, niveau: 3, couleur: '#e53935',
    titre: 'Les Rituels de Protection',
    description: 'Maîtrise les techniques de protection et de désenvoutement',
    lessons: [
      { id: 'm8l1', title: "Comprendre le Mauvais Oeil et l'Envoûtement",   description: "Nature et mécanismes du 'ain et du sihr",                  topic: "mauvais oeil ain sihr envoûtement types islamique causes mécanismes protection ruqyah", duration: '20 min' },
      { id: 'm8l2', title: 'Les Versets de Protection',                      description: 'Ayat al-Kursi, Muawwidhatain et leur puissance',            topic: 'versets protection ayat kursi muawwidhatain surate baqara ikhlas falaq nass lecture talisman', duration: '20 min' },
      { id: 'm8l3', title: 'Rituel Complet de Désenvoutement',               description: 'Protocole de ruqyah et purification mystique',             topic: 'ruqyah désenvoutement rituel plantes verset bain invocation durée 7 jours récitation huile olive', duration: '30 min' },
    ],
  },
  {
    id: 9, niveau: 3, couleur: '#e53935',
    titre: 'Maîtrise Totale',
    description: 'Intègre toutes les sciences mystiques islamiques en un système complet',
    lessons: [
      { id: 'm9l1', title: 'Synthèse des Sciences Mystiques',               description: 'Combiner poids, carrés, plantes et invocations',           topic: 'synthèse sciences mystiques poids mystique carrés plantes invocations combinaison système complet intégration', duration: '30 min' },
      { id: 'm9l2', title: 'Cas Pratiques Avancés',                         description: 'Résoudre des problèmes complexes avec toutes les techniques', topic: 'cas pratiques avancés mariage argent protection santé voyage combinaison techniques mystiques complètes', duration: '35 min' },
      { id: 'm9l3', title: 'Éthique et Voie du Mysticisme Islamique',       description: 'Responsabilité et éthique du praticien mystique',          topic: 'éthique mysticisme islamique responsabilité pratiquant règles intention niya sincérité barakah bénédiction', duration: '30 min' },
    ],
  },
];

const TOTAL_LESSONS = MODULES.reduce((s, m) => s + m.lessons.length, 0);

// ─── Gemini ───────────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_25  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

function buildPrompt(mod: ModuleDef, lesson: LessonDef): string {
  return `Tu es un maître enseignant de la mystique islamique ouest-africaine. Tu expliques avec clarté, profondeur et pédagogie en français.

Module : ${mod.titre}
Leçon : ${lesson.title}
Sujet : ${lesson.topic}
Niveau : Niveau ${mod.niveau}

Génère une leçon complète. Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "title": "${lesson.title}",
  "introduction": "2-3 phrases d'introduction captivantes sur ce que l'élève va apprendre.",
  "sections": [
    {
      "title": "Titre de la Section 1",
      "content": "Contenu détaillé en 3-4 paragraphes. Utilise des exemples concrets.",
      "arabicContent": "Contenu arabe avec exemples si pertinent pour la leçon. Sinon null.",
      "keyPoints": ["Point essentiel 1", "Point essentiel 2", "Point essentiel 3"]
    },
    {
      "title": "Titre de la Section 2",
      "content": "Contenu détaillé en 3-4 paragraphes.",
      "arabicContent": null,
      "keyPoints": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "title": "Titre de la Section 3",
      "content": "Contenu détaillé et pratique.",
      "arabicContent": null,
      "keyPoints": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "practicalExercise": {
    "title": "Titre de l'exercice pratique",
    "description": "Description claire de l'exercice que l'élève va faire.",
    "steps": ["Étape 1 concrète", "Étape 2", "Étape 3", "Étape 4"],
    "expectedResult": "Résultat précis attendu avec chiffres ou données concrètes."
  },
  "quiz": [
    { "question": "Question 1 sur le sujet ?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctIndex": 0, "explanation": "Explication détaillée de la bonne réponse." },
    { "question": "Question 2 ?", "options": ["A", "B", "C", "D"], "correctIndex": 2, "explanation": "Explication." },
    { "question": "Question 3 ?", "options": ["A", "B", "C", "D"], "correctIndex": 1, "explanation": "Explication." },
    { "question": "Question 4 ?", "options": ["A", "B", "C", "D"], "correctIndex": 3, "explanation": "Explication." },
    { "question": "Question 5 ?", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "Explication." }
  ],
  "conclusion": "2-3 phrases de conclusion encourageantes pour l'élève. Félicite-le pour son apprentissage."
}

RÈGLES QUIZ : 5 questions obligatoires. Exactement 4 options chacune. correctIndex entre 0 et 3. Questions variées testant la compréhension réelle.`;
}

async function callGemini(prompt: string, retries = 1): Promise<LessonContent> {
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
  try { return JSON.parse(clean) as LessonContent; }
  catch {
    if (retries > 0) return callGemini(prompt, retries - 1);
    throw new Error('Contenu invalide. Réessaie.');
  }
}

// ─── Unlock logic ─────────────────────────────────────────────────────────────

function isModuleUnlocked(moduleId: number, completed: Set<string>): boolean {
  if (moduleId === 1) return true;
  const prev = MODULES.find(m => m.id === moduleId - 1);
  return !!prev && prev.lessons.every(l => completed.has(l.id));
}

function isLessonUnlocked(lessonIdx: number, mod: ModuleDef, completed: Set<string>): boolean {
  if (!isModuleUnlocked(mod.id, completed)) return false;
  if (lessonIdx === 0) return true;
  return completed.has(mod.lessons[lessonIdx - 1].id);
}

function getNiveauColor(n: 1 | 2 | 3): string { return n === 1 ? '#4caf50' : n === 2 ? '#f9a825' : '#e53935'; }
function getNiveauLabel(n: 1 | 2 | 3): string { return n === 1 ? 'Fondamentaux' : n === 2 ? 'Pratique' : 'Expert'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sep() {
  return <div style={{ textAlign: 'center', color: 'rgba(249,168,37,0.4)', margin: '24px 0', letterSpacing: '6px', fontSize: '0.85rem' }}>——— ✦ ———</div>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '20px', ...style }}>{children}</div>;
}

function STitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span>✦</span><span>{children}</span>
    </div>
  );
}

function StepNum({ n }: { n: number }) {
  return <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f9a825', color: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{n}</div>;
}

function GlobalBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.9rem' }}>Progression globale</span>
        <span style={{ color: '#b0b8d4', fontSize: '0.88rem' }}>{completed}/{total} leçons</span>
      </div>
      <div style={{ background: '#1a237e', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #f9a825, #ff6f00)', borderRadius: '8px', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ textAlign: 'right', color: '#f9a825', fontSize: '0.8rem', marginTop: '4px', fontWeight: '700' }}>{pct}%</div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function FormationPage() {
  const [view, setView] = useState<'home' | 'module' | 'lesson'>('home');
  const [selMod,  setSelMod]  = useState<ModuleDef | null>(null);
  const [selLes,  setSelLes]  = useState<LessonDef | null>(null);
  const [lesIdx,  setLesIdx]  = useState(0);

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [progLoading, setProgLoading] = useState(true);

  const [content,    setContent]    = useState<LessonContent | null>(null);
  const [lesLoading, setLesLoading] = useState(false);
  const [lesError,   setLesError]   = useState('');
  const [phase, setPhase] = useState<'content' | 'quiz' | 'results'>('content');

  const [answers, setAnswers]   = useState<(number | null)[]>([null, null, null, null, null]);
  const [score,   setScore]     = useState(0);
  const [newUnlock, setNewUnlock] = useState<ModuleDef | null>(null);

  const [balance,       setBalance]       = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => { loadProgress(); }, []);

  async function loadProgress() {
    setProgLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('formation_progress').select('completed_lessons').eq('user_id', user.id).single();
      const arr = (data as { completed_lessons: string[] } | null)?.completed_lessons ?? [];
      setCompleted(new Set(arr));
    } catch { /* table may not exist yet */ }
    finally { setProgLoading(false); }
  }

  async function saveProgress(newSet: Set<string>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('formation_progress').upsert({
        user_id: user.id,
        completed_lessons: [...newSet],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch { /* silent */ }
  }

  async function openLesson(mod: ModuleDef, lesson: LessonDef, idx: number) {
    setSelMod(mod); setSelLes(lesson); setLesIdx(idx);
    setView('lesson');
    setContent(null); setLesError('');
    setPhase('content');
    setAnswers([null, null, null, null, null]);
    setNewUnlock(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const cacheKey = `formation_${lesson.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setContent(JSON.parse(cached) as LessonContent); return; }

    const isReview = completed.has(lesson.id);
    setLesLoading(true);

    let bal = 0;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLesError('Connecte-toi pour accéder aux leçons.'); return; }

      if (!isReview) {
        const { data: creditData } = await supabase
          .from('user_credits').select('balance').eq('user_id', user.id).single();
        bal = (creditData as { balance: number } | null)?.balance ?? 0;
        if (bal < 2) { setBalance(bal); setShowCreditModal(true); setView('module'); return; }

        await supabase.from('user_credits')
          .update({ balance: bal - 2, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        await supabase.from('credit_transactions').insert({
          user_id: user.id, type: 'use', amount: -2, tool: 'formation',
          balance_after: bal - 2, description: `Formation — ${lesson.title}`,
        });
      }

      const data = await callGemini(buildPrompt(mod, lesson));
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      setContent(data);
    } catch (err) {
      if (!isReview && bal > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_credits')
            .update({ balance: bal, updated_at: new Date().toISOString() }).eq('user_id', user.id);
          await supabase.from('credit_transactions').insert({
            user_id: user.id, type: 'refund', amount: 2, tool: 'formation',
            balance_after: bal, description: `Remboursement — ${lesson.title} (erreur IA)`,
          });
        }
      }
      setLesError((err as Error).message || 'Erreur de chargement. Réessaie.');
    } finally { setLesLoading(false); }
  }

  async function submitQuiz() {
    if (!content || !selLes || !selMod) return;
    const correct = answers.filter((a, i) => a === content.quiz[i].correctIndex).length;
    const sc = Math.round((correct / content.quiz.length) * 100);
    setScore(sc);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (sc >= 80 && !completed.has(selLes.id)) {
      const newSet = new Set(completed);
      newSet.add(selLes.id);
      setCompleted(newSet);
      await saveProgress(newSet);

      const nextMod = MODULES.find(m => m.id === selMod.id + 1);
      if (nextMod) {
        const wasLocked = !isModuleUnlocked(nextMod.id, completed);
        const nowUnlocked = isModuleUnlocked(nextMod.id, newSet);
        if (wasLocked && nowUnlocked) setNewUnlock(nextMod);
      }
    }
  }

  const GOLD  = '#f9a825';
  const BG    = '#0a0e2e';
  const CARD  = '#111a55';
  const GREY  = '#b0b8d4';
  const completedCount = completed.size;

  // ── VIEW: HOME ──────────────────────────────────────────────────────────────

  if (view === 'home') {
    const LEVELS: (1 | 2 | 3)[] = [1, 2, 3];
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} .mod-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px} @media(max-width:860px){.mod-grid{grid-template-columns:repeat(2,1fr)}} @media(max-width:560px){.mod-grid{grid-template-columns:1fr}}`}</style>
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 16px 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ color: GOLD, fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>Formation Mystique</h1>
            <p style={{ color: GREY, fontStyle: 'italic', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6' }}>
              9 modules progressifs sur 3 niveaux pour maîtriser les sciences mystiques islamiques
            </p>
          </div>

          {progLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: GOLD }}>Chargement de ta progression...</div>
          ) : (
            <>
              <GlobalBar completed={completedCount} total={TOTAL_LESSONS} />
              <Sep />

              {LEVELS.map(niv => {
                const mods = MODULES.filter(m => m.niveau === niv);
                const nivColor = getNiveauColor(niv);
                const nivLabel = getNiveauLabel(niv);
                const nivLocked = niv > 1 && !isModuleUnlocked(mods[0].id, completed);
                return (
                  <div key={niv} style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                      <div style={{ color: nivColor, fontWeight: '700', fontSize: '1.1rem' }}>Niveau {niv} — {nivLabel}</div>
                      {nivLocked && <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: GREY, padding: '2px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>VERROUILLÉ</span>}
                      <div style={{ flex: 1, height: '1px', background: `${nivColor}33` }} />
                    </div>
                    <div className="mod-grid">
                      {mods.map(mod => {
                        const modUnlocked = isModuleUnlocked(mod.id, completed);
                        const doneCount   = mod.lessons.filter(l => completed.has(l.id)).length;
                        const pct = Math.round((doneCount / mod.lessons.length) * 100);
                        return (
                          <div key={mod.id}
                            onClick={() => modUnlocked && (setSelMod(mod), setView('module'), window.scrollTo({ top: 0, behavior: 'smooth' }))}
                            style={{ background: CARD, border: `1px solid ${modUnlocked ? mod.couleur + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', overflow: 'hidden', opacity: modUnlocked ? 1 : 0.5, cursor: modUnlocked ? 'pointer' : 'not-allowed', animation: 'fadeIn 0.4s ease' }}>
                            <div style={{ background: modUnlocked ? `${mod.couleur}22` : '#ffffff0a', borderBottom: `2px solid ${modUnlocked ? mod.couleur : '#ffffff15'}`, padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <div style={{ color: modUnlocked ? mod.couleur : GREY, fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Module {mod.id}</div>
                                <div style={{ color: GREY, fontSize: '0.75rem' }}>{doneCount}/{mod.lessons.length}</div>
                              </div>
                              <div style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1rem', lineHeight: '1.35', marginBottom: '8px' }}>{mod.titre}</div>
                              <div style={{ background: '#0a0e2e55', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: mod.couleur, transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                              <p style={{ color: GREY, fontSize: '0.82rem', lineHeight: '1.5', margin: '0 0 10px' }}>{mod.description}</p>
                              {!modUnlocked && <div style={{ color: GREY, fontSize: '0.75rem', fontStyle: 'italic' }}>Complète le module {mod.id - 1} pour déverrouiller</div>}
                              {modUnlocked && doneCount < mod.lessons.length && <div style={{ color: mod.couleur, fontSize: '0.78rem', fontWeight: '600' }}>{mod.lessons.length - doneCount} leçon{mod.lessons.length - doneCount > 1 ? 's' : ''} restante{mod.lessons.length - doneCount > 1 ? 's' : ''}</div>}
                              {modUnlocked && doneCount === mod.lessons.length && <div style={{ color: '#4caf50', fontSize: '0.78rem', fontWeight: '700' }}>Complété</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {niv < 3 && <Sep />}
                  </div>
                );
              })}
            </>
          )}
        </div>
        {showCreditModal && <CreditModal toolName="la Formation" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />}
      </div>
    );
  }

  // ── VIEW: MODULE ─────────────────────────────────────────────────────────────

  if (view === 'module' && selMod) {
    const modDone = selMod.lessons.filter(l => completed.has(l.id)).length;
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 60px' }}>
          <button onClick={() => setView('home')} style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem', marginBottom: '24px' }}>
            Retour aux modules
          </button>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: selMod.couleur, fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Niveau {selMod.niveau} — Module {selMod.id}</div>
            <h1 style={{ color: GOLD, fontWeight: '700', fontSize: '1.8rem', marginBottom: '10px' }}>{selMod.titre}</h1>
            <p style={{ color: GREY, lineHeight: '1.6', marginBottom: '16px' }}>{selMod.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: GREY, fontSize: '0.82rem' }}>Progression du module</span>
              <span style={{ color: GOLD, fontWeight: '700', fontSize: '0.82rem' }}>{modDone}/{selMod.lessons.length}</span>
            </div>
            <div style={{ background: '#1a237e', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((modDone / selMod.lessons.length) * 100)}%`, height: '100%', background: selMod.couleur, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <Sep />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selMod.lessons.map((lesson, idx) => {
              const unlocked = isLessonUnlocked(idx, selMod, completed);
              const done = completed.has(lesson.id);
              return (
                <div key={lesson.id} style={{ background: CARD, border: `1px solid ${done ? '#4caf5055' : unlocked ? `${selMod.couleur}44` : 'rgba(255,255,255,0.06)'}`, borderRadius: '8px', padding: '18px', opacity: unlocked ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ color: GREY, fontSize: '0.75rem' }}>Leçon {idx + 1}</span>
                        {done && <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4caf50', color: '#4caf50', padding: '1px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>Complétée</span>}
                        {!unlocked && <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: GREY, padding: '1px 10px', borderRadius: '10px', fontSize: '0.72rem' }}>Verrouillée</span>}
                      </div>
                      <div style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{lesson.title}</div>
                      <p style={{ color: GREY, fontSize: '0.82rem', lineHeight: '1.5', margin: 0 }}>{lesson.description}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: GREY, fontSize: '0.75rem', marginBottom: '10px' }}>{lesson.duration}</div>
                      {unlocked && (
                        <button onClick={() => openLesson(selMod, lesson, idx)}
                          style={{ background: done ? 'transparent' : GOLD, border: `1px solid ${done ? GOLD : GOLD}`, color: done ? GOLD : '#0a0e2e', fontWeight: '700', padding: '7px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {done ? 'Revoir' : 'Commencer — 2 crédits'}
                        </button>
                      )}
                    </div>
                  </div>
                  {!unlocked && idx > 0 && (
                    <div style={{ color: GREY, fontSize: '0.75rem', fontStyle: 'italic', marginTop: '6px' }}>
                      Complète la leçon {idx} pour déverrouiller
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {showCreditModal && <CreditModal toolName="la Formation" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />}
      </div>
    );
  }

  // ── VIEW: LESSON ─────────────────────────────────────────────────────────────

  if (view === 'lesson' && selMod && selLes) {
    const isReview = completed.has(selLes.id);

    function backToModule() {
      setView('module');
      setContent(null);
      setLesError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevLesson() {
      if (lesIdx > 0) openLesson(selMod, selMod.lessons[lesIdx - 1], lesIdx - 1);
    }
    function nextLesson() {
      if (lesIdx < selMod.lessons.length - 1) openLesson(selMod, selMod.lessons[lesIdx + 1], lesIdx + 1);
    }

    const allAnswered = answers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px 60px' }}>

          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <button onClick={backToModule} style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem', marginBottom: '18px' }}>
              Retour au module
            </button>
            <GlobalBar completed={completedCount} total={TOTAL_LESSONS} />
            <div style={{ color: selMod.couleur, fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Module {selMod.id} — Leçon {lesIdx + 1}
            </div>
            <h1 style={{ color: GOLD, fontWeight: '700', fontSize: '1.7rem', lineHeight: '1.3', marginBottom: '8px' }}>{selLes.title}</h1>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: GREY, fontSize: '0.8rem' }}>{selLes.duration}</span>
              <span style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid #4caf50', color: '#4caf50', padding: '2px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>GRATUIT</span>
              {isReview && <span style={{ background: 'rgba(249,168,37,0.12)', border: `1px solid ${GOLD}`, color: GOLD, padding: '2px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>Déjà complétée</span>}
            </div>
          </div>

          {/* Loading */}
          {lesLoading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: '48px', height: '48px', border: '3px solid rgba(249,168,37,0.2)', borderTop: `3px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 18px' }} />
              <div style={{ color: GOLD, fontWeight: '600' }}>Chargement de la leçon...</div>
            </div>
          )}

          {/* Error */}
          {lesError && !lesLoading && (
            <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid #e53935', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' }}>
              <p style={{ color: '#ef9a9a', margin: '0 0 14px', lineHeight: '1.6' }}>{lesError}</p>
              <button onClick={() => openLesson(selMod, selLes, lesIdx)}
                style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '9px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Réessayer
              </button>
            </div>
          )}

          {/* Content */}
          {content && !lesLoading && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>

              {/* Introduction */}
              <Sep />
              <p style={{ color: GOLD, fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center', fontSize: '1rem', marginBottom: '8px' }}>{content.introduction}</p>
              <Sep />

              {/* 3 Sections */}
              {content.sections.map((sec, si) => (
                <div key={si} style={{ marginBottom: '28px' }}>
                  <STitle>{sec.title}</STitle>
                  <p style={{ color: '#e8eaf6', lineHeight: '1.8', whiteSpace: 'pre-line', marginBottom: '16px' }}>{sec.content}</p>

                  {sec.arabicContent && (
                    <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '16px 20px', marginBottom: '14px' }}>
                      <div style={{ color: GOLD, fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em', direction: 'rtl', textAlign: 'right', lineHeight: '2' }}>{sec.arabicContent}</div>
                    </div>
                  )}

                  <div style={{ background: 'rgba(249,168,37,0.05)', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ color: GOLD, fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Points clés</div>
                    {sec.keyPoints.map((pt, i) => (
                      <div key={i} style={{ color: '#e8eaf6', fontSize: '0.92rem', lineHeight: '1.7', marginBottom: '4px' }}>
                        <span style={{ color: GOLD, marginRight: '8px' }}>✦</span>{pt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Sep />

              {/* Exercice pratique */}
              <div style={{ marginBottom: '28px' }}>
                <STitle>{content.practicalExercise.title}</STitle>
                <Card style={{ marginBottom: '14px' }}>
                  <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.7', margin: 0 }}>{content.practicalExercise.description}</p>
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {content.practicalExercise.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <StepNum n={i + 1} />
                      <div style={{ color: '#e8eaf6', lineHeight: '1.7', paddingTop: '4px', flex: 1 }}>{step}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(76,175,80,0.07)', border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '14px' }}>
                  <span style={{ color: GOLD, fontWeight: '700' }}>Résultat attendu : </span>
                  <span style={{ color: '#e8eaf6', fontWeight: '600' }}>{content.practicalExercise.expectedResult}</span>
                </div>
              </div>

              <Sep />

              {/* Conclusion */}
              <p style={{ color: GOLD, fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center', marginBottom: '28px' }}>{content.conclusion}</p>

              {/* Quiz ou mode révision */}
              {isReview && phase === 'content' ? (
                <div style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid #4caf50', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ color: '#4caf50', fontWeight: '700', fontSize: '1rem', marginBottom: '8px' }}>Leçon déjà complétée avec succès</div>
                  <p style={{ color: GREY, margin: 0, fontSize: '0.88rem' }}>Tu peux passer à la leçon suivante ou revoir le contenu à volonté.</p>
                </div>
              ) : phase === 'content' ? (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => setPhase('quiz')}
                    style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', fontSize: '1rem', padding: '14px 36px', border: 'none', borderRadius: '4px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                    Commencer le Quiz
                  </button>
                </div>
              ) : phase === 'quiz' ? (

                // ── QUIZ ──────────────────────────────────────────────────────
                <div>
                  <div style={{ color: GOLD, fontWeight: '700', fontSize: '1.1rem', textAlign: 'center', marginBottom: '20px' }}>
                    Quiz — 5 questions (80% minimum pour valider)
                  </div>
                  {content.quiz.map((q, qi) => (
                    <Card key={qi} style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#e8eaf6', fontWeight: '700', marginBottom: '14px', lineHeight: '1.5' }}>
                        <span style={{ color: GOLD }}>Q{qi + 1}. </span>{q.question}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {q.options.map((opt, oi) => (
                          <div key={oi} onClick={() => {
                            const newA = [...answers];
                            newA[qi] = oi;
                            setAnswers(newA);
                          }} style={{ padding: '10px 14px', borderRadius: '4px', cursor: 'pointer', border: `1px solid ${answers[qi] === oi ? GOLD : 'rgba(249,168,37,0.2)'}`, background: answers[qi] === oi ? 'rgba(249,168,37,0.12)' : '#0a0e2e', color: '#e8eaf6', fontSize: '0.92rem', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${answers[qi] === oi ? GOLD : GREY}`, background: answers[qi] === oi ? GOLD : 'transparent', flexShrink: 0 }} />
                            {opt}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button onClick={submitQuiz} disabled={!allAnswered}
                      style={{ background: allAnswered ? GOLD : '#333', color: allAnswered ? '#0a0e2e' : '#888', fontWeight: '700', fontSize: '1rem', padding: '13px 36px', border: 'none', borderRadius: '4px', cursor: allAnswered ? 'pointer' : 'not-allowed', letterSpacing: '0.5px' }}>
                      Soumettre mes réponses
                    </button>
                  </div>
                </div>

              ) : (

                // ── RÉSULTATS ────────────────────────────────────────────────
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ color: score >= 80 ? '#4caf50' : '#e53935', fontWeight: '700', fontSize: '3rem', marginBottom: '8px' }}>{score}/100</div>
                    {score >= 80 ? (
                      <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4caf50', color: '#4caf50', padding: '6px 20px', borderRadius: '20px', fontWeight: '700' }}>Leçon validée</span>
                    ) : (
                      <span style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid #e53935', color: '#ef9a9a', padding: '6px 20px', borderRadius: '20px', fontWeight: '700' }}>Score insuffisant — 80% requis</span>
                    )}
                  </div>

                  {newUnlock && (
                    <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ color: '#4caf50', fontWeight: '700', marginBottom: '4px' }}>Nouveau module déverrouillé</div>
                      <div style={{ color: '#e8eaf6' }}>Module {newUnlock.id} — {newUnlock.titre}</div>
                    </div>
                  )}

                  <Sep />

                  {/* Feedback par question */}
                  <STitle>Résumé complet des réponses</STitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {content.quiz.map((q, qi) => {
                      const correct = answers[qi] === q.correctIndex;
                      return (
                        <div key={qi} style={{ background: correct ? 'rgba(76,175,80,0.07)' : 'rgba(229,57,53,0.07)', border: `1px solid ${correct ? '#4caf5055' : '#e5393555'}`, borderRadius: '6px', padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ color: '#e8eaf6', fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.4' }}><span style={{ color: GOLD }}>Q{qi + 1}. </span>{q.question}</div>
                            <span style={{ color: correct ? '#4caf50' : '#e53935', fontWeight: '700', fontSize: '0.82rem', flexShrink: 0 }}>{correct ? 'Correct' : 'Incorrect'}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: GREY, marginBottom: '4px' }}>Ta réponse : <span style={{ color: correct ? '#4caf50' : '#ef9a9a', fontWeight: '600' }}>{q.options[answers[qi] ?? 0]}</span></div>
                          {!correct && <div style={{ fontSize: '0.82rem', color: GREY, marginBottom: '6px' }}>Bonne réponse : <span style={{ color: '#4caf50', fontWeight: '600' }}>{q.options[q.correctIndex]}</span></div>}
                          <div style={{ color: GREY, fontSize: '0.82rem', lineHeight: '1.6', fontStyle: 'italic' }}>{q.explanation}</div>
                        </div>
                      );
                    })}
                  </div>

                  <Sep />

                  {score < 80 ? (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: GREY, fontStyle: 'italic', marginBottom: '16px' }}>Relis le contenu et réessaie. Tu peux le faire !</p>
                      <button onClick={() => { setPhase('quiz'); setAnswers([null, null, null, null, null]); }}
                        style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '12px 28px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        Réessayer le quiz
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: GOLD, fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center', marginBottom: '8px' }}>
                      Félicitations ! Tu as maîtrisé cette leçon. Continue sur ta lancée et passe à la suivante !
                    </p>
                  )}
                </div>
              )}

              <Sep />

              {/* Navigation leçons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {lesIdx > 0 && (
                  <button onClick={prevLesson}
                    style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '9px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem' }}>
                    Leçon précédente
                  </button>
                )}
                <button onClick={backToModule}
                  style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '9px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  Retour au module
                </button>
                {lesIdx < selMod.lessons.length - 1 && isLessonUnlocked(lesIdx + 1, selMod, completed) && (
                  <button onClick={nextLesson}
                    style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '9px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem' }}>
                    Leçon suivante
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
        {showCreditModal && <CreditModal toolName="la Formation" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />}
      </div>
    );
  }

  return null;
}
