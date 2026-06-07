import { useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, calculatePM } from '../utils/mystique';
import { AudioButton } from '../components/AudioButton';
import { CreditModal } from '../components/CreditModal';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FigureData {
  nom: string;
  nomArabe: string;
  nomBambara: string;
  latinName: string;
  element: string;
  direction: string;
  nature: string;
  influence: string;
  influenceLevel: number;
  caractere: string;
  sacrifice: string;
  sante: string | null;
  plante: { nomFrancais: string; nomBambara: string; nomScientifique: string; lienWikipedia: string };
  bits: number[];
}

interface MaisonData {
  nom: string;
  description: string;
  element: string;
  nature: string;
}

interface KeyHouse {
  houseNumber: number;
  houseName: string;
  figureName: string;
  interpretation: string;
  relevance: string;
}

interface GeminiGeoData {
  synthesis: string;
  threeKeyHouses: KeyHouse[];
  completeReading: string;
  specificAnswer: string;
  recommendation: string;
  additionalSacrifice: { isNeeded: boolean; item: string; instructions: string; reason: string };
  conclusion: string;
}

interface GeoResult {
  firstNameAr: string;
  motherNameAr: string;
  pm: number;
  theme: number[];
  gemini: GeminiGeoData;
}

// ─── FIGURES ─────────────────────────────────────────────────────────────────

const FIGURES: Record<number, FigureData> = {
  1: {
    nom: 'Youssouf', nomArabe: 'يوسف', nomBambara: 'Djanfa (Almami)', latinName: 'Puer',
    element: 'Feu', direction: 'Est', nature: 'Sortante (Mobile)',
    influence: 'Défavorable', influenceLevel: -1,
    caractere: "Affirmation de soi exagérée, trahison, déception, tromperie, jalousie, impulsivité. Recherche de plaisir, fêtes, rencontres amoureuses. Caractère combatif, nerveux et très réactif. Promesses non tenues. Séduction et gaieté mais instabilité.",
    sacrifice: "Le mil est le plus souvent indiqué. Couleur dominante : rouge.",
    sante: null,
    plante: { nomFrancais: 'Balançon / Tamarinier', nomBambara: 'Balança', nomScientifique: 'Tamarindus indica', lienWikipedia: 'https://fr.wikipedia.org/wiki/Tamarinier' },
    bits: [1,1,0,1],
  },
  2: {
    nom: 'Adama', nomArabe: 'آدم', nomBambara: 'Adama', latinName: 'Laetitia',
    element: 'Feu', direction: 'Est', nature: 'Sortante',
    influence: 'Favorable', influenceLevel: 1,
    caractere: "Bonne et heureuse vie, chance, accroissement financier, gaieté, beauté, réussite dans les affaires. Joie de vivre, optimisme, succès dans les entreprises.",
    sacrifice: "Mouton blanc ou toute chose de couleur blanche.",
    sante: null,
    plante: { nomFrancais: 'Sana / Séné', nomBambara: 'Sana', nomScientifique: 'Cassia sieberiana', lienWikipedia: 'https://fr.wikipedia.org/wiki/Cassia_sieberiana' },
    bits: [1,0,0,0],
  },
  3: {
    nom: 'Malidjou', nomArabe: 'المهدي', nomBambara: 'Malijou', latinName: 'Via',
    element: 'Air (Vent)', direction: 'Sud', nature: 'Rentrante',
    influence: 'Très favorable', influenceLevel: 2,
    caractere: "Élévation, hauteur, chefferie, sagesse, intelligence, concrétisation et épanouissement dans toute entreprise. Personne responsable, honnête, protectrice. Parle des génies qui habitent les endroits élevés (montagne, air, points élevés).",
    sacrifice: "Écorces ou feuilles des arbres hauts, feuilles ou racines d'arbres qui poussent sur des endroits élevés.",
    sante: null,
    plante: { nomFrancais: 'Cèdre africain / Quiélélé', nomBambara: 'Cebé', nomScientifique: 'Khaya senegalensis', lienWikipedia: 'https://fr.wikipedia.org/wiki/Khaya_senegalensis' },
    bits: [1,1,1,1],
  },
  4: {
    nom: 'Idriss', nomArabe: 'إدريس', nomBambara: 'Albayada', latinName: 'Albus',
    element: 'Eau', direction: 'Nord', nature: 'Rentrante',
    influence: 'Très favorable', influenceLevel: 2,
    caractere: "Véridique, très bon croyant, bienfaisant, attaché à la vérité. Sagesse, sérénité, clairvoyance, réussite. Personnes âgées et réfléchies, préoccupées par la famille. Paix, bonté, spiritualité, méditation, intuition. Pureté d'esprit, blancheur des choses. Engagements sérieux et durables.",
    sacrifice: "Toute chose dont la blancheur est notée : habit blanc, mouton blanc, papier blanc, bougie blanche.",
    sante: "Problèmes de pieds, jambes, os liés à la vieillesse.",
    plante: { nomFrancais: 'Karité', nomBambara: 'Djou', nomScientifique: 'Vitellaria paradoxa', lienWikipedia: 'https://fr.wikipedia.org/wiki/Karit%C3%A9' },
    bits: [0,0,1,0],
  },
  5: {
    nom: 'Ibrahim', nomArabe: 'إبراهيم', nomBambara: 'Tâliki', latinName: 'Caput Draconis',
    element: 'Eau', direction: 'Nord', nature: 'Mobile',
    influence: 'Intermédiaire', influenceLevel: 0,
    caractere: "Voie, route, direction, effort, concentration d'idées, méditation sur un problème. Doute, inquiétude, lenteur, instabilité, difficultés, obstacles. Le but est toujours atteint malgré les retards. Personne souvent maladive.",
    sacrifice: "Génies faibles qu'on peut faire quitter facilement (pas trop forts, ni têtus, ni trop méchants).",
    sante: null,
    plante: { nomFrancais: 'Kapokier', nomBambara: 'Djècala', nomScientifique: 'Ceiba pentandra', lienWikipedia: 'https://fr.wikipedia.org/wiki/Ceiba_pentandra' },
    bits: [1,1,1,0],
  },
  6: {
    nom: 'Issa', nomArabe: 'عيسى', nomBambara: 'Ngansa', latinName: 'Amissio',
    element: 'Eau', direction: 'Nord', nature: 'Mobile (Commune)',
    influence: 'Très négative', influenceLevel: -2,
    caractere: "Paroles, bruits, sons, querelles, disputes, discours, dispersions, diminution, décadence, perte d'énergie. Colère, frustration, régression, abandon, privation. Corruption, conflits, séparation, haine. Personne rusée, intelligente, vaniteuse, orgueilleuse, nerveuse, critique, hypocrite, menteuse. Indiscrétion assurée avec cette figure.",
    sacrifice: "De la fumée, chèvre, oiseaux, objets ou animaux bruyants. Couleur rouge dominante.",
    sante: null,
    plante: { nomFrancais: 'Neem / Margousier', nomBambara: 'Wingninga', nomScientifique: 'Azadirachta indica', lienWikipedia: 'https://fr.wikipedia.org/wiki/Azadirachta_indica' },
    bits: [1,0,1,0],
  },
  7: {
    nom: 'Lomara', nomArabe: 'عمر', nomBambara: 'Lomara', latinName: 'Rubeus',
    element: 'Air', direction: 'Sud', nature: 'Sortante (Mobile)',
    influence: 'Très défavorable', influenceLevel: -2,
    caractere: "Ne montre que de mauvaises choses. Éclatements, explosions, saignements, opérations chirurgicales. Révolte, tension, destruction, rébellion, impulsivité, cruauté, violence. Passions, guerres, luttes dans le sang. Grèves, discussions houleuses. Mésentente dans les couples. Mauvais sorts selon la position.",
    sacrifice: "Couleur rouge très dominante dans le choix des sacrifices animaux, objets ou fruits.",
    sante: null,
    plante: { nomFrancais: 'Acacia rouge / Gao', nomBambara: 'Gababelé', nomScientifique: 'Faidherbia albida', lienWikipedia: 'https://fr.wikipedia.org/wiki/Faidherbia_albida' },
    bits: [1,0,1,1],
  },
  8: {
    nom: 'Mangossi', nomArabe: 'أيوب', nomBambara: 'Mangossi', latinName: 'Tristitia',
    element: 'Terre', direction: 'Ouest', nature: 'Rentrante et fixe',
    influence: 'Très défavorable', influenceLevel: -2,
    caractere: "Tristesse subie indépendante de la volonté. Noir, obscur, sombre, tristesse, rancunes, afflictions, dépression, mélancolie, déceptions, désespoir. Sévérité, difficulté, fatalité, mauvaise humeur, inquiétude, crainte. Comportement austère, peu sociable. Analytique, pénétrant, persévérant, porté à la recherche des causes premières, apte aux études occultes. Lenteur et blocage dans toute entreprise. Génies de terre dans des grottes ou endroits sombres, très difficiles à faire quitter.",
    sacrifice: "Tubercules, mouton noir, bœuf noir, poule noire.",
    sante: null,
    plante: { nomFrancais: 'Caïlcédrat / Fromager noir', nomBambara: 'Kronifin', nomScientifique: 'Khaya grandifoliola', lienWikipedia: 'https://fr.wikipedia.org/wiki/Khaya_grandifoliola' },
    bits: [0,0,0,1],
  },
  9: {
    nom: 'Kalalaw', nomArabe: 'الله تعالى', nomBambara: 'Kalalaw', latinName: 'Fortuna Minor',
    element: 'Feu', direction: 'Est', nature: 'Sortante',
    influence: 'Intermédiaire', influenceLevel: 0,
    caractere: "Variations brusques, richesses inattendues, acquisitions, réussites précaires, fortunes subites qui ne durent pas. Dispersion, fluctuation, changement brusque. Personne orgueilleuse, vaniteuse. Relation entre l'homme et Dieu, piété, foi, spiritualité, savoir immense, saints. Succès inattendu, progression subite, avancement brusque inespéré.",
    sacrifice: "Moutons, feuilles, lait, bougies, colas.",
    sante: "Problèmes de tête et de cou.",
    plante: { nomFrancais: 'Balanites / Dattier du désert', nomBambara: 'Sadio ou Aladjo', nomScientifique: 'Balanites aegyptiaca', lienWikipedia: 'https://fr.wikipedia.org/wiki/Balanites_aegyptiaca' },
    bits: [1,1,0,0],
  },
  10: {
    nom: 'Solomane', nomArabe: 'سليمان', nomBambara: 'Mansa Solomani', latinName: 'Carcer',
    element: 'Terre', direction: 'Ouest', nature: 'Sortante et mobile',
    influence: 'Défavorable', influenceLevel: -1,
    caractere: "Contrainte et blocage dans toute chose entreprise. Pensées secrètes, enclos fermés, concentration d'esprit, empêchement, restriction, fermeture, encerclement, isolement, égoïsme, déception, science occulte, prison. Personne très mécontente d'une situation. Communication réduite avec l'extérieur.",
    sacrifice: "Mouton noir (le plus souvent), poule noire, colas rouges, chèvre noire, igname.",
    sante: "Maladies de ventre.",
    plante: { nomFrancais: 'Baobab', nomBambara: 'Sira ou baobab', nomScientifique: 'Adansonia digitata', lienWikipedia: 'https://fr.wikipedia.org/wiki/Adansonia_digitata' },
    bits: [1,0,0,1],
  },
  11: {
    nom: 'Badra Alou', nomArabe: 'علي', nomBambara: 'Badara Aliou', latinName: 'Conjunctio',
    element: 'Air', direction: 'Est', nature: 'Rentrante, fixe',
    influence: 'Favorable', influenceLevel: 1,
    caractere: "Union, réunion, rencontres, associations, conjonctions, alliances. Mariages, politiques, enseignements, société civile. Personne gaie, accueillante, sens des relations, esprit d'ouverture et de partage. Diplomatie, négociations, affinités, contrats, aides. Connaissances, études, recherche.",
    sacrifice: "Aluminium, mouton blanc, poulet blanc, colas blancs.",
    sante: "Maladies de la côte, du cœur.",
    plante: { nomFrancais: 'Liane verte / Saba', nomBambara: 'Gbè yiri', nomScientifique: 'Saba senegalensis', lienWikipedia: 'https://fr.wikipedia.org/wiki/Saba_senegalensis' },
    bits: [0,1,1,0],
  },
  12: {
    nom: 'Nouhou', nomArabe: 'نوح', nomBambara: 'Nouhoukoro', latinName: 'Fortuna Major',
    element: 'Terre', direction: 'Ouest', nature: 'Rentrante, fixe',
    influence: 'Très favorable', influenceLevel: 2,
    caractere: "Le sage, l'intelligent, le respecté et l'honoré. Bonne moralité, posé, réfléchi. Réussite personnelle, fortune gagnée dans les labeurs. Actif, dynamique, réalisation de soi par effort personnel. Confiance en soi, accomplissement. Caractère loyal et juste. Difficultés et obstacles qu'on peut surmonter.",
    sacrifice: "Vieilles chaussures, vieux habits, colas blancs.",
    sante: "Problèmes liés au sang.",
    plante: { nomFrancais: 'Detarium / Ditakh', nomBambara: 'Kounbè', nomScientifique: 'Detarium microcarpum', lienWikipedia: 'https://fr.wikipedia.org/wiki/Detarium_microcarpum' },
    bits: [0,0,1,1],
  },
  13: {
    nom: 'Lawssana', nomArabe: 'الحسن', nomBambara: 'Lawssinè', latinName: 'Cauda Draconis',
    element: 'Eau', direction: 'Nord', nature: 'Sortante, mobile',
    influence: 'Très négative', influenceLevel: -2,
    caractere: "Disputes, traîtrises, querelles amoureuses, perversion, délation, prostitution, malhonnêteté, déception, surprise, mauvaise foi, mauvaise voie, vol, fallacieux. Perte de confiance, rapports tendus. Tromperie en amour ou absence d'amour. Génies vivant au bord de l'eau ou sur les termitières.",
    sacrifice: "Fleurs ou plantes qui poussent sur les arbres.",
    sante: "Impuissance, avortement, naissance prématurée.",
    plante: { nomFrancais: 'Zaman / Tamarinier des Indes', nomBambara: 'Zaman', nomScientifique: 'Samanea saman', lienWikipedia: 'https://fr.wikipedia.org/wiki/Samanea_saman' },
    bits: [0,1,1,1],
  },
  14: {
    nom: 'Tontigui', nomArabe: 'يونس', nomBambara: 'Tontigui', latinName: 'Puella',
    element: 'Terre', direction: 'Ouest', nature: 'Sortante, mobile',
    influence: 'Défavorable', influenceLevel: -1,
    caractere: "Adolescence, plaisanteries, gaieté, amusements, manque de maturité, plaisirs, rencontre amoureuse. Aventurier, passionnel, cruel, audacieux, enfantin. Sens esthétique, tempérament amoureux, sensuel. Affection sincère mais inconstante. Argent, gain, accroissement de biens financiers, profits. Bonheur dans les affaires.",
    sacrifice: "Poule noire ou pain de singe.",
    sante: "Maladies liées aux poitrines.",
    plante: { nomFrancais: 'Jatropha / Pignon d\'Inde', nomBambara: 'Dialassogala', nomScientifique: 'Jatropha curcas', lienWikipedia: 'https://fr.wikipedia.org/wiki/Jatropha_curcas' },
    bits: [0,1,0,0],
  },
  15: {
    nom: 'Ousmane', nomArabe: 'عثمان', nomBambara: 'Mori Zoumana', latinName: 'Acquisitio',
    element: 'Air', direction: 'Sud', nature: 'Rentrante, fixe',
    influence: 'Très favorable', influenceLevel: 2,
    caractere: "Apport des énergies matérielles, morales et physiques. Accroissement des biens et services, gains, succès, avantages, prospérité, certitude, sagesse, sérieux, honnêteté, paix intérieure, réussite financière. Mérites, bonnes intentions, bienfaisant. Possession, absorption, agrandissement, abondance. Personne de très bonne moralité, sociable, juste, compréhensive, généreuse, réfléchie. Génies de foi qui fréquentent les lieux de culte.",
    sacrifice: "Poule blanche, colas blancs ou mouton blanc.",
    sante: "Maladie qui s'apaise la nuit mais s'empire le jour.",
    plante: { nomFrancais: 'Doumier / Palmier doum', nomBambara: 'Doubalé', nomScientifique: 'Hyphaene thebaica', lienWikipedia: 'https://fr.wikipedia.org/wiki/Hyphaene_thebaica' },
    bits: [0,1,0,1],
  },
  16: {
    nom: 'Moussa', nomArabe: 'موسى', nomBambara: 'Moussa', latinName: 'Populus',
    element: 'Feu', direction: 'Est', nature: 'Fixe',
    influence: 'Intermédiaire', influenceLevel: 0,
    caractere: "Multiplicité dans toute chose, idées de toutes sortes, groupes, foule, rassemblements, cérémonies. Voyages en convoi, médias, informations, débats, répétition dans les faits et gestes, commerce, changements fréquents d'opinions. Ni mauvais ni bon. Confusion et embrouillement des pensées.",
    sacrifice: "Graines, habits, mouton blanc, plusieurs bougies, feuilles blanches (toujours en grande quantité).",
    sante: "Plusieurs maladies dans le corps du malade.",
    plante: { nomFrancais: 'Moringa', nomBambara: 'Tomi boulou', nomScientifique: 'Moringa oleifera', lienWikipedia: 'https://fr.wikipedia.org/wiki/Moringa_oleifera' },
    bits: [0,0,0,0],
  },
};

// ─── MAISONS ─────────────────────────────────────────────────────────────────

const MAISONS: Record<number, MaisonData> = {
  1:  { nom: 'Maison du demandeur',      description: "Maison du consultant, reflet de l'âme, des pensées, désirs, tempérament, état psychologique, moral, sentiments.",                          element: 'Feu',   nature: 'Mobile'  },
  2:  { nom: 'Maison des biens',         description: "Maison des chances, biens, profits, gains, richesses, acquisitions. La chance peut être positive ou négative en géomancie.",              element: 'Air',   nature: 'Fixe'    },
  3:  { nom: 'Maison de la famille',     description: "Maison des parents proches, frères, collègues, entourage proche.",                                                                         element: 'Eau',   nature: 'Commune' },
  4:  { nom: 'Maison du foyer',          description: "Foyer du questionnant, statut des parents, patrimoine, terre, biens mobiliers et immobiliers.",                                            element: 'Terre', nature: 'Mobile'  },
  5:  { nom: 'Maison des amours',        description: "Maison des enfants, amours, projets amoureux, nouvelles, grossesses.",                                                                     element: 'Feu',   nature: 'Fixe'    },
  6:  { nom: 'Maison de la maladie',     description: "Maison de la maladie, chose accomplie, angoisses, malheurs, esclaves, cheptel.",                                                          element: 'Air',   nature: 'Commune' },
  7:  { nom: 'Maison conjugale',         description: "Maison des époux, adversaires, rivaux, associés. Par extension les paroles et idées.",                                                    element: 'Eau',   nature: 'Mobile'  },
  8:  { nom: 'Maison de la mort',        description: "Maison de l'extérieur, héritages, crédits, dettes, changements, tristesse, mort.",                                                        element: 'Terre', nature: 'Fixe'    },
  9:  { nom: 'Maison des voyages',       description: "Maison des déplacements, voyages, spiritualité, foi, recherche et découverte.",                                                           element: 'Feu',   nature: 'Commune' },
  10: { nom: 'Maison du travail',        description: "Maison du service, autorité, position sociale, royauté, honneurs.",                                                                       element: 'Air',   nature: 'Mobile'  },
  11: { nom: 'Maison des espoirs',       description: "Maison des espérances, espoirs, affinités, projets, amis et aides.",                                                                     element: 'Eau',   nature: 'Fixe'    },
  12: { nom: 'Maison des épreuves',      description: "Maison des épreuves, blocages, pièges, difficultés, ennemis et maraboutages.",                                                           element: 'Terre', nature: 'Commune' },
  13: { nom: 'Maison du plaisir',        description: "Maison du plaisir, joie, résultats du moment, acquisitions et rêves. (Témoin Droit)",                                                   element: 'Feu',   nature: 'Mobile'  },
  14: { nom: 'Maison du futur',          description: "Maison des réalisations ultérieures, gains à venir, futur et avenir. (Témoin Gauche)",                                                   element: 'Air',   nature: 'Fixe'    },
  15: { nom: 'Synthèse du thème',        description: "Synthèse de toutes les maisons, résumé du thème et conclusion. (Juge)",                                                                  element: 'Eau',   nature: 'Commune' },
  16: { nom: 'Confirmation divine',      description: "Confirmation entre l'homme et son milieu. En milieu bambara c'est le jugement de Dieu. (Sentence)",                                      element: 'Terre', nature: 'Commune' },
};

// ─── Génération géomantique ──────────────────────────────────────────────────

function generateTheme(pm: number, question: string): number[] {
  let seed = ((pm * 31 + (question.charCodeAt(0) || 7)) * 1103515245 + 12345) & 0x7fffffff;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 16) + 1;
  };
  return Array.from({ length: 16 }, next);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_FLASH = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
const GEMINI_25   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function transliterate(name: string): Promise<string> {
  const res = await fetch(GEMINI_FLASH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Translitère ce prénom ou nom en arabe (sans diacritiques) : "${name}"\nRéponds UNIQUEMENT avec les caractères arabes.` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
    }),
  });
  const d = await res.json();
  return (d.candidates?.[0]?.content?.parts?.[0]?.text ?? name).trim();
}

async function callGemini25(prompt: string): Promise<GeminiGeoData> {
  const res = await fetch(GEMINI_25, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 3500 },
    }),
  });
  const d = await res.json();
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(json) as GeminiGeoData;
}

function buildPrompt(
  firstName: string, motherName: string, connector: string,
  pm: number, question: string, theme: number[]
): string {
  const themeLines = theme.map((figIdx, i) => {
    const fig = FIGURES[figIdx];
    const maison = MAISONS[i + 1];
    const role = i < 4 ? 'Mère' : i < 8 ? 'Fille' : i < 12 ? 'Neveu' : i === 12 ? 'Témoin Droit' : i === 13 ? 'Témoin Gauche' : i === 14 ? 'Juge' : 'Sentence';
    return `Maison ${i + 1} [${role}] — ${maison.nom} (${maison.element}, Nature: ${maison.nature}) :
  Figure : ${fig.nom} / ${fig.nomArabe} (${fig.latinName}) | ${fig.element} | ${fig.direction}
  Influence : ${fig.influence}
  Caractère : ${fig.caractere}
  Sacrifice : ${fig.sacrifice}`;
  }).join('\n\n');

  return `Tu es un maître de la géomancie islamique ouest-africaine (Ilm al-Raml / Science du Sable).

Consultant : ${firstName} ${connector} ${motherName}
Poids Mystique (PM) : ${pm}
Question posée : "${question}"

THÈME GÉOMANTIQUE COMPLET — 16 MAISONS :

${themeLines}

RÈGLES D'INTERPRÉTATION :
- Maisons 1–4 = Mères (fondement du thème)
- Maisons 5–8 = Filles (développement)
- Maisons 9–12 = Neveux (conséquences)
- Maison 13 = Témoin Droit (résultat immédiat)
- Maison 14 = Témoin Gauche (avenir proche)
- Maison 15 = Juge (synthèse générale du thème)
- Maison 16 = Sentence divine (confirmation finale)
- Maison 1 = état du consultant, son énergie actuelle
- Maison 7 = conjoint, adversaires, partenaires
- Maison 10 = travail, autorité, réussite sociale

Identifie les 3 MAISONS les plus pertinentes pour la question posée et interprète-les en détail.

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "synthesis": "Synthèse générale du thème en 2-3 phrases",
  "threeKeyHouses": [
    {
      "houseNumber": 1,
      "houseName": "nom de la maison",
      "figureName": "nom bambara de la figure",
      "interpretation": "Interprétation approfondie de cette maison pour la question posée (4-6 phrases)",
      "relevance": "Pourquoi cette maison est clé pour cette question (1-2 phrases)"
    }
  ],
  "completeReading": "Lecture globale et nuancée du thème géomantique (7-9 phrases)",
  "specificAnswer": "Réponse directe et claire à la question posée (2-3 phrases)",
  "recommendation": "Conseil pratique et spirituel concret pour le consultant (3-4 phrases)",
  "additionalSacrifice": {
    "isNeeded": true,
    "item": "Ce qu'il faut offrir en sacrifice",
    "instructions": "Instructions détaillées du sacrifice",
    "reason": "Raison spirituelle de ce sacrifice"
  },
  "conclusion": "Message d'espoir et d'encouragement pour le consultant (2-3 phrases)"
}`;
}

function influenceColor(level: number): string {
  if (level >= 2) return '#4caf50';
  if (level >= 1) return '#8bc34a';
  if (level === 0) return '#f9a825';
  if (level >= -1) return '#ff9800';
  return '#e53935';
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
    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span>✦</span> <span>{children}</span>
    </div>
  );
}

function FigureDots({ bits, size = 'small' }: { bits: number[]; size?: 'small' | 'large' }) {
  const dot = size === 'large' ? 10 : 7;
  const gap = size === 'large' ? 5 : 3;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: gap + 'px', alignItems: 'center', flexShrink: 0 }}>
      {bits.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: '4px', justifyContent: 'center', width: (dot * 2 + 8) + 'px' }}>
          <div style={{ width: dot, height: dot, borderRadius: '50%', background: '#f9a825', flexShrink: 0 }} />
          {b === 0 && <div style={{ width: dot, height: dot, borderRadius: '50%', background: '#f9a825', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

function InfluenceBadge({ influence, level }: { influence: string; level: number }) {
  const color = influenceColor(level);
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
      {influence}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function GeomanciePage() {
  const [firstName, setFirstName]   = useState('');
  const [motherName, setMotherName] = useState('');
  const [gender, setGender]         = useState<'homme' | 'femme'>('homme');
  const [question, setQuestion]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<GeoResult | null>(null);
  const [balance, setBalance]       = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [downloadingPDF, setDownloadingPDF]   = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const connector = gender === 'homme' ? 'ابن' : 'ابنة';
  const cacheKey  = `geo_${firstName.trim()}_${motherName.trim()}_${gender}_${question.trim().slice(0, 60)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !motherName.trim() || !question.trim()) return;

    // Cache check
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setResult(JSON.parse(cached) as GeoResult); return; }

    setLoading(true);
    setError('');
    try {
      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Veuillez vous connecter.'); return; }

      // Crédits
      const { data: creditData } = await supabase
        .from('user_credits').select('balance').eq('user_id', user.id).single();
      const bal = (creditData as { balance: number } | null)?.balance ?? 0;
      if (bal < 2) { setBalance(bal); setShowCreditModal(true); return; }

      // Translitération (parallèle)
      const [firstNameAr, motherNameAr] = await Promise.all([
        transliterate(firstName.trim()),
        transliterate(motherName.trim()),
      ]);

      // PM
      const pm = calculatePM(calculateWeight(firstNameAr), calculateWeight(motherNameAr), gender);

      // Tirage géomantique
      const theme = generateTheme(pm, question.trim());

      // Interprétation Gemini 2.5-flash
      const prompt = buildPrompt(firstName.trim(), motherName.trim(), connector, pm, question.trim(), theme);
      const gemini = await callGemini25(prompt);

      const geoResult: GeoResult = { firstNameAr, motherNameAr, pm, theme, gemini };

      // Déduction crédits
      await supabase.from('user_credits')
        .update({ balance: bal - 2, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      await supabase.from('credit_transactions').insert({
        user_id: user.id, type: 'use', amount: -2, tool: 'geomancie',
        balance_after: bal - 2, created_at: new Date().toISOString(),
      });

      // Sauvegarde
      await supabase.from('saved_rituals').insert({
        user_id: user.id, page_source: 'geomancie',
        first_name: firstName.trim(), mother_name: motherName.trim(), gender, pm,
        data: JSON.stringify({ theme, gemini, question: question.trim() }),
        created_at: new Date().toISOString(),
      });

      sessionStorage.setItem(cacheKey, JSON.stringify(geoResult));
      setResult(geoResult);
    } catch (err) {
      setError((err as Error).message || 'Erreur inattendue. Veuillez réessayer.');
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
      pdf.save(`geomancie-${firstName.trim()}-secretdivin.pdf`);
    } finally {
      setDownloadingPDF(false);
    }
  }

  const fullText = result
    ? `${result.gemini.synthesis} ${result.gemini.specificAnswer} ${result.gemini.completeReading} ${result.gemini.recommendation} ${result.gemini.conclusion}`
    : '';

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', color: '#e8eaf6', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ color: '#f9a825', fontSize: '2.2rem', fontFamily: 'Noto Naskh Arabic, serif', marginBottom: '8px' }}>علم الرمل</div>
          <h1 style={{ color: '#e8eaf6', fontWeight: '700', fontSize: '1.8rem', marginBottom: '8px' }}>Géomancie Islamique</h1>
          <p style={{ color: '#b0b8d4', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 16px', lineHeight: '1.6' }}>
            Consultation du thème géomantique en 16 maisons selon la tradition ouest-africaine
          </p>
          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['16 Figures', '16 Maisons', '2 Crédits'].map(tag => (
              <span key={tag} style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.3)', color: '#f9a825', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600' }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        {!result && (
          <Card>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '6px' }}>Prénom *</label>
                  <input
                    value={firstName} onChange={e => setFirstName(e.target.value)} required
                    placeholder="Votre prénom"
                    style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 14px', borderRadius: '4px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '6px' }}>Nom de la mère *</label>
                  <input
                    value={motherName} onChange={e => setMotherName(e.target.value)} required
                    placeholder="Nom de votre mère"
                    style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '10px 14px', borderRadius: '4px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '6px' }}>Genre *</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    {(['homme', 'femme'] as const).map(g => (
                      <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: gender === g ? '#f9a825' : '#b0b8d4' }}>
                        <input type="radio" value={g} checked={gender === g} onChange={() => setGender(g)} style={{ accentColor: '#f9a825' }} />
                        {g === 'homme' ? 'Homme' : 'Femme'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Votre question *
                  <span style={{ color: '#b0b8d4', fontWeight: '400', marginLeft: '8px' }}>(posez-la clairement et précisément)</span>
                </label>
                <textarea
                  value={question} onChange={e => setQuestion(e.target.value)} required minLength={10}
                  placeholder="Exemple : Vais-je réussir dans mon projet professionnel cette année ? Qu'est-ce qui freine ma progression ?"
                  rows={4}
                  style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.3)', color: '#e8eaf6', padding: '12px 14px', borderRadius: '4px', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.6' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef9a9a', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', background: loading ? '#333' : 'linear-gradient(135deg, #f9a825, #e65100)', color: loading ? '#888' : '#0a0e2e', fontWeight: '700', fontSize: '1rem', padding: '14px', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '1px' }}>
                {loading ? 'Tirage en cours...' : 'Lancer le tirage géomantique — 2 crédits'}
              </button>
            </form>
          </Card>
        )}

        {/* Chargement */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '56px', height: '56px', border: '3px solid rgba(249,168,37,0.2)', borderTop: '3px solid #f9a825', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: '#f9a825', fontWeight: '600', marginBottom: '8px' }}>Consultation en cours...</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.9rem' }}>Tirage des 16 maisons · Interprétation par l'IA</div>
          </div>
        )}

        {/* Résultats */}
        {result && !loading && (
          <div ref={resultsRef}>

            {/* ── BLOC 1 : Identité ── */}
            <Card style={{ marginBottom: '24px', borderColor: 'rgba(249,168,37,0.4)' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ color: '#f9a825', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Thème Géomantique
                </div>
                <div style={{ color: '#e8eaf6', fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>{firstName}</div>
                <div style={{ color: '#b0b8d4', fontSize: '0.9rem', fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl', marginBottom: '8px' }}>
                  {result.firstNameAr} {connector} {result.motherNameAr}
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '12px' }}>
                  Poids Mystique : <span style={{ color: '#f9a825', fontWeight: '700' }}>{result.pm}</span>
                  &nbsp;&nbsp;·&nbsp;&nbsp;
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ background: 'rgba(249,168,37,0.08)', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '6px', padding: '12px 16px', maxWidth: '500px', margin: '0 auto' }}>
                  <div style={{ color: '#f9a825', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Question posée</div>
                  <div style={{ color: '#e8eaf6', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic' }}>"{question}"</div>
                </div>
              </div>

              {/* Les 4 Mères */}
              <div>
                <div style={{ color: '#b0b8d4', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', marginBottom: '12px' }}>Les 4 Mères</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {result.theme.slice(0, 4).map((figIdx, i) => {
                    const fig = FIGURES[figIdx];
                    const color = influenceColor(fig.influenceLevel);
                    return (
                      <div key={i} style={{ textAlign: 'center', background: '#0a0e2e', border: `1px solid ${color}44`, borderRadius: '6px', padding: '12px 8px' }}>
                        <div style={{ color: '#b0b8d4', fontSize: '0.65rem', marginBottom: '6px' }}>Mère {i + 1}</div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                          <FigureDots bits={fig.bits} size="small" />
                        </div>
                        <div style={{ color: '#e8eaf6', fontSize: '0.78rem', fontWeight: '600' }}>{fig.nom}</div>
                        <div style={{ color, fontSize: '0.65rem', marginTop: '3px' }}>{fig.influence}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Sep />

            {/* ── BLOC 2 : Tableau des 16 maisons ── */}
            <Card style={{ marginBottom: '24px' }}>
              <SectionTitle>Thème géomantique — 16 Maisons</SectionTitle>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(249,168,37,0.3)' }}>
                      {['N°', 'Maison', 'Figure', 'Influence'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#f9a825', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.theme.map((figIdx, i) => {
                      const fig = FIGURES[figIdx];
                      const maison = MAISONS[i + 1];
                      const isKey = result.gemini.threeKeyHouses.some(h => h.houseNumber === i + 1);
                      const rowStyle: React.CSSProperties = {
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isKey ? 'rgba(249,168,37,0.07)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                      };
                      return (
                        <tr key={i} style={rowStyle}>
                          <td style={{ padding: '9px 12px', color: isKey ? '#f9a825' : '#b0b8d4', fontWeight: isKey ? '700' : '400', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {isKey ? '✦ ' : ''}{i + 1}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#e8eaf6', fontSize: '0.83rem' }}>
                            {maison.nom}
                            <div style={{ color: '#b0b8d4', fontSize: '0.68rem' }}>{maison.element} · {maison.nature}</div>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FigureDots bits={fig.bits} size="small" />
                              <div>
                                <div style={{ color: '#e8eaf6', fontSize: '0.83rem', fontWeight: '500' }}>{fig.nom}</div>
                                <div style={{ color: '#b0b8d4', fontSize: '0.68rem' }}>{fig.latinName}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <InfluenceBadge influence={fig.influence} level={fig.influenceLevel} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Sep />

            {/* ── BLOC 3 : Synthèse ── */}
            <Card style={{ marginBottom: '24px' }}>
              <SectionTitle>Synthèse du thème</SectionTitle>
              <p style={{ color: '#e8eaf6', lineHeight: '1.8', fontSize: '1rem' }}>{result.gemini.synthesis}</p>
            </Card>

            <Sep />

            {/* ── BLOC 4 : Les 3 maisons clés ── */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', textAlign: 'center' }}>
                ✦ Les 3 maisons clés ✦
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.gemini.threeKeyHouses.map((kh, i) => {
                  const figIdx = result.theme[kh.houseNumber - 1];
                  const fig = FIGURES[figIdx];
                  const color = influenceColor(fig.influenceLevel);
                  return (
                    <div key={i} style={{ background: '#111a55', border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: '8px', padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <FigureDots bits={fig.bits} size="large" />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#f9a825', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                            Maison {kh.houseNumber} — {MAISONS[kh.houseNumber].nom}
                          </div>
                          <div style={{ color: '#e8eaf6', fontSize: '1.15rem', fontWeight: '700', marginBottom: '4px' }}>{fig.nom}</div>
                          <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>{fig.latinName} · {fig.element} · {fig.direction}</div>
                          <InfluenceBadge influence={fig.influence} level={fig.influenceLevel} />
                          {fig.sante && (
                            <div style={{ marginTop: '8px', color: '#b0b8d4', fontSize: '0.78rem' }}>
                              <span style={{ color: '#ef9a9a' }}>Santé : </span>{fig.sante}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#f9a825', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Interprétation</div>
                        <p style={{ color: '#e8eaf6', lineHeight: '1.75', margin: 0 }}>{kh.interpretation}</p>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(249,168,37,0.12)', paddingTop: '12px' }}>
                        <span style={{ color: '#f9a825', fontSize: '0.78rem', fontWeight: '600' }}>Pertinence : </span>
                        <span style={{ color: '#b0b8d4', fontSize: '0.85rem', fontStyle: 'italic' }}>{kh.relevance}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Sep />

            {/* ── BLOC 5 : Réponse directe ── */}
            <Card style={{ marginBottom: '24px', borderColor: 'rgba(249,168,37,0.5)' }}>
              <SectionTitle>Réponse à votre question</SectionTitle>
              <p style={{ color: '#e8eaf6', lineHeight: '1.8', fontSize: '1.05rem', fontStyle: 'italic' }}>{result.gemini.specificAnswer}</p>
            </Card>

            <Sep />

            {/* ── BLOC 6 : Lecture complète + Recommandation ── */}
            <Card style={{ marginBottom: '24px' }}>
              <SectionTitle>Lecture complète du thème</SectionTitle>
              <p style={{ color: '#e8eaf6', lineHeight: '1.8', marginBottom: '20px' }}>{result.gemini.completeReading}</p>
              <div style={{ borderTop: '1px solid rgba(249,168,37,0.15)', paddingTop: '20px' }}>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Recommandation</div>
                <p style={{ color: '#e8eaf6', lineHeight: '1.8', margin: 0 }}>{result.gemini.recommendation}</p>
              </div>
              <div style={{ marginTop: '16px' }}>
                <AudioButton text={`Lecture complète du thème géomantique. ${result.gemini.completeReading} Recommandation : ${result.gemini.recommendation}`} label="Écouter la lecture" isLong={true} />
              </div>
            </Card>

            <Sep />

            {/* ── BLOC 7 : Plantes sacrées ── */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px', textAlign: 'center' }}>✦ Plantes sacrées</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {result.gemini.threeKeyHouses.map(kh => {
                  const fig = FIGURES[result.theme[kh.houseNumber - 1]];
                  return (
                    <div key={kh.houseNumber} style={{ background: '#111a55', border: '1px solid rgba(76,175,80,0.25)', borderLeft: '3px solid #4caf50', borderRadius: '8px', padding: '18px' }}>
                      <div style={{ color: '#4caf50', fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>{fig.plante.nomFrancais}</div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.78rem', fontStyle: 'italic', marginBottom: '8px' }}>{fig.plante.nomScientifique}</div>
                      <div style={{ color: '#e8eaf6', fontSize: '0.82rem', marginBottom: '4px' }}>Nom bambara : <span style={{ color: '#f9a825' }}>{fig.plante.nomBambara}</span></div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.78rem', marginBottom: '12px' }}>Figure : {fig.nom} — Maison {kh.houseNumber}</div>
                      <a href={fig.plante.lienWikipedia} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-block', background: '#f9a825', color: '#0a0e2e', padding: '5px 14px', fontSize: '0.78rem', fontWeight: '700', textDecoration: 'none', borderRadius: '3px' }}>
                        Wikipedia
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            <Sep />

            {/* ── BLOC 8 : Sacrifices ── */}
            <Card style={{ marginBottom: '24px' }}>
              <SectionTitle>Sacrifices recommandés</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {result.gemini.threeKeyHouses.map(kh => {
                  const fig = FIGURES[result.theme[kh.houseNumber - 1]];
                  return (
                    <div key={kh.houseNumber} style={{ background: '#0a0e2e', borderRadius: '6px', padding: '16px', border: '1px solid rgba(249,168,37,0.1)' }}>
                      <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.85rem', marginBottom: '8px' }}>
                        {fig.nom} — Maison {kh.houseNumber} ({MAISONS[kh.houseNumber].nom})
                      </div>
                      <p style={{ color: '#e8eaf6', lineHeight: '1.7', margin: 0 }}>{fig.sacrifice}</p>
                    </div>
                  );
                })}

                {result.gemini.additionalSacrifice.isNeeded && (
                  <div style={{ background: 'rgba(249,168,37,0.07)', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '6px', padding: '18px' }}>
                    <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '10px' }}>Sacrifice supplémentaire recommandé</div>
                    <div style={{ color: '#e8eaf6', fontWeight: '600', marginBottom: '8px' }}>{result.gemini.additionalSacrifice.item}</div>
                    <p style={{ color: '#e8eaf6', lineHeight: '1.7', marginBottom: '8px' }}>{result.gemini.additionalSacrifice.instructions}</p>
                    <p style={{ color: '#b0b8d4', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                      <span style={{ color: '#f9a825' }}>Raison : </span>
                      {result.gemini.additionalSacrifice.reason}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Sep />

            {/* ── BLOC 9 : Conclusion ── */}
            <Card style={{ marginBottom: '32px', textAlign: 'center', borderColor: 'rgba(249,168,37,0.4)' }}>
              <div style={{ color: '#f9a825', fontSize: '1.2rem', fontFamily: 'Noto Naskh Arabic, serif', marginBottom: '12px' }}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم</div>
              <p style={{ color: '#e8eaf6', lineHeight: '1.8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 20px' }}>{result.gemini.conclusion}</p>
              <AudioButton text={`Conclusion de votre consultation géomantique. ${result.gemini.conclusion}`} label="Écouter la conclusion" />
            </Card>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <AudioButton text={fullText} label="Écouter tout le thème" isLong={true} />
              <button onClick={handleDownloadPDF} disabled={downloadingPDF}
                style={{ background: 'transparent', border: '1px solid #f9a825', color: '#f9a825', padding: '8px 20px', borderRadius: '4px', cursor: downloadingPDF ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: downloadingPDF ? 0.7 : 1 }}>
                {downloadingPDF ? 'Génération PDF...' : 'Télécharger PDF'}
              </button>
              <button onClick={() => setResult(null)}
                style={{ background: 'transparent', border: '1px solid rgba(176,184,212,0.4)', color: '#b0b8d4', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                Nouvelle consultation
              </button>
            </div>

          </div>
        )}

      </div>

      {showCreditModal && (
        <CreditModal toolName="la Géomancie Islamique" cost={2} balance={balance} onClose={() => setShowCreditModal(false)} />
      )}
    </div>
  );
}
