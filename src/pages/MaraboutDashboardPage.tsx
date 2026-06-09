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
  telephone_whatsapp: string | null;
  statut: string;
  is_verified: boolean;
  is_featured: boolean;
  abonne_jusqu_au: string | null;
  created_at: string;
}

interface Avis {
  id: string;
  note: number;
  commentaire: string | null;
  created_at: string;
}

type TabId = 'infos' | 'avis' | 'abonnement';

export function MaraboutDashboardPage() {
  const [marabout, setMarabout] = useState<Marabout | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('infos');
  const [editing, setEditing] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [nom, setNom] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [localisation, setLocalisation] = useState('');
  const [biographie, setBiographie] = useState('');
  const [tarif, setTarif] = useState('');
  const [telephone, setTelephone] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: m } = await supabase.from('marabouts').select('*').eq('user_id', user.id).maybeSingle();
    const md = m as Marabout | null;
    setMarabout(md);

    if (md) {
      const { data: a } = await supabase
        .from('marabout_avis')
        .select('id, note, commentaire, created_at')
        .eq('marabout_id', md.id)
        .order('created_at', { ascending: false });
      setAvis((a as Avis[]) ?? []);
      setNom(md.nom);
      setPhotoUrl(md.photo_url ?? '');
      setLocalisation(md.localisation ?? '');
      setBiographie(md.biographie ?? '');
      setTarif(md.tarif_consultation?.toString() ?? '');
      setTelephone(md.telephone_whatsapp ?? '');
    }
    setLoading(false);
  }

  async function saveChanges() {
    if (!marabout) return;
    setSaveMsg('');
    const { error } = await supabase.from('marabouts').update({
      nom: nom.trim(),
      photo_url: photoUrl.trim() || null,
      localisation: localisation.trim() || null,
      biographie: biographie.trim() || null,
      tarif_consultation: tarif ? parseInt(tarif, 10) : null,
      telephone_whatsapp: telephone.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', marabout.id);
    if (error) { setSaveMsg('Erreur : ' + error.message); return; }
    setSaveMsg('Profil mis à jour.');
    setEditing(false);
    await loadData();
  }

  function avgNote() {
    if (avis.length === 0) return null;
    return (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1);
  }

  function statutInfo(s: string) {
    if (s === 'active')    return { text: 'Actif',       color: '#4caf50' };
    if (s === 'pending')   return { text: 'En attente',  color: '#f9a825' };
    return                        { text: 'Suspendu',    color: '#ef5350' };
  }

  function whatsappRenewal() {
    const msg = encodeURIComponent(`Bonjour, je souhaite renouveler mon abonnement marabout sur Secret Divin (5 000 FCFA/mois). Nom : ${marabout?.nom ?? ''}`);
    return `https://wa.me/message/ADMINWHATSAPP?text=${msg}`;
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: '#0a0e2e',
    border: '1px solid rgba(249,168,37,0.25)',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  if (loading) {
    return <div style={{ padding: '120px 20px', textAlign: 'center', color: '#b0b8d4' }}>Chargement...</div>;
  }

  if (!marabout) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: '20px', textAlign: 'center', color: 'white' }}>
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '40px' }}>
          <h2 style={{ color: '#f9a825', marginBottom: '12px' }}>Pas encore inscrit</h2>
          <p style={{ color: '#b0b8d4', marginBottom: '24px' }}>
            Vous n'êtes pas encore inscrit comme guide spirituel.
          </p>
          <Link to="/marabouts/inscription" style={{ background: '#f9a825', color: '#1a237e', padding: '11px 24px', fontWeight: '700', textDecoration: 'none', borderRadius: '4px' }}>
            S'inscrire maintenant
          </Link>
        </div>
      </div>
    );
  }

  const sl = statutInfo(marabout.statut);
  const avg = avgNote();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f9a825', marginBottom: '6px' }}>
          Mon Espace Marabout
        </h1>
        <p style={{ color: '#b0b8d4', fontSize: '0.9rem', marginBottom: '10px' }}>{marabout.nom}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ border: `1px solid ${sl.color}`, color: sl.color, padding: '3px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
            {sl.text}
          </span>
          {marabout.is_verified && (
            <span style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.35)', color: '#4caf50', padding: '3px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
              Vérifié
            </span>
          )}
        </div>
        {marabout.statut === 'active' && (
          <div style={{ marginTop: '14px' }}>
            <Link to={`/marabouts/${marabout.id}`} style={{ color: '#b0b8d4', fontSize: '0.82rem', textDecoration: 'none' }}>
              Voir mon profil public ›
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Note moyenne', value: avg !== null ? `${avg}/5` : '—' },
          { label: "Nombre d'avis", value: avis.length.toString() },
          { label: 'Abonnement jusqu\'au', value: marabout.abonne_jusqu_au ? new Date(marabout.abonne_jusqu_au).toLocaleDateString('fr-FR') : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f9a825', marginBottom: '4px' }}>{value}</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.75rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {([['infos', 'Profil'], ['avis', 'Avis'], ['abonnement', 'Abonnement']] as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? '#f9a825' : 'transparent',
              border: '1px solid #f9a825',
              color: tab === id ? '#1a237e' : '#f9a825',
              padding: '9px 20px',
              cursor: 'pointer',
              fontWeight: tab === id ? '700' : '600',
              fontSize: '0.86rem',
              borderRadius: '20px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Profil */}
      {tab === 'infos' && (
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', margin: 0 }}>Informations du profil</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '7px 16px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.82rem' }}>
                Modifier
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {([
                ['Nom', nom, setNom, 'text', ''],
                ['URL photo', photoUrl, setPhotoUrl, 'url', 'https://...'],
                ['Localisation', localisation, setLocalisation, 'text', 'Ville, pays'],
                ['WhatsApp', telephone, setTelephone, 'tel', '+221...'],
                ['Tarif (FCFA)', tarif, setTarif, 'number', '5000'],
              ] as [string, string, (v: string) => void, string, string][]).map(([label, value, set, type, ph]) => (
                <div key={label}>
                  <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '5px' }}>{label}</label>
                  <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '5px' }}>Biographie</label>
                <textarea
                  rows={5}
                  value={biographie}
                  onChange={e => setBiographie(e.target.value)}
                  style={{ ...inp, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={saveChanges} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '0.87rem' }}>
                  Enregistrer
                </button>
                <button onClick={() => { setEditing(false); setSaveMsg(''); }} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.35)', color: '#b0b8d4', padding: '10px 20px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.87rem' }}>
                  Annuler
                </button>
                {saveMsg && <span style={{ color: saveMsg.startsWith('Erreur') ? '#ef5350' : '#4caf50', fontSize: '0.83rem' }}>{saveMsg}</span>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Nom', marabout.nom],
                ['Localisation', marabout.localisation ?? '—'],
                ['WhatsApp', marabout.telephone_whatsapp ?? '—'],
                ['Tarif', marabout.tarif_consultation ? `${marabout.tarif_consultation.toLocaleString('fr-FR')} FCFA` : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ color: '#b0b8d4', fontSize: '0.85rem', minWidth: '120px', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'white', fontSize: '0.85rem' }}>{value}</span>
                </div>
              ))}
              {marabout.biographie && (
                <div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '6px' }}>Biographie</div>
                  <p style={{ color: 'white', fontSize: '0.87rem', lineHeight: '1.65', margin: 0 }}>{marabout.biographie}</p>
                </div>
              )}
              <div>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '8px' }}>Spécialités</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {marabout.specialites.map(s => (
                    <span key={s} style={{ background: 'rgba(249,168,37,0.08)', border: '1px solid rgba(249,168,37,0.22)', color: '#f9a825', padding: '3px 10px', borderRadius: '10px', fontSize: '0.78rem' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Onglet Avis */}
      {tab === 'avis' && (
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px' }}>
          <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '20px' }}>
            Avis reçus {avg !== null ? `— Moyenne ${avg}/5` : ''}
          </h2>
          {avis.length === 0 ? (
            <div style={{ color: '#b0b8d4', textAlign: 'center', padding: '32px' }}>Aucun avis pour le moment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {avis.map(a => (
                <div key={a.id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.08)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} style={{ color: n <= a.note ? '#f9a825' : 'rgba(249,168,37,0.18)', fontSize: '0.85rem' }}>✦</span>
                      ))}
                    </div>
                    <span style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {a.commentaire && <p style={{ color: '#b0b8d4', fontSize: '0.85rem', margin: 0, lineHeight: '1.55' }}>{a.commentaire}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Abonnement */}
      {tab === 'abonnement' && (
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px' }}>
          <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '20px' }}>Abonnement</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {[
              ['Statut', <span style={{ color: sl.color, fontWeight: '600' }}>{sl.text}</span>],
              ['Valide jusqu\'au', marabout.abonne_jusqu_au
                ? new Date(marabout.abonne_jusqu_au).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Non défini'],
              ['Tarif mensuel', <span style={{ color: '#f9a825', fontWeight: '600' }}>5 000 FCFA / mois</span>],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: '#b0b8d4', minWidth: '160px', fontSize: '0.88rem', flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'white', fontSize: '0.88rem' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '0 0 24px', fontSize: '0.85rem' }}>{SEP}</div>

          <div style={{ background: 'rgba(249,168,37,0.05)', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ color: 'white', fontWeight: '600', marginBottom: '6px' }}>Renouveler l'abonnement</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.87rem', lineHeight: '1.65' }}>
              Envoyez <strong style={{ color: '#f9a825' }}>5 000 FCFA</strong> via WhatsApp pour prolonger votre abonnement d'un mois.
            </div>
          </div>

          <a
            href={whatsappRenewal()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#25d366', color: 'white', padding: '11px 24px', fontWeight: '700', textDecoration: 'none', borderRadius: '4px' }}
          >
            Renouveler via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
