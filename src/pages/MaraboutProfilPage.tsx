import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  is_verified: boolean;
  is_featured: boolean;
}

interface Avis {
  id: string;
  user_id: string;
  note: number;
  commentaire: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
}

export function MaraboutProfilPage() {
  const { id } = useParams<{ id: string }>();
  const [marabout, setMarabout] = useState<Marabout | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [myAvis, setMyAvis] = useState<Avis | null>(null);
  const [noteForm, setNoteForm] = useState(5);
  const [commentForm, setCommentForm] = useState('');
  const [avisLoading, setAvisLoading] = useState(false);
  const [avisMsg, setAvisMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) =>
      setCurrentUser(user ? { id: user.id } : null)
    );
    loadData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    if (!id) return;
    setLoading(true);
    const [mRes, aRes] = await Promise.all([
      supabase.from('marabouts').select('id, nom, photo_url, specialites, localisation, biographie, tarif_consultation, telephone_whatsapp, is_verified, is_featured').eq('id', id).single(),
      supabase.from('marabout_avis').select('*').eq('marabout_id', id).order('created_at', { ascending: false }),
    ]);
    const m = mRes.data as Marabout | null;
    const avisList = (aRes.data as Avis[]) ?? [];
    setMarabout(m);
    setAvis(avisList);

    if (avisList.length > 0) {
      const uids = [...new Set(avisList.map(a => a.user_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name')
        .in('user_id', uids);
      setProfiles((profs as UserProfile[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (currentUser) {
      const found = avis.find(a => a.user_id === currentUser.id) ?? null;
      setMyAvis(found);
      if (found) {
        setNoteForm(found.note);
        setCommentForm(found.commentaire ?? '');
      }
    }
  }, [currentUser, avis]);

  async function submitAvis() {
    if (!currentUser || !id) return;
    setAvisLoading(true);
    setAvisMsg('');
    const payload = {
      marabout_id: id,
      user_id: currentUser.id,
      note: noteForm,
      commentaire: commentForm.trim() || null,
    };
    let error;
    if (myAvis) {
      ({ error } = await supabase.from('marabout_avis').update(payload).eq('id', myAvis.id));
    } else {
      ({ error } = await supabase.from('marabout_avis').insert(payload));
    }
    if (error) {
      setAvisMsg('Erreur : ' + error.message);
    } else {
      setAvisMsg('Votre avis a été enregistré.');
      await loadData();
    }
    setAvisLoading(false);
  }

  function nameOf(uid: string) {
    const p = profiles.find(pr => pr.user_id === uid);
    return p?.display_name ?? p?.first_name ?? 'Membre';
  }

  function avgNote() {
    if (avis.length === 0) return null;
    return (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1);
  }

  function whatsappUrl() {
    if (!marabout?.telephone_whatsapp) return '#';
    const phone = marabout.telephone_whatsapp.replace(/[^\d+]/g, '');
    const msg = encodeURIComponent(`Bonjour, je vous contacte via Secret Divin. Je souhaite une consultation spirituelle.`);
    return `https://wa.me/${phone}?text=${msg}`;
  }

  if (loading) {
    return <div style={{ padding: '120px 20px', textAlign: 'center', color: '#b0b8d4' }}>Chargement...</div>;
  }
  if (!marabout) {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', color: '#b0b8d4' }}>
        <div style={{ marginBottom: '16px' }}>Guide introuvable.</div>
        <Link to="/marabouts" style={{ color: '#f9a825' }}>Retour à la liste</Link>
      </div>
    );
  }

  const avg = avgNote();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '24px', fontSize: '0.85rem' }}>
        <Link to="/marabouts" style={{ color: '#b0b8d4', textDecoration: 'none' }}>Marabouts</Link>
        <span style={{ color: '#b0b8d4', margin: '0 8px' }}>›</span>
        <span style={{ color: '#f9a825' }}>{marabout.nom}</span>
      </div>

      {/* Carte profil */}
      <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '12px', padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Photo */}
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden',
            border: '2px solid rgba(249,168,37,0.4)', flexShrink: 0,
            background: '#0a0e2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {marabout.photo_url ? (
              <img src={marabout.photo_url} alt={marabout.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#f9a825', fontSize: '3rem', fontFamily: 'Noto Naskh Arabic, serif' }}>م</span>
            )}
          </div>

          {/* Infos */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'white', margin: 0 }}>{marabout.nom}</h1>
              {marabout.is_verified && (
                <span style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.35)', color: '#4caf50', padding: '2px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '600' }}>
                  Vérifié
                </span>
              )}
            </div>
            {marabout.localisation && (
              <div style={{ color: '#b0b8d4', fontSize: '0.9rem', marginBottom: '10px' }}>{marabout.localisation}</div>
            )}
            {avg !== null && (
              <div style={{ color: '#f9a825', fontWeight: '600', marginBottom: '10px', fontSize: '0.9rem' }}>
                {avg} / 5 — {avis.length} avis
              </div>
            )}
            {marabout.tarif_consultation && (
              <div style={{ color: '#b0b8d4', fontSize: '0.88rem', marginBottom: '10px' }}>
                Tarif consultation :&nbsp;
                <span style={{ color: '#f9a825', fontWeight: '600' }}>
                  {marabout.tarif_consultation.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
              {marabout.specialites.map(s => (
                <span key={s} style={{ background: 'rgba(249,168,37,0.08)', border: '1px solid rgba(249,168,37,0.22)', color: '#f9a825', padding: '3px 10px', borderRadius: '10px', fontSize: '0.78rem' }}>
                  {s}
                </span>
              ))}
            </div>
            {marabout.telephone_whatsapp && (
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#25d366', color: 'white', padding: '11px 24px', fontWeight: '700', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9rem' }}
              >
                Contacter via WhatsApp
              </a>
            )}
          </div>
        </div>

        {marabout.biographie && (
          <>
            <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '24px 0 18px', fontSize: '0.85rem' }}>{SEP}</div>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '10px' }}>Biographie</h2>
            <p style={{ color: '#b0b8d4', lineHeight: '1.7', fontSize: '0.92rem', margin: 0 }}>{marabout.biographie}</p>
          </>
        )}
      </div>

      {/* Avis */}
      <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '12px', padding: '28px' }}>
        <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', marginBottom: '20px' }}>Avis des membres</h2>

        {/* Formulaire */}
        {currentUser ? (
          <div style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '18px', marginBottom: '24px' }}>
            <div style={{ color: 'white', fontWeight: '600', marginBottom: '12px', fontSize: '0.9rem' }}>
              {myAvis ? 'Modifier votre avis' : 'Laisser un avis'}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Note :</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setNoteForm(n)}
                  style={{
                    background: n <= noteForm ? '#f9a825' : 'transparent',
                    border: '1px solid rgba(249,168,37,0.4)',
                    color: n <= noteForm ? '#1a237e' : '#f9a825',
                    width: '32px', height: '32px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="Votre commentaire (optionnel)"
              value={commentForm}
              onChange={e => setCommentForm(e.target.value)}
              style={{ width: '100%', background: '#111a55', border: '1px solid rgba(249,168,37,0.18)', color: 'white', padding: '10px', borderRadius: '4px', resize: 'vertical', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={submitAvis}
                disabled={avisLoading}
                style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '9px 20px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }}
              >
                {avisLoading ? 'Envoi...' : 'Publier'}
              </button>
              {avisMsg && (
                <span style={{ color: avisMsg.startsWith('Erreur') ? '#ef5350' : '#4caf50', fontSize: '0.83rem' }}>
                  {avisMsg}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(249,168,37,0.04)', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '14px', marginBottom: '20px', color: '#b0b8d4', fontSize: '0.87rem' }}>
            <Link to="/auth" style={{ color: '#f9a825' }}>Connectez-vous</Link> pour laisser un avis.
          </div>
        )}

        {/* Liste des avis */}
        {avis.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>
            Aucun avis pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {avis.map(a => (
              <div key={a.id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '0.87rem' }}>{nameOf(a.user_id)}</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} style={{ color: n <= a.note ? '#f9a825' : 'rgba(249,168,37,0.18)', fontSize: '0.8rem' }}>✦</span>
                    ))}
                  </div>
                </div>
                {a.commentaire && (
                  <p style={{ color: '#b0b8d4', fontSize: '0.85rem', margin: 0, lineHeight: '1.55' }}>{a.commentaire}</p>
                )}
                <div style={{ color: '#b0b8d4', fontSize: '0.72rem', marginTop: '8px', opacity: 0.5 }}>
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
