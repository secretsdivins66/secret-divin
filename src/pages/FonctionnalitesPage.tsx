import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';

const SEP = '——— ✦ ———';

interface ToolInfo {
  icon: string;
  name: string;
  path: string;
  cost: number | null;
  desc: string;
  obtiens: string[];
}

const TOOLS: ToolInfo[] = [
  {
    icon: '◈',
    name: 'Poids Mystique',
    path: '/poids-mystique',
    cost: 0,
    desc: "Découvrez votre poids ésotérique selon la table Abjad, fondement des sciences mystiques islamiques. Ce calcul révèle votre valeur numérique, votre élément spirituel et vos qualités cachées — porte d'entrée vers toutes les autres sciences.",
    obtiens: [
      'Poids Abjad calculé avec précision',
      'Élément spirituel : Feu, Eau, Terre ou Air',
      'Qualités spirituelles et défis de vie',
      'Base pour tous les calculs mystiques',
    ],
  },
  {
    icon: '◇',
    name: 'Carrés Magiques',
    path: '/carres-magiques',
    cost: 2,
    desc: 'Générez un carré magique personnalisé basé sur votre poids mystique. Utilisés depuis des siècles en talisman et en protection, ces carrés concentrent une énergie spirituelle précise adaptée à votre profil.',
    obtiens: [
      'Carré 3×3, 4×4 ou 5×5 selon votre profil',
      'Nom divin associé et verset de protection',
      'Instructions pour le tracé rituel',
      'Conseils d\'utilisation et de conservation',
    ],
  },
  {
    icon: '✦',
    name: 'Destin & Vocation',
    path: '/destin',
    cost: 2,
    desc: 'Révèle votre vocation spirituelle, vos défis de vie et votre mission selon les sciences ésotériques islamiques. Une analyse profonde qui éclaire votre chemin existentiel et vos orientations prioritaires.',
    obtiens: [
      'Analyse de votre destin spirituel',
      'Identification de votre vocation',
      'Défis et atouts selon votre profil',
      'Guidance coranique personnalisée',
    ],
  },
  {
    icon: '⊕',
    name: 'Géomancie',
    path: '/geomancie',
    cost: 2,
    desc: "L'Ilm al-Raml — la géomancie islamique — révèle les tendances de votre situation à travers les 16 figures géomantiques. Posez une question précise et obtenez une réponse fondée sur une tradition millénaire.",
    obtiens: [
      'Tableau complet des 16 figures',
      'Analyse détaillée de votre question',
      'Réponse géomantique argumentée',
      'Conseils pratiques et prières associées',
    ],
  },
  {
    icon: '◎',
    name: 'Interprétation des Rêves',
    path: '/reves',
    cost: 2,
    desc: "Interprétez vos rêves selon les traditions de l'imam Ibn Sirin et les sciences islamiques des songes. Chaque rêve est un message ; découvrez ce que l'invisible vous communique.",
    obtiens: [
      'Interprétation symbolique complète',
      'Contexte islamique et hadiths',
      'Guidance spirituelle du rêve',
      'Actions et prières recommandées',
    ],
  },
  {
    icon: '⊞',
    name: 'Plantes Mystiques',
    path: '/plantes',
    cost: 2,
    desc: 'Découvrez les plantes sacrées adaptées à votre objectif spirituel, avec leurs rituels de préparation, leurs versets et leurs modes d\'utilisation issus de la tradition ésotérique islamique.',
    obtiens: [
      'Plantes recommandées avec propriétés',
      'Rituels de préparation étape par étape',
      'Versets coraniques et invocations',
      'Instructions complètes d\'utilisation',
    ],
  },
  {
    icon: '⊗',
    name: 'Compatibilité Spirituelle',
    path: '/compatibilite',
    cost: 2,
    desc: 'Analysez la compatibilité spirituelle entre deux personnes selon leurs poids mystiques, éléments ésotériques et profils numériques. Une lecture profonde des affinités et tensions entre deux âmes.',
    obtiens: [
      'Score de compatibilité chiffré',
      'Analyse des éléments des deux profils',
      'Conseils pour harmoniser la relation',
      'Protection et prières pour le couple',
    ],
  },
  {
    icon: '◆',
    name: 'Attraper / Talisman',
    path: '/attraper',
    cost: 2,
    desc: "Créez un talisman personnalisé pour influencer une situation ou une personne, basé sur votre poids mystique, une invocation sacrée et un carré magique dédié. Un outil spirituel puissant avec mode d'emploi complet.",
    obtiens: [
      'Carré magique invocatoire sur mesure',
      'Instructions précises d\'écriture et de rituel',
      'Zikr en 7 étapes avec invocations arabes',
      'Plantes et parfums complémentaires',
    ],
  },
  {
    icon: '⊘',
    name: 'Secrets Mystiques',
    path: '/secrets',
    cost: 2,
    desc: 'Accédez aux connaissances ésotériques les plus avancées adaptées à votre profil spirituel unique. Des secrets issus des grandes traditions mystiques islamiques, personnalisés selon votre poids et votre quête.',
    obtiens: [
      'Secrets spirituels personnalisés',
      'Noms divins et leurs applications',
      'Pratiques avancées de purification',
      'Guidance pour l\'éveil spirituel',
    ],
  },
  {
    icon: '◉',
    name: 'Jours Favorables',
    path: '/jours',
    cost: 2,
    desc: 'Identifiez les jours et heures propices pour vos projets, rituels et décisions importantes selon le calendrier mystique islamique. Agissez en harmonie avec les cycles spirituels.',
    obtiens: [
      'Calendrier personnalisé du mois',
      'Jours favorables et périodes à éviter',
      'Actions recommandées par période',
      'Prières et protections adaptées',
    ],
  },
  {
    icon: '◐',
    name: 'Tutoriels',
    path: '/tutoriels',
    cost: 0,
    desc: 'Une bibliothèque de 15 tutoriels complets sur les sciences ésotériques islamiques : calculs Abjad, carrés magiques, géomancie et bien plus encore. Accès gratuit et illimité.',
    obtiens: [
      '15 tutoriels détaillés générés par IA',
      'Exemples concrets et cas pratiques',
      'Points clés et erreurs courantes',
      'Navigation entre tutoriels connexes',
    ],
  },
  {
    icon: '◑',
    name: 'Formation Complète',
    path: '/formation',
    cost: 2,
    desc: 'Un programme structuré sur 3 niveaux et 9 modules pour maîtriser les sciences ésotériques islamiques, de débutant à expert. Avec quiz de validation et progression sauvegardée.',
    obtiens: [
      '27 leçons progressives sur 9 modules',
      'Quiz de validation — minimum 80%',
      'Progression sauvegardée automatiquement',
      'Déblocage progressif des niveaux',
    ],
  },
];

export function FonctionnalitesPage() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* En-tête */}
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
            Toutes les fonctionnalités
          </h1>
          <p style={{ color: '#b0b8d4', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            12 outils de sciences ésotériques islamiques, génération par intelligence artificielle, résultats personnalisés
          </p>
          <div style={{ color: '#b0b8d4', marginTop: '16px', letterSpacing: '3px' }}>{SEP}</div>
        </div>
      </Reveal>

      {/* Grille des outils */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '60px' }}>
        {TOOLS.map((tool, i) => (
          <Reveal key={tool.path} delay={i * 40}>
            <div style={{
              background: '#111a55',
              border: '1px solid rgba(249,168,37,0.2)',
              borderRadius: '10px',
              padding: '28px',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '24px',
              alignItems: 'start',
            }}>
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                background: 'rgba(249,168,37,0.1)',
                border: '1px solid rgba(249,168,37,0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                color: '#f9a825',
                flexShrink: 0,
              }}>
                {tool.icon}
              </div>

              {/* Content */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', margin: 0 }}>{tool.name}</h2>
                  <span style={{
                    background: tool.cost === 0 ? 'rgba(76,175,80,0.15)' : 'rgba(249,168,37,0.12)',
                    border: `1px solid ${tool.cost === 0 ? 'rgba(76,175,80,0.4)' : 'rgba(249,168,37,0.3)'}`,
                    color: tool.cost === 0 ? '#4caf50' : '#f9a825',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}>
                    {tool.cost === 0 ? 'GRATUIT' : `${tool.cost} crédits`}
                  </span>
                </div>
                <p style={{ color: '#b0b8d4', fontSize: '0.92rem', lineHeight: '1.65', marginBottom: '14px' }}>
                  {tool.desc}
                </p>
                <div>
                  <div style={{ color: '#f9a825', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Ce que vous obtenez
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
                    {tool.obtiens.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#b0b8d4', fontSize: '0.88rem' }}>
                        <span style={{ color: '#f9a825', flexShrink: 0, marginTop: '2px' }}>✦</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ flexShrink: 0 }}>
                <Link
                  to={tool.path}
                  style={{
                    display: 'block',
                    background: 'transparent',
                    border: '1px solid rgba(249,168,37,0.4)',
                    color: '#f9a825',
                    padding: '10px 18px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  Accéder
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* CTA inscription */}
      <Reveal>
        <div style={{
          background: 'linear-gradient(135deg, rgba(249,168,37,0.1), rgba(26,35,126,0.3))',
          border: '1px solid rgba(249,168,37,0.3)',
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <div style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1.5rem', direction: 'rtl', marginBottom: '16px' }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h2 style={{ color: 'white', fontWeight: '700', fontSize: '1.6rem', marginBottom: '10px' }}>
            Commencez dès aujourd'hui
          </h2>
          <p style={{ color: '#b0b8d4', marginBottom: '28px', maxWidth: '500px', margin: '0 auto 28px', lineHeight: '1.7' }}>
            Créez votre compte gratuitement. Le poids mystique est disponible sans crédit. Explorez, calculez, comprenez.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/auth"
              style={{
                background: '#f9a825',
                color: '#1a237e',
                padding: '14px 32px',
                fontWeight: '700',
                textDecoration: 'none',
                fontSize: '1rem',
                borderRadius: '4px',
              }}
            >
              Créer un compte gratuit
            </Link>
            <Link
              to="/credits"
              style={{
                background: 'transparent',
                border: '1px solid rgba(249,168,37,0.5)',
                color: '#f9a825',
                padding: '14px 32px',
                textDecoration: 'none',
                fontSize: '1rem',
                borderRadius: '4px',
              }}
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
