import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, GENDER_BONUS } from '../utils/mystique';
import { Reveal } from '../components/Reveal';

const SEP = '——— ✦ ———';

// ── Interfaces ──────────────────────────────────────────

interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

interface Profile {
  user_id: string;
  display_name?: string;
  first_name?: string;
  mother_name?: string;
  gender?: string;
  religion?: string;
  language?: string;
}

interface Credits {
  balance: number;
  total_purchased: number;
}

interface Subscription {
  id: string;
  expires_at: string;
  is_active: boolean;
}

interface Consultation {
  id: string;
  title: string;
  page_source: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface FormationModule {
  id: string;
  user_id: string;
  module_id: number;
  is_completed: boolean;
  best_score: number;
}

interface PMData {
  nameArabic: string;
  nameW: number;
  motherArabic: string;
  motherW: number;
  PM: number;
  element: string;
  elementColor: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

// ── Constants ────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  destin:        '#1565c0',
  secrets:       '#7b1fa2',
  geomancie:     '#f9a825',
  reves:         '#1a1a4e',
  plantes:       '#2e7d32',
  attraper:      '#c62828',
  compatibilite: '#e91e63',
  jours:         '#e65100',
};

const RELIGIONS = ['Islam', 'Christianisme', 'Traditionnel africain', 'Autre'];

// ── Utility functions ─────────────────────────────────────

function formatDate(dateString: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = String(date.getMonth() + 1).padStart(2, '0');
  const year    = date.getFullYear();
  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

function formatDateShort(dateString: string): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ── Shared input style ────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  background: '#0a0e2e',
  border: '1px solid rgba(249,168,37,0.25)',
  color: 'white',
  padding: '11px 14px',
  fontSize: '0.92rem',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box',
};

// ── Main component ────────────────────────────────────────

export function ProfilPage() {
  const navigate = useNavigate();

  // Core data
  const [user,             setUser]             = useState<AuthUser | null>(null);
  const [profile,          setProfile]          = useState<Profile | null>(null);
  const [credits,          setCredits]          = useState<Credits | null>(null);
  const [subscription,     setSubscription]     = useState<Subscription | null>(null);
  const [consultations,    setConsultations]    = useState<Consultation[]>([]);
  const [formationModules, setFormationModules] = useState<FormationModule[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [loadError,        setLoadError]        = useState('');

  // Edit form
  const [editMode,      setEditMode]      = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editMother,    setEditMother]    = useState('');
  const [editGender,    setEditGender]    = useState<'homme' | 'femme'>('homme');
  const [editReligion,  setEditReligion]  = useState('Islam');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg,    setProfileMsg]    = useState('');

  // PM
  const [pmData,    setPmData]    = useState<PMData | null>(null);
  const [pmLoading, setPmLoading] = useState(false);

  // Preferences
  const [language,    setLanguage]    = useState('fr');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Modals
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [showLogoutModal,      setShowLogoutModal]      = useState(false);
  const [showDeleteModal,      setShowDeleteModal]      = useState(false);
  const [deleteConfirmText,    setDeleteConfirmText]    = useState('');
  const [deleting,             setDeleting]             = useState(false);

  // ── Data loading ──────────────────────────────────────

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    setLoadError('');
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate('/auth'); return; }
      const u = authUser as AuthUser;
      setUser(u);

      const [profileRes, creditsRes, subRes, consultRes, formRes] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('user_id', u.id).single(),
        supabase.from('user_credits').select('balance, total_purchased').eq('user_id', u.id).single(),
        supabase.from('subscriptions').select('*').eq('user_id', u.id).eq('is_active', true).gt('expires_at', new Date().toISOString()).single(),
        supabase.from('saved_rituals').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('formation_modules').select('*').eq('user_id', u.id),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const p = profileRes.value.data as Profile;
        setProfile(p);
        setEditName(p.display_name ?? '');
        setEditFirstName(p.first_name ?? '');
        setEditMother(p.mother_name ?? '');
        setEditGender(((p.gender ?? 'homme') as 'homme' | 'femme'));
        setEditReligion(p.religion ?? 'Islam');
        setLanguage(p.language ?? 'fr');
        if (p.first_name && p.mother_name) loadPM(p);
      }
      if (creditsRes.status === 'fulfilled' && creditsRes.value.data) {
        setCredits(creditsRes.value.data as Credits);
      }
      if (subRes.status === 'fulfilled' && subRes.value.data) {
        setSubscription(subRes.value.data as Subscription);
      }
      if (consultRes.status === 'fulfilled' && consultRes.value.data) {
        setConsultations(consultRes.value.data as Consultation[]);
      }
      if (formRes.status === 'fulfilled' && formRes.value.data) {
        setFormationModules(formRes.value.data as FormationModule[]);
      }
    } catch {
      setLoadError('Erreur de chargement du profil.');
    } finally {
      setLoading(false);
    }
  }

  // ── PM calculation ────────────────────────────────────

  async function loadPM(p: Profile) {
    const gender = (p.gender ?? 'homme') as 'homme' | 'femme';
    const cacheKey = `profil_pm_${p.first_name}_${p.mother_name}_${gender}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setPmData(JSON.parse(cached) as PMData); } catch { /* invalid cache */ }
      return;
    }

    setPmLoading(true);
    try {
      const key = import.meta.env.VITE_GEMINI_KEY as string;
      const makePrompt = (name: string) =>
        `Translittère ce prénom en arabe SANS harakat. Retourne UNIQUEMENT du JSON valide: {"arabic": "النص", "weight": 0}. Prénom: ${name}`;

      const [res1, res2] = await Promise.all([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: makePrompt(p.first_name!) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }),
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: makePrompt(p.mother_name!) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }),
      ]);

      const [j1, j2] = await Promise.all([
        res1.json() as Promise<GeminiResponse>,
        res2.json() as Promise<GeminiResponse>,
      ]);

      const parseArabic = (j: GeminiResponse): string => {
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const clean = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        try {
          const parsed = JSON.parse(clean) as { arabic?: string };
          return parsed.arabic ?? '';
        } catch {
          return '';
        }
      };

      const nameArabic   = parseArabic(j1);
      const motherArabic = parseArabic(j2);
      const nameW        = calculateWeight(nameArabic);
      const motherW      = calculateWeight(motherArabic);
      const bonus        = GENDER_BONUS[gender];
      const PM           = nameW + motherW + bonus;

      const element = PM % 4 === 1 ? 'Feu' : PM % 4 === 2 ? 'Terre' : PM % 4 === 3 ? 'Air' : 'Eau';
      const elementColor = PM % 4 === 1 ? '#e53935' : PM % 4 === 2 ? '#795548' : PM % 4 === 3 ? '#64b5f6' : '#1565c0';

      const result: PMData = { nameArabic, nameW, motherArabic, motherW, PM, element, elementColor };
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setPmData(result);
    } catch {
      // PM silently fails — user sees "impossible de calculer"
    } finally {
      setPmLoading(false);
    }
  }

  // ── Edit form handlers ────────────────────────────────

  function startEdit() {
    setEditName(profile?.display_name ?? '');
    setEditFirstName(profile?.first_name ?? '');
    setEditMother(profile?.mother_name ?? '');
    setEditGender(((profile?.gender ?? 'homme') as 'homme' | 'femme'));
    setEditReligion(profile?.religion ?? 'Islam');
    setEditMode(true);
    setProfileMsg('');
  }

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const { error } = await supabase.from('profiles').upsert({
        user_id:      user.id,
        display_name: editName,
        first_name:   editFirstName,
        mother_name:  editMother,
        gender:       editGender,
        religion:     editReligion,
        updated_at:   new Date().toISOString(),
      });
      if (error) throw error;

      const updated: Profile = {
        user_id:      user.id,
        display_name: editName,
        first_name:   editFirstName,
        mother_name:  editMother,
        gender:       editGender,
        religion:     editReligion,
        language:     profile?.language,
      };
      setProfile(updated);
      setEditMode(false);
      setProfileMsg('Profil mis à jour avec succès');
      setTimeout(() => setProfileMsg(''), 3000);

      if (editFirstName && editMother) loadPM(updated);
    } catch {
      setProfileMsg('Erreur lors de la sauvegarde. Réessaie dans quelques instants.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePreferences() {
    if (!user) return;
    setSavingPrefs(true);
    try {
      await supabase.from('profiles').upsert({
        user_id:    user.id,
        language,
        updated_at: new Date().toISOString(),
      });
    } catch { /* silent */ } finally {
      setSavingPrefs(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/auth');
  }

  async function handleDeleteAccount() {
    if (!user || deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    const tables = [
      'profiles', 'saved_rituals', 'formation_modules',
      'formation_progress', 'user_credits', 'credit_transactions',
      'subscriptions', 'user_roles',
    ];
    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', user.id).then(undefined, () => {});
    }
    await supabase.auth.signOut();
    navigate('/auth');
  }

  // ── Consultation modal content ────────────────────────

  function renderConsultationContent(c: Consultation): React.ReactNode {
    const d = (c.data ?? {}) as Record<string, unknown>;
    const src = c.page_source;

    if (src === 'destin') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
        {d.PM      !== undefined && <div style={{ color: '#b0b8d4' }}>Poids mystique : <strong style={{ color: 'white' }}>{String(d.PM)}</strong></div>}
        {d.element !== undefined && <div style={{ color: '#b0b8d4' }}>Élément : <strong style={{ color: '#f9a825' }}>{String(d.element)}</strong></div>}
        {d.nomDivin !== undefined && <div style={{ fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl', fontSize: '1.3rem', color: '#f9a825', lineHeight: '1.8' }}>{String(d.nomDivin)}</div>}
      </div>
    );

    if (src === 'reves') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
        {d.titre   !== undefined && <div style={{ color: '#b0b8d4' }}>Titre : <strong style={{ color: 'white' }}>{String(d.titre)}</strong></div>}
        {d.nature  !== undefined && <div style={{ color: '#b0b8d4' }}>Nature : <strong style={{ color: '#f9a825' }}>{String(d.nature)}</strong></div>}
        {d.message !== undefined && <div style={{ color: '#b0b8d4', fontStyle: 'italic', lineHeight: '1.6' }}>{String(d.message).substring(0, 200)}</div>}
      </div>
    );

    if (src === 'geomancie') return (
      <div style={{ fontSize: '0.9rem' }}>
        {d.figureDominante !== undefined
          ? <div style={{ color: '#b0b8d4' }}>Figure dominante : <strong style={{ color: '#f9a825' }}>{String(d.figureDominante)}</strong></div>
          : <div style={{ color: '#b0b8d4' }}>Consultation géomantique.</div>}
      </div>
    );

    // Fallback générique
    const keys = Object.keys(d).slice(0, 5);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {keys.length === 0
          ? <div style={{ color: '#b0b8d4', fontSize: '0.88rem' }}>Contenu non disponible.</div>
          : keys.map(k => (
            <div key={k} style={{ fontSize: '0.88rem' }}>
              <span style={{ color: '#f9a825', textTransform: 'capitalize' }}>{k} :</span>{' '}
              <span style={{ color: '#b0b8d4' }}>
                {typeof d[k] === 'string' ? String(d[k]).substring(0, 120) : '—'}
              </span>
            </div>
          ))
        }
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────

  const completed   = formationModules.filter(m => m.is_completed).length;
  const progressPct = Math.min(100, Math.round((completed / 9) * 100));
  const initials    = ((profile?.display_name || user?.email || '?').charAt(0).toUpperCase());
  const displayName = profile?.display_name || user?.email || '';

  // ── Loading / Error ───────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '120px 20px' }}>
        Chargement du profil...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: '500px', margin: '80px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.4)', borderRadius: '8px', padding: '24px', color: '#ef5350', marginBottom: '16px' }}>
          {loadError}
        </div>
        <button onClick={loadAll} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '12px 24px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' }}>
          Réessayer
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#111a55',
    border: '1px solid rgba(249,168,37,0.2)',
    borderRadius: '10px',
    padding: '28px',
    marginBottom: '28px',
  };

  return (
    <>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

        {/* ── SECTION 1 — EN-TÊTE ── */}
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
              Mon Profil
            </h1>
            <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.95rem' }}>
              Gère tes informations et préférences
            </p>
          </div>
        </Reveal>

        {/* ── SECTION 3 — CARTE RÉSUMÉ ── */}
        <Reveal delay={60}>
          <div style={{
            background: 'linear-gradient(135deg, #1a237e, #111a55)',
            border: '1px solid #f9a825',
            borderRadius: '12px',
            padding: '36px 28px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto 36px',
          }}>
            {/* Avatar initiales */}
            <div style={{
              width: '64px', height: '64px',
              background: '#f9a825',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.5rem', fontWeight: '700', color: '#1a237e',
            }}>
              {initials}
            </div>

            <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.3rem', marginBottom: '4px' }}>
              {displayName}
            </div>
            <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '20px' }}>
              {user?.email}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {subscription ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ background: '#f9a825', color: '#1a237e', padding: '4px 16px', borderRadius: '14px', fontWeight: '700', fontSize: '0.85rem' }}>
                    ✦ Illimité
                  </span>
                  <span style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>
                    Expire le {formatDate(subscription.expires_at)}
                  </span>
                </div>
              ) : (
                <span style={{ background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '4px 16px', borderRadius: '14px', fontWeight: '600', fontSize: '0.85rem' }}>
                  ✦ {credits?.balance ?? 0} crédits
                </span>
              )}
              <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#b0b8d4', padding: '4px 14px', borderRadius: '14px', fontSize: '0.78rem' }}>
                Membre depuis {formatDateShort(user?.created_at ?? '')}
              </span>
            </div>
          </div>
        </Reveal>

        {/* ── SECTION 4 — INFORMATIONS PERSONNELLES ── */}
        <Reveal delay={100}>
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', margin: 0 }}>Mes Informations</h2>
              {!editMode && (
                <button onClick={startEdit} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', borderRadius: '4px' }}>
                  Modifier
                </button>
              )}
            </div>

            {!editMode ? (
              /* Lecture */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Nom affiché',           val: profile?.display_name || '—' },
                  { label: 'Prénom',                 val: profile?.first_name   || '—' },
                  { label: 'Prénom de ta mère',      val: profile?.mother_name  || '—' },
                  { label: 'Sexe',                   val: profile?.gender === 'homme' ? 'Homme' : profile?.gender === 'femme' ? 'Femme' : '—' },
                  { label: 'Religion',               val: profile?.religion || '—' },
                  { label: 'Email',                  val: user?.email || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#b0b8d4', fontSize: '0.85rem', minWidth: '190px', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ color: 'white', fontSize: '0.85rem' }}>{row.val}</span>
                  </div>
                ))}
                {profileMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '4px', fontSize: '0.88rem', background: 'rgba(76,175,80,0.1)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.3)', marginTop: '6px' }}>
                    {profileMsg}
                  </div>
                )}
              </div>
            ) : (
              /* Édition */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Nom affiché</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ton prénom ou pseudo" style={inp} />
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Ton prénom</label>
                  <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="Ton prénom en français" style={inp} />
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Prénom de ta mère</label>
                  <input type="text" value={editMother} onChange={e => setEditMother(e.target.value)} placeholder="Prénom de ta mère" style={inp} />
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Ton sexe</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['homme', 'femme'] as const).map(g => (
                      <button key={g} onClick={() => setEditGender(g)} style={{
                        background: editGender === g ? '#f9a825' : 'transparent',
                        border: `1px solid ${editGender === g ? '#f9a825' : 'rgba(249,168,37,0.3)'}`,
                        color: editGender === g ? '#1a237e' : '#b0b8d4',
                        padding: '8px 22px', cursor: 'pointer', borderRadius: '4px',
                        fontWeight: editGender === g ? '700' : '400', fontSize: '0.9rem',
                      }}>
                        {g === 'homme' ? 'Homme' : 'Femme'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Ta religion</label>
                  <select value={editReligion} onChange={e => setEditReligion(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Email</label>
                  <input type="email" value={user?.email ?? ''} readOnly style={{ ...inp, opacity: 0.6, cursor: 'not-allowed' }} />
                  <span style={{ color: '#b0b8d4', fontSize: '0.72rem', fontStyle: 'italic' }}>(non modifiable)</span>
                </div>

                {profileMsg && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '4px', fontSize: '0.88rem',
                    background: profileMsg.includes('succès') ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
                    color: profileMsg.includes('succès') ? '#4caf50' : '#ef5350',
                    border: `1px solid ${profileMsg.includes('succès') ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
                  }}>
                    {profileMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button onClick={saveProfile} disabled={savingProfile} style={{
                    background: savingProfile ? 'rgba(249,168,37,0.4)' : '#f9a825',
                    color: '#1a237e', border: 'none', padding: '11px 28px',
                    fontWeight: '700', cursor: savingProfile ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', borderRadius: '4px',
                  }}>
                    {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button onClick={() => { setEditMode(false); setProfileMsg(''); }} style={{
                    background: 'transparent', border: '1px solid rgba(249,168,37,0.5)',
                    color: '#f9a825', padding: '11px 24px', cursor: 'pointer',
                    fontSize: '0.9rem', borderRadius: '4px',
                  }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>
        </Reveal>

        {/* ── SECTION 5 — MON POIDS MYSTIQUE ── */}
        <Reveal delay={130}>
          <section style={card}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', marginBottom: '20px' }}>Mon Poids Mystique</h2>

            {(!profile?.first_name || !profile?.mother_name) ? (
              <div style={{ background: 'rgba(249,168,37,0.08)', border: '1px solid rgba(249,168,37,0.25)', borderRadius: '8px', padding: '22px', textAlign: 'center' }}>
                <p style={{ color: '#b0b8d4', fontSize: '0.92rem', lineHeight: '1.65', marginBottom: '14px' }}>
                  Complète ton prénom et le prénom de ta mère pour voir ton poids mystique automatiquement.
                </p>
                <button onClick={startEdit} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '10px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem', borderRadius: '4px' }}>
                  Compléter mon profil
                </button>
              </div>
            ) : pmLoading ? (
              <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '36px' }}>Calcul du poids mystique...</div>
            ) : pmData ? (
              <>
                {/* 2 cartes prénoms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {[
                    { label: profile.first_name!, arabic: pmData.nameArabic,   w: pmData.nameW },
                    { label: profile.mother_name!, arabic: pmData.motherArabic, w: pmData.motherW },
                  ].map(c => (
                    <div key={c.label} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.18)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                      <div style={{ color: 'white', fontWeight: '700', marginBottom: '8px' }}>{c.label}</div>
                      <div style={{ fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl', color: '#f9a825', fontSize: '1.6em', lineHeight: '1.6', marginBottom: '8px' }}>
                        {c.arabic}
                      </div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Poids : {c.w}</div>
                    </div>
                  ))}
                </div>

                {/* Grande carte PM */}
                <div style={{
                  background: 'linear-gradient(135deg, #1a237e, #111a55)',
                  border: '1px solid #f9a825',
                  borderRadius: '10px', padding: '32px', textAlign: 'center', marginBottom: '20px',
                }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Ton Poids Mystique
                  </div>
                  <div style={{ fontSize: '4rem', fontWeight: '700', color: '#f9a825', lineHeight: 1, marginBottom: '8px' }}>
                    {pmData.PM}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: pmData.elementColor, marginBottom: '12px' }}>
                    {pmData.element}
                  </div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>
                    {pmData.nameW} + {pmData.motherW} + {GENDER_BONUS[((profile.gender ?? 'homme') as 'homme' | 'femme')]} = {pmData.PM}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Link to="/destin" style={{ display: 'inline-block', background: '#f9a825', color: '#1a237e', padding: '12px 28px', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem', borderRadius: '4px' }}>
                    Découvrir mon destin complet
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '20px', fontSize: '0.88rem' }}>
                Impossible de calculer le poids mystique pour le moment.
              </div>
            )}
          </section>
        </Reveal>

        <Reveal><div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '28px', fontSize: '0.85rem' }}>{SEP}</div></Reveal>

        {/* ── SECTION 6 — PRÉFÉRENCES ── */}
        <Reveal delay={60}>
          <section style={card}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', marginBottom: '20px' }}>Mes Préférences</h2>
            <div>
              <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '8px' }}>Langue</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...inp, cursor: 'pointer', maxWidth: '300px' }}>
                <option value="fr">Français</option>
                <option value="en" disabled>English (bientôt disponible)</option>
                <option value="ar" disabled>العربية (bientôt disponible)</option>
              </select>
            </div>
            <div style={{ marginTop: '16px' }}>
              <button onClick={savePreferences} disabled={savingPrefs} style={{
                background: savingPrefs ? 'rgba(249,168,37,0.4)' : '#f9a825',
                color: '#1a237e', border: 'none', padding: '10px 24px',
                fontWeight: '700', cursor: savingPrefs ? 'not-allowed' : 'pointer',
                fontSize: '0.88rem', borderRadius: '4px',
              }}>
                {savingPrefs ? 'Enregistrement...' : 'Enregistrer les préférences'}
              </button>
            </div>
          </section>
        </Reveal>

        {/* ── SECTION 7 — CONSULTATIONS ── */}
        <Reveal delay={80}>
          <section style={card}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', marginBottom: '20px' }}>Mes Dernières Consultations</h2>

            {consultations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ color: '#b0b8d4', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Tu n'as pas encore de consultations sauvegardées.
                </p>
                <Link to="/destin" style={{ display: 'inline-block', background: '#f9a825', color: '#1a237e', padding: '10px 22px', fontWeight: '700', textDecoration: 'none', fontSize: '0.88rem', borderRadius: '4px' }}>
                  Commencer une consultation
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {consultations.map(c => (
                  <div key={c.id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ background: BADGE_COLORS[c.page_source] ?? '#555', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize' }}>
                        {c.page_source}
                      </span>
                      <span style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{formatDate(c.created_at)}</span>
                    </div>
                    <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem', lineHeight: '1.4' }}>{c.title}</div>
                    <button onClick={() => setSelectedConsultation(c)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '6px 12px', cursor: 'pointer', fontSize: '0.78rem', borderRadius: '4px', alignSelf: 'flex-start' }}>
                      Voir cette consultation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal><div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '28px', fontSize: '0.85rem' }}>{SEP}</div></Reveal>

        {/* ── SECTION 8 — FORMATION ── */}
        <Reveal delay={60}>
          <section style={card}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', marginBottom: '20px' }}>Ma Progression dans la Formation</h2>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#b0b8d4', fontSize: '0.88rem' }}>{completed} / 9 modules</span>
                <span style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.88rem' }}>{progressPct}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #f9a825, #e65100)', borderRadius: '4px', transition: 'width 0.8s ease' }} />
              </div>
            </div>

            {completed === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#b0b8d4', marginBottom: '14px', fontSize: '0.9rem' }}>
                  Tu n'as pas encore commencé la formation.
                </p>
                <Link to="/formation" style={{ display: 'inline-block', background: '#f9a825', color: '#1a237e', padding: '10px 22px', fontWeight: '700', textDecoration: 'none', fontSize: '0.88rem', borderRadius: '4px' }}>
                  Commencer la formation
                </Link>
              </div>
            ) : (
              <>
                <div style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '12px' }}>Modules complétés :</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {formationModules
                    .filter(m => m.is_completed)
                    .sort((a, b) => a.module_id - b.module_id)
                    .map(m => (
                      <span key={m.id} style={{ background: 'rgba(76,175,80,0.14)', border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '600' }}>
                        Module {m.module_id} — Score : {m.best_score}/100
                      </span>
                    ))}
                </div>
                <Link to="/formation" style={{ display: 'inline-block', background: '#f9a825', color: '#1a237e', padding: '10px 22px', fontWeight: '700', textDecoration: 'none', fontSize: '0.88rem', borderRadius: '4px' }}>
                  Continuer ma formation
                </Link>
              </>
            )}
          </section>
        </Reveal>

        <Reveal><div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '28px', fontSize: '0.85rem' }}>{SEP}</div></Reveal>

        {/* ── SECTION 9 — PARAMÈTRES DU COMPTE ── */}
        <Reveal delay={60}>
          <section style={card}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem', marginBottom: '20px' }}>Paramètres du Compte</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {[
                { label: 'Email',                     val: user?.email ?? '—' },
                { label: 'Membre depuis',              val: formatDate(user?.created_at ?? '') },
                { label: 'Dernier accès',              val: formatDate(user?.last_sign_in_at ?? '') },
                { label: 'Crédits achetés au total',   val: String(credits?.total_purchased ?? 0) },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#b0b8d4', fontSize: '0.85rem', minWidth: '230px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ color: 'white', fontSize: '0.85rem' }}>{row.val}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '24px', fontSize: '0.82rem' }}>{SEP}</div>

            <button onClick={() => setShowLogoutModal(true)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,83,80,0.5)', color: '#ef5350', padding: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem', borderRadius: '4px', marginBottom: '16px' }}>
              Se déconnecter
            </button>

            <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '14px', fontSize: '0.82rem' }}>{SEP}</div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowDeleteModal(true)} style={{ background: 'none', border: 'none', color: '#ef5350', fontSize: '0.82rem', textDecoration: 'underline', cursor: 'pointer' }}>
                Supprimer mon compte
              </button>
            </div>
          </section>
        </Reveal>

      </div>

      {/* ── MODAL CONSULTATION ── */}
      {selectedConsultation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '6px', fontSize: '1.1rem' }}>{selectedConsultation.title}</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: BADGE_COLORS[selectedConsultation.page_source] ?? '#555', color: 'white', padding: '2px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '600', textTransform: 'capitalize' }}>
                {selectedConsultation.page_source}
              </span>
              <span style={{ color: '#b0b8d4', fontSize: '0.75rem' }}>{formatDate(selectedConsultation.created_at)}</span>
            </div>
            <div style={{ marginBottom: '24px' }}>{renderConsultationContent(selectedConsultation)}</div>
            <button onClick={() => setSelectedConsultation(null)} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '10px', cursor: 'pointer', borderRadius: '4px' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DÉCONNEXION ── */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '12px' }}>Déconnexion</h2>
            <p style={{ color: '#b0b8d4', marginBottom: '24px', fontSize: '0.92rem' }}>
              Es-tu sûr de vouloir te déconnecter ?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleLogout} style={{ background: '#ef5350', border: 'none', color: 'white', padding: '11px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Confirmer
              </button>
              <button onClick={() => setShowLogoutModal(false)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '11px 24px', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid rgba(239,83,80,0.6)', borderRadius: '10px', padding: '28px', maxWidth: '440px', width: '100%' }}>
            <h2 style={{ color: '#ef5350', fontWeight: '700', marginBottom: '12px', fontSize: '1.1rem' }}>Suppression du compte</h2>
            <p style={{ color: '#b0b8d4', fontSize: '0.9rem', lineHeight: '1.65', marginBottom: '20px' }}>
              Cette action est irréversible. Toutes tes données seront supprimées définitivement : profil, crédits, consultations et progression.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Tape DELETE pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ ...inp, borderColor: deleteConfirmText === 'DELETE' ? '#ef5350' : 'rgba(249,168,37,0.25)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{
                  background: deleteConfirmText === 'DELETE' ? '#ef5350' : 'rgba(239,83,80,0.25)',
                  border: 'none', color: 'white',
                  padding: '11px 20px', fontWeight: '700', flex: 1,
                  cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                  fontSize: '0.88rem', borderRadius: '4px',
                }}
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '11px 20px', cursor: 'pointer', fontSize: '0.88rem', borderRadius: '4px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
