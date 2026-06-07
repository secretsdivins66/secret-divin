import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { TOOL_COSTS } from '../utils/mystique';

const TOOLS = [
  { key: 'poids-mystique',  label: 'Poids Mystique',   icon: '⚖',  desc: 'Calcule la valeur Abjad de ton prénom',     path: '/poids-mystique' },
  { key: 'carres-magiques', label: 'Carrés Magiques',  icon: '◈',  desc: 'Génère des wafq personnalisés',              path: '/carres-magiques' },
  { key: 'destin',          label: 'Destin',            icon: '✦',  desc: 'Découvre les secrets de ton chemin',         path: '/destin' },
  { key: 'secrets',         label: 'Secrets des Noms', icon: '🔮', desc: 'Interprétation spirituelle de ton nom',       path: '/secrets' },
  { key: 'geomancie',       label: 'Géomancie',         icon: '☽',  desc: 'Lecture des figures géomantiques',           path: '/geomancie' },
  { key: 'compatibilite',   label: 'Compatibilité',     icon: '♡',  desc: 'Analyse la compatibilité entre deux âmes',   path: '/compatibilite' },
  { key: 'reves',           label: 'Rêves',             icon: '💭', desc: 'Interprétation islamique des rêves',         path: '/reves' },
  { key: 'plantes',         label: 'Plantes',           icon: '🌿', desc: 'Propriétés spirituelles des plantes',        path: '/plantes' },
  { key: 'jours',           label: 'Jours Fastes',      icon: '📅', desc: 'Trouve les jours propices pour agir',        path: '/jours' },
  { key: 'attraper',        label: 'Attraper',          icon: '🎯', desc: 'Méthodes de fixation et de protection',      path: '/attraper' },
  { key: 'tutoriels',       label: 'Tutoriels',         icon: '📖', desc: 'Guides gratuits sur les sciences ésotériques', path: '/tutoriels' },
  { key: 'formation',       label: 'Formation',         icon: '🎓', desc: 'Programme complet de maîtrise',              path: '/formation' },
];

export function DashboardPage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string; name?: string } } | null>(null);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as typeof user);
        supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setCredits((data as { credits: number }).credits ?? 0);
          });
      }
    });
  }, []);

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'Utilisateur';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e2e', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '700' }}>
              Bienvenue, <span style={{ color: '#f9a825' }}>{displayName}</span> ✦
            </h1>
            <p style={{ color: '#b0b8d4', marginTop: '6px' }}>Que souhaitez-vous explorer aujourd'hui ?</p>
          </div>
          <div style={{
            background: 'rgba(249,168,37,0.15)',
            border: '1px solid rgba(249,168,37,0.5)',
            borderRadius: '24px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ color: '#f9a825', fontSize: '1.1rem' }}>✦</span>
            <span style={{ color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>{credits}</span>
            <span style={{ color: '#b0b8d4', fontSize: '0.9rem' }}>crédits</span>
            <Link to="/credits" style={{ color: '#f9a825', fontSize: '0.8rem', textDecoration: 'none', marginLeft: '6px', opacity: 0.8 }}>+ Recharger</Link>
          </div>
        </div>

        {/* Séparateur */}
        <div className="separateur" style={{ marginBottom: '28px' }}>✦</div>

        {/* Grille des outils */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {TOOLS.map(tool => {
            const cost = TOOL_COSTS[tool.key] ?? 2;
            const isFree = cost === 0;
            return (
              <Link
                key={tool.key}
                to={tool.path}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.1)',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(249,168,37,0.4)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(249,168,37,0.1)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.8rem' }}>{tool.icon}</span>
                    <span style={{
                      background: isFree ? 'rgba(76,175,80,0.2)' : 'rgba(249,168,37,0.15)',
                      color: isFree ? '#81c784' : '#f9a825',
                      border: `1px solid ${isFree ? 'rgba(76,175,80,0.4)' : 'rgba(249,168,37,0.4)'}`,
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                    }}>
                      {isFree ? 'GRATUIT' : `${cost} crédit${cost > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>{tool.label}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.85rem', lineHeight: '1.4' }}>{tool.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
