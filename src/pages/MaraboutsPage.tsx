import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const SEP = '——— ✦ ———';

interface Marabout {
  id: string;
  nom: string;
  photo_url: string | null;
  specialites: string[];
  localisation: string | null;
  biographie: string | null;
  tarif_consultation: number | null;
  is_verified: boolean;
  is_featured: boolean;
}

const ALL_SPECIALITES = [
  'Géomancie',
  'Carrés magiques',
  'Interprétation des rêves',
  'Poids mystique',
  'Plantes mystiques',
  'Talismans',
  'Mariage & Amour',
  'Protection spirituelle',
  'Désenvoutement',
  'Récitation coranique',
];

export function MaraboutsPage() {
  const [marabouts, setMarabouts] = useState<Marabout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpec, setFilterSpec] = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  const [avisCount, setAvisCount] = useState<Record<string, number>>({});

  useEffect(() => { loadMarabouts(); }, []);

  async function loadMarabouts() {
    setLoading(true);
    const { data } = await supabase
      .from('marabouts')
      .select('id, nom, photo_url, specialites, localisation, biographie, tarif_consultation, is_verified, is_featured')
      .eq('statut', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    const list = (data as Marabout[]) ?? [];
    setMarabouts(list);

    if (list.length > 0) {
      const ids = list.map(m => m.id);
      const { data: avis } = await supabase
        .from('marabout_avis')
        .select('marabout_id')
        .in('marabout_id', ids);
      const counts: Record<string, number> = {};
      ((avis ?? []) as { marabout_id: string }[]).forEach(a => {
        counts[a.marabout_id] = (counts[a.marabout_id] ?? 0) + 1;
      });
      setAvisCount(counts);
    }
    setLoading(false);
  }

  const filtered = marabouts.filter(m => {
    const specOk = !filterSpec || m.specialites.some(s => s.toLowerCase().includes(filterSpec.toLowerCase()));
    const locOk = !filterLoc || (m.localisation ?? '').toLowerCase().includes(filterLoc.toLowerCase());
    return specOk && locOk;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
          Marabouts & Guides Spirituels
        </h1>
        <p style={{ color: '#b0b8d4', fontSize: '1rem' }}>
          Trouvez un guide spirituel de confiance pour vous accompagner dans votre quête intérieure.
        </p>
        <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '20px 0 0', fontSize: '0.85rem' }}>
          {SEP}
        </div>
      </div>

      {/* Filtres */}
      <div style={{
        background: '#111a55',
        border: '1px solid rgba(249,168,37,0.2)',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: '12px',
        alignItems: 'end',
      }}>
        <div>
          <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '6px' }}>Spécialité</label>
          <select
            value={filterSpec}
            onChange={e => setFilterSpec(e.target.value)}
            style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.25)', color: 'white', padding: '10px 12px', borderRadius: '4px', fontSize: '0.9rem' }}
          >
            <option value="">Toutes les spécialités</option>
            {ALL_SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '6px' }}>Localisation</label>
          <input
            type="text"
            placeholder="Ville, pays..."
            value={filterLoc}
            onChange={e => setFilterLoc(e.target.value)}
            style={{ width: '100%', background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.25)', color: 'white', padding: '10px 12px', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
        </div>
        <button
          onClick={() => { setFilterSpec(''); setFilterLoc(''); }}
          style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#b0b8d4', padding: '10px 16px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }}
        >
          Réinitialiser
        </button>
      </div>

      {/* CTA inscription */}
      <div style={{
        background: 'rgba(249,168,37,0.07)',
        border: '1px solid rgba(249,168,37,0.25)',
        borderRadius: '10px',
        padding: '18px 24px',
        marginBottom: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>Vous êtes un guide spirituel ?</div>
          <div style={{ color: '#b0b8d4', fontSize: '0.87rem' }}>
            Rejoignez notre réseau — 5 000 FCFA / mois, inscription et paiement via WhatsApp.
          </div>
        </div>
        <Link to="/marabouts/inscription" style={{
          background: '#f9a825',
          color: '#1a237e',
          padding: '11px 24px',
          fontWeight: '700',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '0.9rem',
          whiteSpace: 'nowrap',
        }}>
          Inscription marabout
        </Link>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '60px' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '60px' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Aucun guide spirituel trouvé</div>
          <div style={{ fontSize: '0.9rem' }}>Modifiez vos critères ou revenez bientôt.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filtered.map(m => (
            <div key={m.id} style={{
              background: '#111a55',
              border: m.is_featured ? '1px solid rgba(249,168,37,0.6)' : '1px solid rgba(249,168,37,0.15)',
              borderRadius: '10px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {m.is_featured && (
                <div style={{ background: '#f9a825', color: '#1a237e', textAlign: 'center', padding: '4px 0', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '2px' }}>
                  RECOMMANDÉ
                </div>
              )}
              {/* Photo */}
              <div style={{ height: '160px', background: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(249,168,37,0.08)', border: '2px solid rgba(249,168,37,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#f9a825', fontSize: '2rem', fontFamily: 'Noto Naskh Arabic, serif' }}>م</span>
                  </div>
                )}
              </div>
              {/* Infos */}
              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>{m.nom}</span>
                  {m.is_verified && (
                    <span style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.35)', color: '#4caf50', padding: '1px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600' }}>
                      Vérifié
                    </span>
                  )}
                </div>
                {m.localisation && (
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '8px' }}>{m.localisation}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {m.specialites.slice(0, 3).map(s => (
                    <span key={s} style={{ background: 'rgba(249,168,37,0.08)', border: '1px solid rgba(249,168,37,0.22)', color: '#f9a825', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>
                      {s}
                    </span>
                  ))}
                  {m.specialites.length > 3 && (
                    <span style={{ color: '#b0b8d4', fontSize: '0.7rem', padding: '2px 4px' }}>+{m.specialites.length - 3}</span>
                  )}
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.78rem', marginBottom: '12px' }}>
                  {avisCount[m.id] ?? 0} avis
                  {m.tarif_consultation ? (
                    <span style={{ marginLeft: '12px', color: '#f9a825' }}>
                      {m.tarif_consultation.toLocaleString('fr-FR')} FCFA
                    </span>
                  ) : null}
                </div>
                {m.biographie && (
                  <p style={{
                    color: '#b0b8d4', fontSize: '0.83rem', lineHeight: '1.5', marginBottom: '14px', flex: 1,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
                  }}>
                    {m.biographie}
                  </p>
                )}
                <Link to={`/marabouts/${m.id}`} style={{
                  display: 'block',
                  background: '#f9a825',
                  color: '#1a237e',
                  padding: '10px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  textAlign: 'center',
                  borderRadius: '4px',
                  fontSize: '0.87rem',
                  marginTop: 'auto',
                }}>
                  Voir le profil
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
