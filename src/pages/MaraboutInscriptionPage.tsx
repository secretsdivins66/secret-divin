import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const SEP = '——— ✦ ———';

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

export function MaraboutInscriptionPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nom, setNom] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [localisation, setLocalisation] = useState('');
  const [biographie, setBiographie] = useState('');
  const [tarif, setTarif] = useState('');
  const [telephone, setTelephone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUserId(user.id);
      const { data } = await supabase.from('marabouts').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setAlreadyRegistered(true);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSpec(s: string) {
    setSelectedSpecs(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!nom.trim())            { setError('Le nom est requis.'); return; }
    if (selectedSpecs.length === 0) { setError('Choisissez au moins une spécialité.'); return; }
    if (!telephone.trim())      { setError('Le numéro WhatsApp est requis.'); return; }
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('marabouts').insert({
      user_id: userId,
      nom: nom.trim(),
      photo_url: photoUrl.trim() || null,
      specialites: selectedSpecs,
      localisation: localisation.trim() || null,
      biographie: biographie.trim() || null,
      tarif_consultation: tarif ? parseInt(tarif, 10) : null,
      telephone_whatsapp: telephone.trim(),
      statut: 'pending',
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: '#0a0e2e',
    border: '1px solid rgba(249,168,37,0.25)',
    color: 'white',
    padding: '11px 14px',
    borderRadius: '4px',
    fontSize: '0.92rem',
    boxSizing: 'border-box',
    outline: 'none',
  };

  if (loading) {
    return <div style={{ padding: '120px 20px', textAlign: 'center', color: '#b0b8d4' }}>Chargement...</div>;
  }

  if (alreadyRegistered) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: '20px', textAlign: 'center', color: 'white' }}>
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.3)', borderRadius: '10px', padding: '40px' }}>
          <h2 style={{ color: '#f9a825', marginBottom: '12px' }}>Profil déjà créé</h2>
          <p style={{ color: '#b0b8d4', marginBottom: '24px' }}>Vous êtes déjà inscrit comme guide spirituel.</p>
          <Link to="/marabout/dashboard" style={{ background: '#f9a825', color: '#1a237e', padding: '11px 24px', fontWeight: '700', textDecoration: 'none', borderRadius: '4px' }}>
            Accéder à mon espace
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: '20px', textAlign: 'center', color: 'white' }}>
        <div style={{ background: '#111a55', border: '1px solid rgba(76,175,80,0.4)', borderRadius: '10px', padding: '40px' }}>
          <h2 style={{ color: '#4caf50', marginBottom: '12px' }}>Demande envoyée</h2>
          <p style={{ color: '#b0b8d4', marginBottom: '8px' }}>
            Votre demande est en cours d'examen. Votre profil sera activé après vérification et paiement.
          </p>
          <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '24px 0', fontSize: '0.85rem' }}>{SEP}</div>
          <p style={{ color: '#b0b8d4', marginBottom: '24px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Pour activer votre profil, envoyez le paiement de <strong style={{ color: '#f9a825' }}>5 000 FCFA</strong> via WhatsApp à l'administrateur en indiquant votre nom d'inscription.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/marabouts"
              style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '11px 24px', fontWeight: '600', textDecoration: 'none', borderRadius: '4px' }}
            >
              Voir les guides
            </Link>
            <Link
              to="/marabout/dashboard"
              style={{ background: '#f9a825', color: '#1a237e', padding: '11px 24px', fontWeight: '700', textDecoration: 'none', borderRadius: '4px' }}
            >
              Mon espace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* Titre */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
          Inscription Marabout
        </h1>
        <p style={{ color: '#b0b8d4', fontSize: '0.92rem' }}>
          Rejoignez le réseau Secret Divin — 5 000 FCFA / mois
        </p>
        <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '18px 0 0', fontSize: '0.85rem' }}>
          {SEP}
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Informations */}
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '20px' }}>Informations</h2>

          {[
            { label: 'Nom complet *', value: nom, set: setNom, type: 'text', placeholder: 'Votre nom ou titre spirituel' },
            { label: 'URL de la photo', value: photoUrl, set: setPhotoUrl, type: 'url', placeholder: 'https://...' },
            { label: 'Localisation', value: localisation, set: setLocalisation, type: 'text', placeholder: 'Ville, pays' },
            { label: 'Numéro WhatsApp *', value: telephone, set: setTelephone, type: 'tel', placeholder: '+221 77 000 00 00' },
            { label: 'Tarif de consultation (FCFA)', value: tarif, set: setTarif, type: 'number', placeholder: 'ex: 5000' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.83rem', marginBottom: '6px' }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                min={type === 'number' ? '0' : undefined}
                style={inp}
              />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', color: '#b0b8d4', fontSize: '0.83rem', marginBottom: '6px' }}>Biographie</label>
            <textarea
              rows={5}
              value={biographie}
              onChange={e => setBiographie(e.target.value)}
              placeholder="Présentez-vous, votre parcours spirituel, vos méthodes..."
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Spécialités */}
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '6px' }}>
            Spécialités *
          </h2>
          <p style={{ color: '#b0b8d4', fontSize: '0.82rem', marginBottom: '16px' }}>Sélectionnez au moins une spécialité.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {ALL_SPECIALITES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpec(s)}
                style={{
                  background: selectedSpecs.includes(s) ? '#f9a825' : 'transparent',
                  border: '1px solid rgba(249,168,37,0.4)',
                  color: selectedSpecs.includes(s) ? '#1a237e' : '#f9a825',
                  padding: '7px 14px',
                  cursor: 'pointer',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: selectedSpecs.includes(s) ? '700' : '500',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tarif abonnement */}
        <div style={{
          background: 'rgba(249,168,37,0.05)',
          border: '1px solid rgba(249,168,37,0.22)',
          borderRadius: '10px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}>
          <div style={{ color: '#f9a825', fontWeight: '700', marginBottom: '8px' }}>Abonnement mensuel</div>
          <div style={{ color: '#b0b8d4', fontSize: '0.88rem', lineHeight: '1.7' }}>
            L'inscription sur le marketplace coûte <strong style={{ color: 'white' }}>5 000 FCFA / mois</strong>.<br />
            Après soumission, envoyez le paiement via WhatsApp pour activer votre profil.
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.35)', borderRadius: '6px', padding: '12px', color: '#ef5350', marginBottom: '16px', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', background: '#f9a825', color: '#1a237e', border: 'none', padding: '14px', fontWeight: '700', fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer', borderRadius: '4px', opacity: submitting ? 0.8 : 1 }}
        >
          {submitting ? 'Envoi en cours...' : 'Soumettre ma demande'}
        </button>
      </form>
    </div>
  );
}
