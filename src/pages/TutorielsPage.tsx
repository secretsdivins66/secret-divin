import { useState } from 'react';
import { AudioButton } from '../components/AudioButton';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Tutoriel {
  id: number;
  categorie: string;
  titre: string;
  description: string;
  niveau: 'Débutant' | 'Intermédiaire' | 'Expert';
  duree: string;
  topic: string;
}

interface TutorialSection {
  title: string;
  content: string;
  steps: string[] | null;
  arabicContent: string | null;
  tip: string | null;
  warning: string | null;
}

interface TutorialData {
  title: string;
  introduction: string;
  sections: TutorialSection[];
  example: { title: string; scenario: string; steps: string[]; result: string };
  keyTakeaways: string[];
  commonMistakes: { mistake: string; correction: string }[];
  nextSteps: string;
  relatedTopics: string[];
  conclusion: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TUTORIELS: Tutoriel[] = [
  { id: 1,  categorie: 'Poids mystique',      niveau: 'Débutant',      duree: '5 min',  titre: 'Comment calculer ton poids mystique ?',            description: "Apprends à utiliser la table Abjad pour calculer le poids mystique de n'importe quel nom.", topic: 'calcul poids mystique table abjad nom prénom' },
  { id: 2,  categorie: 'Poids mystique',      niveau: 'Débutant',      duree: '7 min',  titre: 'Comprendre le sens de ton poids mystique',        description: 'Découvre ce que révèle ton poids mystique sur ta personnalité et ton destin.',                topic: 'signification poids mystique personnalité destin élément' },
  { id: 3,  categorie: 'Carrés magiques',     niveau: 'Débutant',      duree: '10 min', titre: 'Construire un carré 3x3 Moussalas',                description: 'Guide pas à pas pour créer un carré magique 3x3 à partir de ton poids mystique.',            topic: 'carré magique 3x3 moussalas construction étapes poids mystique formule subtract divisor' },
  { id: 4,  categorie: 'Carrés magiques',     niveau: 'Intermédiaire', duree: '12 min', titre: 'Construire un carré 4x4 Mourabbah',                description: "Apprends à créer le carré 4x4 Mourabbah avec la méthode exacte islamique.",                  topic: 'carré magique 4x4 mourabbah construction reste correction threshold layout' },
  { id: 5,  categorie: 'Carrés magiques',     niveau: 'Expert',        duree: '20 min', titre: 'Les carrés magiques avancés 5x5 à 9x9',            description: 'Maîtrise la construction des grands carrés magiques islamiques.',                             topic: 'carrés magiques avancés 5x5 6x6 7x7 8x8 9x9 moukhams moussadis moussabbia mouthammin moutassiou formule' },
  { id: 6,  categorie: 'Géomancie',           niveau: 'Débutant',      duree: '8 min',  titre: 'Introduction à la géomancie africaine',            description: 'Découvre les bases de la géomancie islamique ouest-africaine et les 16 figures.',             topic: 'géomancie africaine islamique 16 figures introduction bases maisons thème' },
  { id: 7,  categorie: 'Géomancie',           niveau: 'Intermédiaire', duree: '15 min', titre: 'Lire un thème géomantique complet',                description: 'Apprends à construire et interpréter un thème géomantique complet avec les 16 maisons.',   topic: 'thème géomantique 16 maisons mères filles nièces témoins juge réconciliateur interprétation' },
  { id: 8,  categorie: 'Rêves',               niveau: 'Débutant',      duree: '8 min',  titre: "Les bases de l'interprétation islamique des rêves", description: "Découvre la science du Tabir al-ru'ya selon Ibn Sirin et la tradition africaine.",            topic: "interprétation rêves islamique tabir ruya ibn sirin types symboles bons mauvais" },
  { id: 9,  categorie: 'Rêves',               niveau: 'Intermédiaire', duree: '12 min', titre: 'Les symboles principaux dans les rêves',           description: 'Comprends la signification des symboles les plus courants dans les rêves islamiques.',       topic: 'symboles rêves eau feu maison serpent mort lumière mariage signification islamique africaine' },
  { id: 10, categorie: 'Secrets mystiques',   niveau: 'Intermédiaire', duree: '10 min', titre: 'Les noms divins dans la pratique mystique',        description: 'Apprends à utiliser les 99 noms de Dieu dans les talismans et invocations.',                 topic: 'noms divins asma husna 99 noms talisman invocation usage mystique يا règle sans ال' },
  { id: 11, categorie: 'Secrets mystiques',   niveau: 'Expert',        duree: '15 min', titre: 'Construire une invocation personnalisée',           description: 'Guide complet pour créer une invocation mystique personnalisée avec les noms arabes.',       topic: 'invocation personnalisée prénom arabe mère noms divins verset construction poids mystique ibn bint' },
  { id: 12, categorie: 'Plantes mystiques',   niveau: 'Débutant',      duree: '10 min', titre: "Les plantes sacrées d'Afrique de l'Ouest",        description: 'Découvre les principales plantes mystiques africaines et leurs usages spirituels.',           topic: 'plantes mystiques africaines neem karité baobab moringa propriétés spirituelles bambara noms scientifiques' },
  { id: 13, categorie: 'Plantes mystiques',   niveau: 'Intermédiaire', duree: '12 min', titre: 'Préparer un bain mystique avec les plantes',       description: 'Apprends à préparer correctement une décoction mystique et un bain rituel efficace.',        topic: 'bain mystique plantes décoction préparation talisman rituel lavage jours durée' },
  { id: 14, categorie: 'Talismans et rituels',niveau: 'Intermédiaire', duree: '15 min', titre: 'Écrire un talisman sur une tablette en bois',      description: 'Guide complet pour écrire un talisman mystique avec encre naturelle sur tablette.',          topic: 'talisman tablette bois encre safran charbon écriture arabe bismillah salat verset carré magique ordre étapes' },
  { id: 15, categorie: 'Talismans et rituels',niveau: 'Intermédiaire', duree: '10 min', titre: 'Le zikr et les invocations pour le rituel',        description: 'Apprends à faire correctement le zikr quotidien pendant le rituel spirituel.',               topic: 'zikr invocations rituel astaghfirullah salat nabi noms divins verset ordre répétitions harakat' },
];

const CATEGORIES = ['Tous', 'Poids mystique', 'Carrés magiques', 'Géomancie', 'Rêves', 'Secrets mystiques', 'Plantes mystiques', 'Talismans et rituels'];
const LEVELS     = ['Tous les niveaux', 'Débutant', 'Intermédiaire', 'Expert'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_25  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

function getLevelColor(niveau: string): string {
  if (niveau === 'Débutant')      return '#4caf50';
  if (niveau === 'Intermédiaire') return '#1565c0';
  return '#f9a825';
}

function buildPrompt(tut: Tutoriel): string {
  return `Tu es un maître enseignant de la mystique islamique ouest-africaine. Tu expliques de manière claire, pratique et pédagogique en français. Ton ton est sérieux, profond et accessible.

Tutoriel : ${tut.titre}
Catégorie : ${tut.categorie}
Niveau : ${tut.niveau}
Sujet : ${tut.topic}

Génère un tutoriel complet et pratique. Retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "title": "${tut.titre}",
  "introduction": "2-3 phrases d'introduction. Explique ce que l'utilisateur va apprendre et pourquoi c'est important.",
  "sections": [
    {
      "title": "Titre section 1",
      "content": "Explication claire en 3-4 paragraphes.",
      "steps": ["Étape 1 si applicable", "Étape 2", "Étape 3"],
      "arabicContent": "Contenu arabe si pertinent. Sinon null.",
      "tip": "Conseil pratique. Sinon null.",
      "warning": "Avertissement important si nécessaire. Sinon null."
    },
    {
      "title": "Titre section 2",
      "content": "Explication détaillée.",
      "steps": null,
      "arabicContent": null,
      "tip": "Conseil pratique.",
      "warning": null
    },
    {
      "title": "Titre section 3",
      "content": "Explication détaillée.",
      "steps": null,
      "arabicContent": null,
      "tip": null,
      "warning": null
    }
  ],
  "example": {
    "title": "Exemple pratique complet",
    "scenario": "Description du scénario de l'exemple concret.",
    "steps": ["Étape 1 de l'exemple", "Étape 2", "Étape 3", "Étape 4"],
    "result": "Résultat final de l'exemple avec chiffres ou données concrètes."
  },
  "keyTakeaways": ["Point essentiel 1 à retenir", "Point essentiel 2", "Point essentiel 3", "Point essentiel 4"],
  "commonMistakes": [
    {"mistake": "Erreur courante 1", "correction": "Comment l'éviter et faire correctement."},
    {"mistake": "Erreur courante 2", "correction": "Comment corriger."}
  ],
  "nextSteps": "2-3 phrases sur ce que l'utilisateur peut faire ensuite pour approfondir ses connaissances.",
  "relatedTopics": ["Sujet lié 1", "Sujet lié 2", "Sujet lié 3"],
  "conclusion": "2-3 phrases de conclusion encourageantes."
}`;
}

async function callGemini(prompt: string, retries = 1): Promise<TutorialData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    }),
  });
  const d = await res.json();
  const raw = (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '') as string;
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean) as TutorialData; }
  catch {
    if (retries > 0) return callGemini(prompt, retries - 1);
    throw new Error('Contenu invalide. Veuillez réessayer.');
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sep() {
  return (
    <div style={{ textAlign: 'center', color: 'rgba(249,168,37,0.4)', margin: '24px 0', letterSpacing: '6px', fontSize: '0.85rem' }}>
      ——— ✦ ———
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span>✦</span><span>{children}</span>
    </div>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f9a825', color: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{n}</div>
  );
}

function LevelBadge({ niveau }: { niveau: string }) {
  const color = getLevelColor(niveau);
  return (
    <span style={{ background: `${color}22`, border: `1px solid ${color}`, color, padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '700' }}>
      {niveau}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function TutorielsPage() {
  const [search,       setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [activeLevel,  setActiveLevel]  = useState('Tous les niveaux');
  const [hoveredId,    setHoveredId]    = useState<number | null>(null);
  const [selectedTut,  setSelectedTut]  = useState<Tutoriel | null>(null);
  const [tutData,      setTutData]      = useState<TutorialData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const filtered = TUTORIELS.filter(t => {
    const q = search.toLowerCase();
    const matchSearch  = !q || t.titre.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchCat     = activeCategory === 'Tous' || t.categorie === activeCategory;
    const matchLevel   = activeLevel === 'Tous les niveaux' || t.niveau === activeLevel;
    return matchSearch && matchCat && matchLevel;
  });

  async function loadTutorial(tut: Tutoriel) {
    setSelectedTut(tut);
    setTutData(null);
    setError('');
    setLoading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const key = `tutoriel_${tut.id}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setTutData(JSON.parse(cached) as TutorialData);
      setLoading(false);
      return;
    }
    try {
      const data = await callGemini(buildPrompt(tut));
      sessionStorage.setItem(key, JSON.stringify(data));
      setTutData(data);
    } catch (err) {
      setError((err as Error).message || 'Erreur de chargement. Réessaie.');
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setSelectedTut(null);
    setTutData(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const currentIdx = selectedTut ? TUTORIELS.findIndex(t => t.id === selectedTut.id) : -1;
  const prevTut    = currentIdx > 0 ? TUTORIELS[currentIdx - 1] : null;
  const nextTut    = currentIdx >= 0 && currentIdx < TUTORIELS.length - 1 ? TUTORIELS[currentIdx + 1] : null;

  const GOLD  = '#f9a825';
  const BG    = '#0a0e2e';
  const CARD  = '#111a55';
  const GREY  = '#b0b8d4';

  // ── Vue liste ─────────────────────────────────────────────────────────────

  if (!selectedTut) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
          .tut-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          @media (max-width: 900px) { .tut-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 560px) { .tut-grid { grid-template-columns: 1fr; } }
          .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
          .cat-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 60px' }}>

          {/* En-tête */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ color: GOLD, fontWeight: '700', fontSize: '2rem', marginBottom: '10px' }}>Tutoriels</h1>
            <p style={{ color: GREY, fontStyle: 'italic', maxWidth: '400px', margin: '0 auto 16px', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Apprends les sciences mystiques islamiques pas à pas avec nos tutoriels détaillés
            </p>
            <Sep />
            <span style={{ display: 'inline-block', background: 'rgba(76,175,80,0.12)', border: '1px solid #4caf50', color: '#4caf50', padding: '6px 20px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700' }}>
              GRATUIT — Accès illimité
            </span>
          </div>

          {/* Recherche */}
          <div style={{ marginBottom: '18px' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un tutoriel..."
              style={{ width: '100%', background: CARD, border: `1px solid rgba(249,168,37,0.3)`, color: '#e8eaf6', padding: '12px 16px', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box' }}
            />
          </div>

          <Sep />

          {/* Filtres catégorie */}
          <div className="cat-scroll" style={{ marginBottom: '14px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ whiteSpace: 'nowrap', padding: '7px 16px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: activeCategory === cat ? '700' : '500', cursor: 'pointer', border: `1px solid ${GOLD}`, background: activeCategory === cat ? GOLD : 'transparent', color: activeCategory === cat ? '#0a0e2e' : GOLD, flexShrink: 0, transition: 'all 0.15s' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Filtre niveau */}
          <div style={{ marginBottom: '28px' }}>
            <select value={activeLevel} onChange={e => setActiveLevel(e.target.value)}
              style={{ background: CARD, border: `1px solid rgba(249,168,37,0.3)`, color: '#e8eaf6', padding: '8px 14px', borderRadius: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span style={{ color: GREY, fontSize: '0.82rem', marginLeft: '12px' }}>
              {filtered.length} tutoriel{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grille */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: GREY, padding: '60px 20px', fontStyle: 'italic' }}>
              Aucun tutoriel ne correspond à ta recherche.
            </div>
          ) : (
            <div className="tut-grid">
              {filtered.map(tut => (
                <div key={tut.id}
                  onMouseEnter={() => setHoveredId(tut.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ background: CARD, border: hoveredId === tut.id ? `2px solid ${GOLD}` : '1px solid rgba(249,168,37,0.18)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: hoveredId === tut.id ? 'translateY(-4px)' : 'none', transition: 'all 0.2s ease', animation: 'fadeIn 0.4s ease' }}>

                  {/* En-tête carte */}
                  <div style={{ padding: '16px 16px 10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span style={{ background: 'rgba(249,168,37,0.12)', border: `1px solid ${GOLD}`, color: GOLD, padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600' }}>
                        {tut.categorie}
                      </span>
                      <LevelBadge niveau={tut.niveau} />
                    </div>
                    <div style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1.05rem', lineHeight: '1.45', marginBottom: '10px' }}>{tut.titre}</div>
                    <p style={{ color: GREY, fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>{tut.description}</p>
                  </div>

                  {/* Pied de carte */}
                  <div style={{ padding: '12px 16px', marginTop: 'auto', borderTop: '1px solid rgba(249,168,37,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ color: GREY, fontSize: '0.76rem' }}>{tut.duree}</span>
                      <span style={{ display: 'inline-block', marginLeft: '8px', background: 'rgba(76,175,80,0.12)', border: '1px solid #4caf50', color: '#4caf50', padding: '1px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>GRATUIT</span>
                    </div>
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button onClick={() => loadTutorial(tut)}
                      style={{ width: '100%', background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem', letterSpacing: '0.5px' }}>
                      Voir ce tutoriel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vue tutoriel détaillé ─────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* Bouton retour */}
        <div style={{ marginBottom: '24px' }}>
          <button onClick={goBack}
            style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 18px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.88rem' }}>
            Retour aux tutoriels
          </button>
        </div>

        {/* En-tête tutoriel */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ background: 'rgba(249,168,37,0.12)', border: `1px solid ${GOLD}`, color: GOLD, padding: '3px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
              {selectedTut.categorie}
            </span>
            <LevelBadge niveau={selectedTut.niveau} />
          </div>
          <h1 style={{ color: GOLD, fontWeight: '700', fontSize: '1.9rem', lineHeight: '1.3', marginBottom: '10px' }}>{selectedTut.titre}</h1>
          <div style={{ color: GREY, fontSize: '0.82rem' }}>{selectedTut.duree} — GRATUIT</div>
        </div>

        {/* Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(249,168,37,0.2)', borderTop: `3px solid ${GOLD}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 18px' }} />
            <div style={{ color: GOLD, fontWeight: '600' }}>Chargement du tutoriel...</div>
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid #e53935', borderRadius: '8px', padding: '20px 24px', marginBottom: '24px' }}>
            <p style={{ color: '#ef9a9a', margin: '0 0 14px', lineHeight: '1.6' }}>Le tutoriel n'a pas pu être chargé. Vérifie ta connexion et réessaie.</p>
            <button onClick={() => loadTutorial(selectedTut)}
              style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '9px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Contenu tutoriel */}
        {tutData && !loading && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>

            <Sep />

            {/* Introduction */}
            <p style={{ color: GOLD, fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center', fontSize: '1rem', marginBottom: '8px' }}>
              {tutData.introduction}
            </p>

            <Sep />

            {/* Sections */}
            {tutData.sections.map((section, si) => (
              <div key={si} style={{ marginBottom: '32px' }}>
                <SectionTitle>{section.title}</SectionTitle>
                <div style={{ color: 'rgba(249,168,37,0.3)', margin: '8px 0 16px', textAlign: 'center', letterSpacing: '4px', fontSize: '0.8rem' }}>——— ✦ ———</div>

                <div style={{ color: '#e8eaf6', lineHeight: '1.8', marginBottom: section.steps || section.arabicContent || section.tip || section.warning ? '16px' : '0', whiteSpace: 'pre-line' }}>
                  {section.content}
                </div>

                <AudioButton text={section.content} label="Écouter cette section" style={{ fontSize: '0.8em' }} />

                {section.steps && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    {section.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <StepNum n={i + 1} />
                        <div style={{ color: '#e8eaf6', lineHeight: '1.7', paddingTop: '4px', flex: 1 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                )}

                {section.arabicContent && (
                  <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '16px 20px', marginBottom: '14px' }}>
                    <div style={{ color: GOLD, fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.4em', direction: 'rtl', textAlign: 'right', lineHeight: '2' }}>
                      {section.arabicContent}
                    </div>
                  </div>
                )}

                {section.tip && (
                  <div style={{ background: 'rgba(76,175,80,0.07)', border: '1px solid rgba(76,175,80,0.4)', borderRadius: '6px', padding: '14px 16px', marginBottom: '14px' }}>
                    <span style={{ color: '#4caf50', fontWeight: '700' }}>Conseil : </span>
                    <span style={{ color: '#e8eaf6', lineHeight: '1.7' }}>{section.tip}</span>
                  </div>
                )}

                {section.warning && (
                  <div style={{ background: 'rgba(255,152,0,0.07)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '6px', padding: '14px 16px' }}>
                    <span style={{ color: '#ff9800', fontWeight: '700' }}>Attention : </span>
                    <span style={{ color: '#e8eaf6', lineHeight: '1.7' }}>{section.warning}</span>
                  </div>
                )}
              </div>
            ))}

            <Sep />

            {/* Exemple pratique */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>{tutData.example.title}</SectionTitle>

              <div style={{ background: CARD, border: '1px solid rgba(249,168,37,0.2)', borderRadius: '6px', padding: '16px', marginBottom: '18px' }}>
                <p style={{ color: '#e8eaf6', fontStyle: 'italic', lineHeight: '1.7', margin: 0 }}>{tutData.example.scenario}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                {tutData.example.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <StepNum n={i + 1} />
                    <div style={{ color: '#e8eaf6', lineHeight: '1.7', paddingTop: '4px', flex: 1 }}>{step}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(76,175,80,0.07)', border: `1px solid ${GOLD}`, borderRadius: '6px', padding: '16px' }}>
                <span style={{ color: GOLD, fontWeight: '700' }}>Résultat : </span>
                <span style={{ color: '#e8eaf6', fontWeight: '600', lineHeight: '1.7' }}>{tutData.example.result}</span>
              </div>
            </div>

            <Sep />

            {/* Points essentiels */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Points Essentiels à Retenir</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tutData.keyTakeaways.map((pt, i) => (
                  <div key={i} style={{ color: '#e8eaf6', fontSize: '0.95rem', lineHeight: '1.7' }}>
                    <span style={{ color: GOLD, marginRight: '8px' }}>✦</span>{pt}
                  </div>
                ))}
              </div>
            </div>

            <Sep />

            {/* Erreurs courantes */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Erreurs Courantes à Éviter</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {tutData.commonMistakes.map((m, i) => (
                  <div key={i} style={{ background: 'rgba(229,57,53,0.07)', border: '1px solid rgba(229,57,53,0.4)', borderRadius: '6px', padding: '14px 16px' }}>
                    <div style={{ color: '#e53935', fontWeight: '700', marginBottom: '6px' }}>✗ {m.mistake}</div>
                    <div style={{ color: '#e8eaf6', fontSize: '0.9rem', lineHeight: '1.6' }}>{m.correction}</div>
                  </div>
                ))}
              </div>
            </div>

            <Sep />

            {/* Pour aller plus loin */}
            <div style={{ marginBottom: '32px' }}>
              <SectionTitle>Pour Aller Plus Loin</SectionTitle>
              <p style={{ color: '#e8eaf6', lineHeight: '1.8', marginBottom: '16px' }}>{tutData.nextSteps}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tutData.relatedTopics.map((topic, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: GREY, padding: '4px 14px', borderRadius: '16px', fontSize: '0.82rem' }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <Sep />

            {/* Conclusion */}
            <p style={{ color: GOLD, fontStyle: 'italic', lineHeight: '1.8', textAlign: 'center', fontSize: '1rem', marginBottom: '32px' }}>
              {tutData.conclusion}
            </p>

            <Sep />

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {prevTut && (
                <button onClick={() => loadTutorial(prevTut)}
                  style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Tutoriel précédent
                </button>
              )}
              <button onClick={goBack}
                style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Retour aux tutoriels
              </button>
              {nextTut && (
                <button onClick={() => loadTutorial(nextTut)}
                  style={{ background: GOLD, color: '#0a0e2e', fontWeight: '700', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Tutoriel suivant
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
