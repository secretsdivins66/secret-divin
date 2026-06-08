import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { calculateWeight, GENDER_BONUS } from '../utils/mystique';

const ADMIN_EMAIL = 'admin@secretdivin.com';
const SEP = '——— ✦ ———';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users',     label: 'Utilisateurs' },
  { id: 'roles',     label: 'Rôles' },
  { id: 'credits',   label: 'Crédits' },
  { id: 'blog',      label: 'Blog' },
  { id: 'stats',     label: 'Statistiques' },
] as const;

type TabId = typeof TABS[number]['id'];

const CATEGORIES = [
  'Spiritualité islamique',
  'Géomancie africaine',
  'Plantes mystiques',
  'Carrés magiques',
  'Interprétation des rêves',
  'Poids mystique',
  'Talismans et rituels',
];

const PACK_OPTIONS = [
  { value: 'Starter',   label: 'Starter — 20 crédits — 4 900 FCFA' },
  { value: 'Essentiel', label: 'Essentiel — 50 crédits — 6 900 FCFA' },
  { value: 'Premium',   label: 'Premium — 70 crédits — 9 900 FCFA' },
  { value: 'Expert',    label: 'Expert — 150 crédits — 19 900 FCFA' },
  { value: 'Illimité',  label: 'Illimité — 49 000 FCFA/mois' },
  { value: 'Autre',     label: 'Autre (manuel)' },
];

// ── Interfaces ──────────────────────────────────────────

interface Profile {
  user_id: string;
  email: string;
  display_name?: string;
  first_name?: string;
  mother_name?: string;
  gender?: string;
  religion?: string;
  language?: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Consultation {
  user_id: string;
  page_source: string;
  created_at: string;
  title: string;
}

interface FormationModuleRow {
  user_id: string;
  module_id: number;
  is_completed: boolean;
  best_score: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  views: number;
  published: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  pack?: string;
  balance_after: number;
  description: string;
  created_at: string;
}

interface PMData {
  nameArabic: string;
  motherArabic: string;
  PM: number;
  element: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface ArticleForm {
  id: string | null;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string;
  publishNow: boolean;
}

const EMPTY_ARTICLE_FORM: ArticleForm = {
  id: null, title: '', slug: '', category: CATEGORIES[0],
  excerpt: '', content: '', coverImage: '', publishNow: false,
};

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

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate()
    && date.getMonth() === today.getMonth()
    && date.getFullYear() === today.getFullYear();
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── Shared styles ─────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#111a55',
  border: '1px solid rgba(249,168,37,0.2)',
  borderRadius: '10px',
  padding: '26px',
  marginBottom: '26px',
};

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

const th: React.CSSProperties = {
  background: '#1a237e',
  color: '#f9a825',
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '0.78rem',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '0.82rem',
  color: '#b0b8d4',
  whiteSpace: 'nowrap',
};

function sepLine(): React.ReactNode {
  return (
    <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', margin: '8px 0 26px', fontSize: '0.85rem' }}>
      {SEP}
    </div>
  );
}

function smallBtn(color: string, filled: boolean): React.CSSProperties {
  return {
    background: filled ? color : 'transparent',
    border: `1px solid ${color}`,
    color: filled ? '#1a237e' : color,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.76rem',
    borderRadius: '4px',
    fontWeight: filled ? '700' : '600',
  };
}

// ── Main component ────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);

  const [users,         setUsers]         = useState<Profile[]>([]);
  const [roles,         setRoles]         = useState<UserRole[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [formation,     setFormation]     = useState<FormationModuleRow[]>([]);
  const [articles,      setArticles]      = useState<Article[]>([]);
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // ── Auth gate (double vérification : email côté client ET rôle en base) ──
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const isAdminUser = user.email === ADMIN_EMAIL || roleData?.role === 'admin';

      if (!isAdminUser) {
        navigate('/dashboard');
        return;
      }
      setAuthChecked(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authChecked) loadAllData();
  }, [authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAllData() {
    setLoading(true);
    setLoadError('');
    try {
      const [usersRes, rolesRes, consultRes, formRes, articlesRes, transRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('saved_rituals').select('user_id, page_source, created_at, title'),
        supabase.from('formation_modules').select('user_id, module_id, is_completed, best_score'),
        supabase.from('blog_articles').select('*').order('created_at', { ascending: false }),
        supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setUsers((usersRes.data as Profile[]) ?? []);
      setRoles((rolesRes.data as UserRole[]) ?? []);
      setConsultations((consultRes.data as Consultation[]) ?? []);
      setFormation((formRes.data as FormationModuleRow[]) ?? []);
      setArticles((articlesRes.data as Article[]) ?? []);
      setTransactions((transRes.data as Transaction[]) ?? []);
    } catch {
      setLoadError('Erreur de chargement des données.');
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return <div style={{ padding: '120px 20px', textAlign: 'center', color: '#b0b8d4' }}>Chargement...</div>;
  }

  if (loadError) {
    return (
      <div style={{ maxWidth: '480px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.4)', borderRadius: '8px', padding: '22px', color: '#ef5350', marginBottom: '16px' }}>
          {loadError}
        </div>
        <button onClick={loadAllData} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '11px 24px', fontWeight: '700', cursor: 'pointer', borderRadius: '4px' }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* SECTION 3 — En-tête */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#f9a825', marginBottom: '6px' }}>
          Panneau d'Administration
        </h1>
        <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.92rem', marginBottom: '16px' }}>
          Secret Divin — Admin
        </p>
        <span style={{ display: 'inline-block', background: '#f9a825', color: '#1a237e', padding: '6px 18px', borderRadius: '14px', fontWeight: '700', fontSize: '0.82rem' }}>
          Connecté en tant que Admin
        </span>
      </div>

      {/* SECTION 4 — Onglets */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '30px' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flexShrink: 0,
              background: activeTab === t.id ? '#f9a825' : 'transparent',
              border: '1px solid #f9a825',
              color: activeTab === t.id ? '#1a237e' : '#f9a825',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: activeTab === t.id ? '700' : '600',
              fontSize: '0.86rem',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '60px' }}>Chargement des données...</div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <DashboardTab users={users} consultations={consultations} formation={formation} transactions={transactions} />
          )}
          {activeTab === 'users' && (
            <UsersTab users={users} roles={roles} />
          )}
          {activeTab === 'roles' && (
            <RolesTab roles={roles} users={users} onChanged={loadAllData} />
          )}
          {activeTab === 'credits' && (
            <CreditsTab users={users} transactions={transactions} onChanged={loadAllData} />
          )}
          {activeTab === 'blog' && (
            <BlogTab articles={articles} onChanged={loadAllData} />
          )}
          {activeTab === 'stats' && (
            <StatsTab users={users} consultations={consultations} formation={formation} />
          )}
        </>
      )}
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────

function DashboardTab({ users, consultations, formation, transactions }: {
  users: Profile[]; consultations: Consultation[]; formation: FormationModuleRow[]; transactions: Transaction[];
}) {
  const stats = [
    { value: users.length, label: 'Utilisateurs inscrits' },
    { value: consultations.length, label: 'Consultations effectuées' },
    { value: formation.filter(f => f.is_completed).length, label: 'Modules de formation complétés' },
    { value: users.filter(u => isToday(u.created_at)).length, label: 'Nouveaux membres aujourd\'hui' },
  ];

  const countByTool: Record<string, number> = {};
  consultations.forEach(c => {
    const tool = c.page_source || 'autre';
    countByTool[tool] = (countByTool[tool] || 0) + 1;
  });
  const toolEntries = Object.entries(countByTool).sort((a, b) => b[1] - a[1]);
  const maxCount = toolEntries.length > 0 ? toolEntries[0][1] : 1;

  return (
    <div>
      <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '20px' }}>Vue d'ensemble</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '3rem', lineHeight: 1, marginBottom: '8px' }}>{s.value}</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Consultations par outil</h3>
        {toolEntries.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucune consultation enregistrée.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Outil</th><th style={th}>Consultations</th></tr></thead>
              <tbody>
                {toolEntries.map(([tool, count], i) => (
                  <tr key={tool} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...td, color: 'white', textTransform: 'capitalize' }}>{tool}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: `${(count / maxCount) * 100}px`, height: '8px', background: '#f9a825', borderRadius: '4px' }} />
                        <span>{count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Dernières inscriptions (5 dernières)</h3>
        {users.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucun utilisateur.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.slice(0, 5).map(u => (
              <div key={u.user_id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.12)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>{u.display_name || u.email}</div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{formatDate(u.created_at)}</div>
                </div>
                {u.religion && (
                  <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.35)', color: '#f9a825', padding: '3px 10px', borderRadius: '10px', fontSize: '0.7rem' }}>
                    {u.religion}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Dernières transactions</h3>
        {transactions.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucune transaction.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.12)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ color: 'white', fontSize: '0.86rem' }}>{t.description}</div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{formatDate(t.created_at)}</div>
                </div>
                <span style={{
                  background: t.type === 'purchase' ? 'rgba(76,175,80,0.14)' : 'rgba(239,83,80,0.14)',
                  border: `1px solid ${t.type === 'purchase' ? 'rgba(76,175,80,0.4)' : 'rgba(239,83,80,0.4)'}`,
                  color: t.type === 'purchase' ? '#4caf50' : '#ef5350',
                  padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700',
                }}>
                  {t.type === 'purchase' ? `+${t.amount} crédits` : `-${t.amount} crédits`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── USERS TAB ─────────────────────────────────────────────

interface UserDetail {
  consultCount: number;
  modules: FormationModuleRow[];
  credits: { balance: number; total_purchased: number } | null;
}

function UsersTab({ users, roles }: { users: Profile[]; roles: UserRole[] }) {
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const perPage = 20;

  const [selected,    setSelected]    = useState<Profile | null>(null);
  const [detail,      setDetail]      = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pmData,      setPmData]      = useState<PMData | null>(null);
  const [pmLoading,   setPmLoading]   = useState(false);

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.email || '').toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q) || (u.first_name || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageUsers = filtered.slice((page - 1) * perPage, page * perPage);

  function isAdmin(userId: string): boolean {
    return roles.some(r => r.user_id === userId && r.role === 'admin');
  }

  async function openDetail(p: Profile) {
    setSelected(p);
    setDetail(null);
    setPmData(null);
    setDetailLoading(true);
    try {
      const [consultRes, formRes, creditsRes] = await Promise.all([
        supabase.from('saved_rituals').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id),
        supabase.from('formation_modules').select('user_id, module_id, is_completed, best_score').eq('user_id', p.user_id),
        supabase.from('user_credits').select('balance, total_purchased').eq('user_id', p.user_id).single(),
      ]);
      setDetail({
        consultCount: consultRes.count ?? 0,
        modules: (formRes.data as FormationModuleRow[]) ?? [],
        credits: (creditsRes.data as { balance: number; total_purchased: number } | null) ?? null,
      });
    } catch {
      setDetail({ consultCount: 0, modules: [], credits: null });
    } finally {
      setDetailLoading(false);
    }
    if (p.first_name && p.mother_name) loadPM(p);
  }

  async function loadPM(p: Profile) {
    const gender = (p.gender ?? 'homme') as 'homme' | 'femme';
    const cacheKey = `admin_pm_${p.user_id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setPmData(JSON.parse(cached) as PMData); return; } catch { /* ignore */ }
    }
    setPmLoading(true);
    try {
      const key = import.meta.env.VITE_GEMINI_KEY as string;
      const makePrompt = (name: string) =>
        `Translittère ce prénom en arabe SANS harakat. Retourne UNIQUEMENT du JSON valide: {"arabic": "النص", "weight": 0}. Prénom: ${name}`;
      const [r1, r2] = await Promise.all([
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: makePrompt(p.first_name!) }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 200 } }),
        }),
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: makePrompt(p.mother_name!) }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 200 } }),
        }),
      ]);
      const [j1, j2] = await Promise.all([r1.json() as Promise<GeminiResponse>, r2.json() as Promise<GeminiResponse>]);
      const parseArabic = (j: GeminiResponse): string => {
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const clean = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        try { return (JSON.parse(clean) as { arabic?: string }).arabic ?? ''; } catch { return ''; }
      };
      const nameArabic = parseArabic(j1);
      const motherArabic = parseArabic(j2);
      const PM = calculateWeight(nameArabic) + calculateWeight(motherArabic) + GENDER_BONUS[gender];
      const element = PM % 4 === 1 ? 'Feu' : PM % 4 === 2 ? 'Terre' : PM % 4 === 3 ? 'Air' : 'Eau';
      const result: PMData = { nameArabic, motherArabic, PM, element };
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setPmData(result);
    } catch {
      /* PM silently fails */
    } finally {
      setPmLoading(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setDetail(null);
    setPmData(null);
  }

  return (
    <div>
      <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '6px' }}>Gestion des utilisateurs</h2>
      <p style={{ color: '#b0b8d4', fontSize: '0.85rem', marginBottom: '20px' }}>{users.length} utilisateurs inscrits</p>

      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Rechercher par email ou prénom..."
        style={{ ...inp, maxWidth: '380px', marginBottom: '20px' }}
      />

      <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
          <thead>
            <tr>
              <th style={th}>Prénom</th>
              <th style={th}>Email</th>
              <th style={th}>Genre</th>
              <th style={th}>Religion</th>
              <th style={th}>Inscrit le</th>
              <th style={th}>Rôle</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.map((u, i) => (
              <tr key={u.user_id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ ...td, color: 'white' }}>{u.display_name || '—'}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.gender || '—'}</td>
                <td style={td}>{u.religion || '—'}</td>
                <td style={td}>{formatDateShort(u.created_at)}</td>
                <td style={td}>
                  {isAdmin(u.user_id)
                    ? <span style={{ background: 'rgba(249,168,37,0.15)', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>Admin</span>
                    : <span style={{ background: 'rgba(176,184,212,0.1)', border: '1px solid rgba(176,184,212,0.3)', color: '#b0b8d4', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem' }}>User</span>}
                </td>
                <td style={td}>
                  <button onClick={() => openDetail(u)} style={smallBtn('#f9a825', false)}>Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...smallBtn('#f9a825', false), opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
          ← Précédent
        </button>
        <span style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Page {page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...smallBtn('#f9a825', false), opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
          Suivant →
        </button>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '18px', fontSize: '1.1rem' }}>
              {selected.display_name || selected.email}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {[
                ['Email', selected.email],
                ['Prénom', selected.first_name || '—'],
                ['Mère', selected.mother_name || '—'],
                ['Genre', selected.gender || '—'],
                ['Religion', selected.religion || '—'],
                ['Langue', selected.language || 'Français'],
                ['Inscrit le', formatDate(selected.created_at)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#b0b8d4', fontSize: '0.8rem', minWidth: '110px' }}>{label}</span>
                  <span style={{ color: 'white', fontSize: '0.8rem' }}>{val}</span>
                </div>
              ))}
            </div>

            {selected.first_name && selected.mother_name && (
              <div style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.18)', borderRadius: '8px', padding: '14px', marginBottom: '16px', textAlign: 'center' }}>
                {pmLoading ? (
                  <span style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Calcul du PM...</span>
                ) : pmData ? (
                  <>
                    <div style={{ color: '#b0b8d4', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Poids Mystique</div>
                    <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.6rem' }}>{pmData.PM}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>Élément : {pmData.element}</div>
                  </>
                ) : (
                  <span style={{ color: '#b0b8d4', fontSize: '0.8rem' }}>PM indisponible.</span>
                )}
              </div>
            )}

            {detailLoading ? (
              <div style={{ textAlign: 'center', color: '#b0b8d4', fontSize: '0.85rem', padding: '14px' }}>Chargement...</div>
            ) : detail && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px' }}>Consultations</div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>{detail.consultCount} consultations sauvegardées</div>
                </div>
                <div>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px' }}>Formation</div>
                  {detail.modules.filter(m => m.is_completed).length === 0 ? (
                    <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Aucun module complété.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {detail.modules.filter(m => m.is_completed).map(m => (
                        <span key={m.module_id} style={{ background: 'rgba(76,175,80,0.14)', border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', padding: '3px 10px', borderRadius: '10px', fontSize: '0.74rem' }}>
                          Module {m.module_id} — Score : {m.best_score}/100
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px' }}>Crédits</div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Solde actuel : {detail.credits?.balance ?? 0} crédits</div>
                  <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Total acheté : {detail.credits?.total_purchased ?? 0}</div>
                </div>
              </div>
            )}

            <button onClick={closeModal} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#f9a825', padding: '10px', cursor: 'pointer', borderRadius: '4px' }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROLES TAB ─────────────────────────────────────────────

function RolesTab({ roles, users, onChanged }: { roles: UserRole[]; users: Profile[]; onChanged: () => Promise<void> }) {
  const adminUsers = roles.filter(r => r.role === 'admin');

  const [removeTarget, setRemoveTarget] = useState<UserRole | null>(null);
  const [removing, setRemoving] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [assignMsg, setAssignMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [assignTarget, setAssignTarget] = useState<Profile | null>(null);
  const [assigning, setAssigning] = useState(false);

  function emailFor(userId: string): string {
    return users.find(u => u.user_id === userId)?.email || userId;
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await supabase.from('user_roles').delete().eq('user_id', removeTarget.user_id).eq('role', 'admin');
      await onChanged();
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  function searchUser() {
    setAssignMsg(null);
    setAssignTarget(null);
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const target = users.find(u => (u.email || '').toLowerCase() === email);
    if (!target) {
      setAssignMsg({ type: 'error', text: 'Aucun utilisateur trouvé avec cet email.' });
      return;
    }
    setAssignTarget(target);
  }

  async function confirmAssign() {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await supabase.from('user_roles').upsert({
        user_id: assignTarget.user_id,
        role: 'admin',
        created_at: new Date().toISOString(),
      });
      setAssignMsg({ type: 'success', text: `Rôle admin attribué à ${assignTarget.email}` });
      setEmailInput('');
      await onChanged();
    } catch {
      setAssignMsg({ type: 'error', text: 'Erreur lors de l\'opération. Réessaie dans quelques instants.' });
    } finally {
      setAssigning(false);
      setAssignTarget(null);
    }
  }

  return (
    <div>
      <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '20px' }}>Gestion des Rôles</h2>

      <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '8px', padding: '18px 22px', marginBottom: '26px' }}>
        <p style={{ color: '#b0b8d4', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
          Les administrateurs ont accès au panneau d'administration complet. Sois très prudent lors de l'attribution du rôle admin.
        </p>
      </div>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Administrateurs actuels</h3>
        {adminUsers.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucun administrateur enregistré.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {adminUsers.map(r => {
              const email = emailFor(r.user_id);
              const isMain = email === ADMIN_EMAIL;
              return (
                <div key={r.id} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.12)', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '0.9rem' }}>{email}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.74rem' }}>Depuis : {formatDate(r.created_at)}</div>
                  </div>
                  <button
                    onClick={() => !isMain && setRemoveTarget(r)}
                    disabled={isMain}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239,83,80,0.5)',
                      color: '#ef5350',
                      padding: '6px 14px',
                      cursor: isMain ? 'not-allowed' : 'pointer',
                      opacity: isMain ? 0.4 : 1,
                      fontSize: '0.78rem',
                      borderRadius: '4px',
                    }}
                  >
                    Retirer le rôle admin
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Attribuer le rôle admin</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px' }}>
          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Email de l'utilisateur</label>
            <input type="email" value={emailInput} onChange={e => { setEmailInput(e.target.value); setAssignMsg(null); }} placeholder="email@exemple.com" style={inp} />
          </div>
          {assignMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem',
              background: assignMsg.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
              color: assignMsg.type === 'success' ? '#4caf50' : '#ef5350',
              border: `1px solid ${assignMsg.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
            }}>
              {assignMsg.text}
            </div>
          )}
          <button
            onClick={searchUser}
            disabled={!emailInput.trim()}
            style={{
              background: emailInput.trim() ? '#f9a825' : 'rgba(249,168,37,0.3)',
              color: '#1a237e', border: 'none', padding: '12px 24px',
              fontWeight: '700', cursor: emailInput.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem', borderRadius: '4px', alignSelf: 'flex-start',
            }}
          >
            Attribuer le rôle admin
          </button>
        </div>
      </section>

      {sepLine()}

      <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '8px', padding: '22px' }}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1rem', marginBottom: '14px' }}>Comment activer le premier compte admin ?</h3>
        <ol style={{ color: '#b0b8d4', fontSize: '0.86rem', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
          <li>Crée un compte avec l'email admin@secretdivin.com sur /auth</li>
          <li>Connecte-toi avec ce compte</li>
          <li>L'accès admin est automatique car l'email correspond à l'email admin hardcodé</li>
          <li>Tu peux ensuite attribuer le rôle admin à d'autres utilisateurs depuis cet onglet</li>
        </ol>
      </div>

      {/* MODAL RETRAIT ADMIN */}
      {removeTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '28px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#b0b8d4', marginBottom: '24px', fontSize: '0.92rem' }}>
              Retirer le rôle admin à {emailFor(removeTarget.user_id)} ?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={confirmRemove} disabled={removing} style={{ background: '#ef5350', border: 'none', color: 'white', padding: '11px 26px', fontWeight: '700', cursor: removing ? 'not-allowed' : 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                {removing ? 'Suppression...' : 'Confirmer'}
              </button>
              <button onClick={() => setRemoveTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '11px 24px', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION ATTRIBUTION */}
      {assignTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '28px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#b0b8d4', marginBottom: '24px', fontSize: '0.92rem' }}>
              Attribuer le rôle admin à {assignTarget.email} ?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={confirmAssign} disabled={assigning} style={{ background: '#f9a825', border: 'none', color: '#1a237e', padding: '11px 26px', fontWeight: '700', cursor: assigning ? 'not-allowed' : 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                {assigning ? 'Attribution...' : 'Confirmer'}
              </button>
              <button onClick={() => setAssignTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '11px 24px', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CREDITS TAB ───────────────────────────────────────────

function CreditsTab({ users, transactions, onChanged }: { users: Profile[]; transactions: Transaction[]; onChanged: () => Promise<void> }) {
  const [clientEmail, setClientEmail] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [selectedPack, setSelectedPack] = useState(PACK_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  function emailFor(userId: string): string {
    return users.find(u => u.user_id === userId)?.email || userId;
  }

  async function addCredits() {
    setResultMsg(null);
    const amount = parseInt(creditAmount, 10);
    if (!clientEmail.trim() || !amount || amount < 1) return;

    const targetProfile = users.find(u => (u.email || '').toLowerCase() === clientEmail.trim().toLowerCase());
    if (!targetProfile) {
      setResultMsg({ type: 'error', text: 'Utilisateur non trouvé.' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: currentCredits } = await supabase
        .from('user_credits')
        .select('balance, total_purchased')
        .eq('user_id', targetProfile.user_id)
        .single();

      const current = currentCredits as { balance: number; total_purchased: number } | null;
      const newBalance = (current?.balance || 0) + amount;

      await supabase.from('user_credits').upsert({
        user_id: targetProfile.user_id,
        balance: newBalance,
        total_purchased: (current?.total_purchased || 0) + amount,
        updated_at: new Date().toISOString(),
      });

      await supabase.from('credit_transactions').insert({
        user_id: targetProfile.user_id,
        type: 'purchase',
        amount,
        pack: selectedPack,
        balance_after: newBalance,
        description: `Achat pack ${selectedPack} — Admin`,
      });

      if (selectedPack === 'Illimité') {
        await supabase.from('subscriptions').insert({
          user_id: targetProfile.user_id,
          plan: 'unlimited',
          price: 49000,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        });
      }

      setResultMsg({ type: 'success', text: `${amount} crédits ajoutés à ${clientEmail.trim()}. Nouveau solde : ${newBalance} crédits.` });
      setClientEmail('');
      setCreditAmount('');
      await onChanged();
    } catch {
      setResultMsg({ type: 'error', text: 'Erreur lors de l\'opération. Réessaie dans quelques instants.' });
    } finally {
      setSubmitting(false);
    }
  }

  const TYPE_BADGE: Record<string, { bg: string; border: string; color: string }> = {
    purchase: { bg: 'rgba(76,175,80,0.14)', border: 'rgba(76,175,80,0.4)', color: '#4caf50' },
    use:      { bg: 'rgba(239,83,80,0.14)', border: 'rgba(239,83,80,0.4)', color: '#ef5350' },
    refund:   { bg: 'rgba(33,150,243,0.14)', border: 'rgba(33,150,243,0.4)', color: '#2196f3' },
  };

  return (
    <div>
      <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '20px' }}>Gestion des Crédits</h2>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '18px' }}>Ajouter des crédits à un utilisateur</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Email du client</label>
            <input type="email" value={clientEmail} onChange={e => { setClientEmail(e.target.value); setResultMsg(null); }} placeholder="email@exemple.com" style={inp} />
          </div>
          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Nombre de crédits</label>
            <input type="number" min={1} value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Ex: 70" style={inp} />
          </div>
          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Pack acheté</label>
            <select value={selectedPack} onChange={e => setSelectedPack(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {PACK_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {resultMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem',
              background: resultMsg.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
              color: resultMsg.type === 'success' ? '#4caf50' : '#ef5350',
              border: `1px solid ${resultMsg.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
            }}>
              {resultMsg.text}
            </div>
          )}

          <button
            onClick={addCredits}
            disabled={submitting || !clientEmail.trim() || !creditAmount || parseInt(creditAmount, 10) < 1}
            style={{
              background: submitting ? 'rgba(249,168,37,0.4)' : '#f9a825',
              color: '#1a237e', border: 'none', padding: '12px 24px',
              fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', borderRadius: '4px', alignSelf: 'flex-start',
            }}
          >
            {submitting ? 'Ajout en cours...' : 'Ajouter les crédits'}
          </button>
        </div>
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Dernières transactions (20 dernières)</h3>
        {transactions.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucune transaction.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Utilisateur</th>
                  <th style={th}>Type</th>
                  <th style={th}>Montant</th>
                  <th style={th}>Outil/Pack</th>
                  <th style={th}>Solde après</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((t, i) => {
                  const badge = TYPE_BADGE[t.type] ?? TYPE_BADGE.use;
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={td}>{formatDate(t.created_at)}</td>
                      <td style={td}>{emailFor(t.user_id)}</td>
                      <td style={td}>
                        <span style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700', textTransform: 'capitalize' }}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ ...td, color: t.amount > 0 ? '#4caf50' : '#ef5350', fontWeight: '700' }}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </td>
                      <td style={td}>{t.pack || t.description}</td>
                      <td style={td}>{t.balance_after} crédits</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── BLOG TAB ──────────────────────────────────────────────

function BlogTab({ articles, onChanged }: { articles: Article[]; onChanged: () => Promise<void> }) {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [form, setForm] = useState<ArticleForm>(EMPTY_ARTICLE_FORM);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [delConfirm, setDelConfirm] = useState<Article | null>(null);

  function openNew() {
    setForm(EMPTY_ARTICLE_FORM);
    setMsg(null);
    setView('editor');
  }

  function openEdit(art: Article) {
    setForm({
      id: art.id,
      title: art.title,
      slug: art.slug,
      category: art.category,
      excerpt: art.excerpt ?? '',
      content: art.content ?? '',
      coverImage: '',
      publishNow: art.published,
    });
    setMsg(null);
    setView('editor');
  }

  function setTitle(value: string) {
    setForm(f => ({ ...f, title: value, slug: f.id ? f.slug : generateSlug(value) }));
  }

  async function generateContent() {
    if (!form.title.trim()) return;
    setGenerating(true);
    setMsg(null);
    try {
      const key = import.meta.env.VITE_GEMINI_KEY as string;
      const prompt = `Génère un article de blog complet en français sur ce sujet mystique islamique africain : ${form.title}

L'article doit :
- Faire environ 600-800 mots
- Être informatif et accessible
- Inclure des exemples pratiques
- Être structuré avec des paragraphes clairs
- Traiter le sujet avec sérieux et profondeur mystique

Retourne UNIQUEMENT le texte de l'article, sans titre, sans markdown, juste les paragraphes.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.75, maxOutputTokens: 3000 } }),
      });
      const json = await res.json() as GeminiResponse;
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) throw new Error('empty');
      setForm(f => ({ ...f, content: text.trim() }));
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de l\'opération. Réessaie dans quelques instants.' });
    } finally {
      setGenerating(false);
    }
  }

  async function saveArticle() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        slug: form.slug.trim() || generateSlug(form.title),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        category: form.category,
        published: form.publishNow,
        updated_at: new Date().toISOString(),
      };
      if (form.id) {
        payload.id = form.id;
        const { error } = await supabase.from('blog_articles').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        payload.views = 0;
        const { error } = await supabase.from('blog_articles').insert(payload);
        if (error) throw error;
      }
      setMsg({ type: 'success', text: 'Article sauvegardé avec succès' });
      await onChanged();
      setView('list');
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de l\'opération. Réessaie dans quelques instants.' });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(art: Article) {
    await supabase.from('blog_articles').update({ published: !art.published }).eq('id', art.id);
    await onChanged();
  }

  async function confirmDelete() {
    if (!delConfirm) return;
    await supabase.from('blog_articles').delete().eq('id', delConfirm.id);
    setDelConfirm(null);
    await onChanged();
  }

  // ── Editor view ──
  if (view === 'editor') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>
            {form.id ? 'Modifier l\'article' : 'Nouvel article'}
          </h2>
          <button onClick={() => setView('list')} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.3)', color: '#b0b8d4', padding: '8px 16px', cursor: 'pointer', fontSize: '0.84rem', borderRadius: '4px' }}>
            ← Liste des articles
          </button>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>Titre de l'article</label>
            <input type="text" value={form.title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'article" style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="slug-de-l-article" style={inp} />
            </div>
            <div>
              <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>Catégorie</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>Résumé (excerpt) — max 300 caractères</label>
            <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value.slice(0, 300) }))} rows={3} placeholder="Résumé court de l'article..." style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }} />
            <div style={{ color: '#b0b8d4', fontSize: '0.7rem', textAlign: 'right', marginTop: '4px' }}>{form.excerpt.length} / 300</div>
          </div>

          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>URL image de couverture (optionnel)</label>
            <input type="text" value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="https://..." style={inp} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={generateContent} disabled={generating || !form.title.trim()} style={{
              background: generating ? 'rgba(249,168,37,0.3)' : 'transparent',
              border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825',
              padding: '10px 20px', cursor: generating ? 'not-allowed' : 'pointer',
              fontWeight: '600', fontSize: '0.86rem', borderRadius: '4px',
            }}>
              {generating ? 'Génération en cours...' : 'Générer l\'article'}
            </button>
          </div>

          <div>
            <label style={{ color: '#b0b8d4', fontSize: '0.83rem', display: 'block', marginBottom: '6px' }}>Contenu de l'article</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={18} placeholder="Contenu de l'article..." style={{ ...inp, resize: 'vertical', lineHeight: '1.7', fontFamily: 'monospace', fontSize: '0.86rem' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#b0b8d4', fontSize: '0.86rem' }}>
            <input type="checkbox" checked={form.publishNow} onChange={e => setForm(f => ({ ...f, publishNow: e.target.checked }))} />
            Publier maintenant
          </label>

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem',
              background: msg.type === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(239,83,80,0.1)',
              color: msg.type === 'success' ? '#4caf50' : '#ef5350',
              border: `1px solid ${msg.type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'}`,
            }}>
              {msg.text}
            </div>
          )}

          <button onClick={saveArticle} disabled={saving || !form.title.trim() || !form.content.trim()} style={{
            background: saving ? 'rgba(249,168,37,0.4)' : '#f9a825',
            color: '#1a237e', border: 'none', padding: '13px 28px',
            fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.92rem', borderRadius: '4px', alignSelf: 'flex-start',
          }}>
            {saving ? 'Enregistrement...' : 'Enregistrer l\'article'}
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', margin: 0 }}>Gestion du Blog</h2>
        <button onClick={openNew} style={{ background: '#f9a825', color: '#1a237e', border: 'none', padding: '11px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '0.88rem', borderRadius: '4px' }}>
          + Nouvel article
        </button>
      </div>

      {sepLine()}

      {articles.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#b0b8d4' }}>Aucun article. Crée le premier.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={th}>Titre</th>
                <th style={th}>Catégorie</th>
                <th style={th}>Statut</th>
                <th style={th}>Vues</th>
                <th style={th}>Date</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((art, i) => (
                <tr key={art.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ ...td, color: 'white', whiteSpace: 'normal', minWidth: '220px' }}>{art.title}</td>
                  <td style={td}>{art.category}</td>
                  <td style={td}>
                    {art.published
                      ? <span style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.4)', color: '#4caf50', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>Publié</span>
                      : <span style={{ background: 'rgba(176,184,212,0.1)', border: '1px solid rgba(176,184,212,0.3)', color: '#b0b8d4', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem' }}>Brouillon</span>}
                  </td>
                  <td style={td}>{art.views ?? 0} lectures</td>
                  <td style={td}>{formatDateShort(art.created_at)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(art)} style={smallBtn('#f9a825', false)}>Modifier</button>
                      <button onClick={() => togglePublish(art)} style={art.published ? smallBtn('#b0b8d4', false) : smallBtn('#f9a825', true)}>
                        {art.published ? 'Dépublier' : 'Publier'}
                      </button>
                      <button onClick={() => setDelConfirm(art)} style={smallBtn('#ef5350', false)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111a55', border: '1px solid #f9a825', borderRadius: '10px', padding: '28px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <p style={{ color: '#b0b8d4', marginBottom: '24px', fontSize: '0.92rem' }}>
              Supprimer définitivement l'article « {delConfirm.title} » ?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={confirmDelete} style={{ background: '#ef5350', border: 'none', color: 'white', padding: '11px 26px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Confirmer
              </button>
              <button onClick={() => setDelConfirm(null)} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.5)', color: '#f9a825', padding: '11px 24px', cursor: 'pointer', fontSize: '0.9rem', borderRadius: '4px' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────

function StatsTab({ users, consultations, formation }: { users: Profile[]; consultations: Consultation[]; formation: FormationModuleRow[] }) {
  function emailFor(userId: string): string {
    return users.find(u => u.user_id === userId)?.email || 'Utilisateur';
  }

  // Formation par module (1 à 9)
  const moduleRows = Array.from({ length: 9 }, (_, idx) => {
    const moduleId = idx + 1;
    const moduleData = formation.filter(f => f.module_id === moduleId);
    const completed = moduleData.filter(f => f.is_completed).length;
    const scores = moduleData.filter(f => f.is_completed && f.best_score > 0).map(f => f.best_score);
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { moduleId, completed, bestScore, avgScore };
  });

  // Outils les plus utilisés
  const countByTool: Record<string, number> = {};
  consultations.forEach(c => {
    const tool = c.page_source || 'autre';
    countByTool[tool] = (countByTool[tool] || 0) + 1;
  });
  const toolRanking = Object.entries(countByTool).sort((a, b) => b[1] - a[1]);
  const maxToolCount = toolRanking.length > 0 ? toolRanking[0][1] : 1;

  // Répartition par religion
  const byReligion: Record<string, number> = {};
  users.forEach(u => {
    const r = u.religion || 'Non renseignée';
    byReligion[r] = (byReligion[r] || 0) + 1;
  });
  const religionRows = Object.entries(byReligion).sort((a, b) => b[1] - a[1]);

  // Répartition par genre
  const hommes = users.filter(u => u.gender === 'homme').length;
  const femmes = users.filter(u => u.gender === 'femme').length;
  const nonRenseigne = users.length - hommes - femmes;
  const pct = (n: number) => users.length > 0 ? Math.round((n / users.length) * 100) : 0;

  return (
    <div>
      <h2 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.2rem', marginBottom: '20px' }}>Statistiques détaillées</h2>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Formation par module</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
            <thead>
              <tr>
                <th style={th}>Module</th>
                <th style={th}>Complétés</th>
                <th style={th}>Meilleur score</th>
                <th style={th}>Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((m, i) => (
                <tr key={m.moduleId} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ ...td, color: 'white' }}>Module {m.moduleId}</td>
                  <td style={td}>{m.completed}</td>
                  <td style={td}>{m.bestScore}/100</td>
                  <td style={td}>{m.avgScore}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Outils les plus utilisés</h3>
        {toolRanking.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucune consultation enregistrée.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {toolRanking.map(([tool, count]) => (
              <div key={tool} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ color: 'white', minWidth: '120px', textTransform: 'capitalize', fontSize: '0.86rem' }}>{tool}</span>
                <div style={{ width: `${(count / maxToolCount) * 200}px`, height: '10px', background: '#f9a825', borderRadius: '5px' }} />
                <span style={{ color: '#b0b8d4', fontSize: '0.8rem' }}>{count} consultations</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Répartition par religion</h3>
        {religionRows.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucun utilisateur.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '380px' }}>
              <thead>
                <tr><th style={th}>Religion</th><th style={th}>Utilisateurs</th><th style={th}>%</th></tr>
              </thead>
              <tbody>
                {religionRows.map(([religion, count], i) => (
                  <tr key={religion} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...td, color: 'white' }}>{religion}</td>
                    <td style={td}>{count}</td>
                    <td style={td}>{Math.round((count / users.length) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>Répartition par genre</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: nonRenseigne > 0 ? '14px' : 0 }}>
          <div style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '6px' }}>Hommes</div>
            <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem' }}>{hommes}</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>({pct(hommes)}%)</div>
          </div>
          <div style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.15)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
            <div style={{ color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '6px' }}>Femmes</div>
            <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '2rem' }}>{femmes}</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>({pct(femmes)}%)</div>
          </div>
        </div>
        {nonRenseigne > 0 && (
          <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>Non renseigné : {nonRenseigne}</div>
        )}
      </section>

      {sepLine()}

      <section style={card}>
        <h3 style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.05rem', marginBottom: '16px' }}>10 dernières consultations</h3>
        {consultations.length === 0 ? (
          <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Aucune consultation enregistrée.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {consultations.slice(0, 10).map((c, i) => (
              <div key={i} style={{ background: '#0a0e2e', border: '1px solid rgba(249,168,37,0.12)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: 'white', fontWeight: '700', fontSize: '0.84rem' }}>{emailFor(c.user_id)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: 'rgba(249,168,37,0.12)', border: '1px solid rgba(249,168,37,0.35)', color: '#f9a825', padding: '2px 10px', borderRadius: '10px', fontSize: '0.7rem', textTransform: 'capitalize' }}>
                    {c.page_source}
                  </span>
                  <span style={{ color: '#b0b8d4', fontSize: '0.72rem' }}>{formatDate(c.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
