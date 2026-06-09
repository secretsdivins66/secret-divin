import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { CreditBadge } from './CreditBadge';
import { getIsPlaying, stopSpeaking } from '../utils/tts';
import logo from '../assets/logo.svg';

const PUBLIC_PATHS = ['/', '/auth', '/fonctionnalites', '/credits', '/blog', '/contact', '/marabouts'];

function useUser() {
  const [user, setUser] = useState<unknown>(null);
  const [credits, setCredits] = useState<number>(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setCredits(0); setIsUnlimited(false); setCreditsLoading(false); return; }
    const u = user as { id: string };
    setCreditsLoading(true);
    supabase
      .from('profiles')
      .select('credits, is_unlimited')
      .eq('id', u.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as { credits: number; is_unlimited?: boolean };
          setCredits(d.credits ?? 0);
          setIsUnlimited(d.is_unlimited ?? false);
        }
        setCreditsLoading(false);
      });
  }, [user]);

  return { user, credits, isUnlimited, creditsLoading };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, credits, isUnlimited, creditsLoading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const isPublic = PUBLIC_PATHS.some(p => location.pathname === p || location.pathname.startsWith('/blog/') || location.pathname.startsWith('/marabouts/'));

  useEffect(() => {
    const interval = setInterval(() => {
      setAudioPlaying(getIsPlaying());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Déconnexion automatique après 30 minutes d'inactivité (utilisateurs connectés)
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    let inactivityTimer: ReturnType<typeof setTimeout>;

    function resetInactivityTimer() {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, INACTIVITY_TIMEOUT);
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetInactivityTimer));
      clearTimeout(inactivityTimer);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0e2e' }}>
      {/* HEADER */}
      <header style={{
        background: 'rgba(10,14,46,0.95)',
        borderBottom: '1px solid rgba(249,168,37,0.2)',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={logo}
              alt="Secret Divin"
              className="logo-img"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 8px rgba(249,168,37,0.4))',
                transition: 'filter 0.3s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.target as HTMLImageElement).style.filter = 'drop-shadow(0 0 14px rgba(249,168,37,0.7))'; }}
              onMouseLeave={e => { (e.target as HTMLImageElement).style.filter = 'drop-shadow(0 0 8px rgba(249,168,37,0.4))'; }}
            />
            <div className="logo-textes">
              <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.1rem', lineHeight: 1 }}>Secret Divin</div>
              <div style={{ color: '#b0b8d4', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase' }}>SAGESSE SPIRITUELLE</div>
              <div style={{ color: '#f9a825', fontSize: '0.8rem', fontFamily: 'Noto Naskh Arabic, serif', direction: 'rtl' }}>الحكمة الروحية</div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Bouton stop lecture audio globale */}
          {audioPlaying && (
            <button
              onClick={() => { stopSpeaking(); setAudioPlaying(false); }}
              style={{
                border: '1px solid #e53935',
                color: '#e53935',
                background: 'transparent',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              Arrêter la lecture
            </button>
          )}

          {/* Nav desktop */}
          <nav style={{ alignItems: 'center', gap: '24px' }} className="hidden md:flex">
            {!user ? (
              <>
                <Link to="/fonctionnalites" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Fonctionnalités</Link>
                <Link to="/credits" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Tarifs</Link>
                <Link to="/marabouts" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Marabouts</Link>
                <Link to="/blog" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Blog</Link>
                <Link to="/contact" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Contact</Link>
                <Link to="/auth" style={{ background: '#f9a825', color: '#1a237e', padding: '8px 20px', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}>
                  Connexion
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
                <Link to="/marabouts" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Marabouts</Link>
                <Link to="/profil" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Profil</Link>
                <CreditBadge balance={credits} isUnlimited={isUnlimited} loading={creditsLoading} />
                <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#b0b8d4', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Déconnexion
                </button>
              </>
            )}
          </nav>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'transparent', border: 'none', color: '#f9a825', fontSize: '1.5rem', cursor: 'pointer' }}
            className="md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {menuOpen && (
          <div style={{ background: '#111a55', borderTop: '1px solid rgba(249,168,37,0.2)', padding: '16px 20px' }}>
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/fonctionnalites" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Fonctionnalités</Link>
                <Link to="/credits" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Tarifs</Link>
                <Link to="/marabouts" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Marabouts</Link>
                <Link to="/blog" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Blog</Link>
                <Link to="/contact" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Contact</Link>
                <Link to="/auth" onClick={() => setMenuOpen(false)} style={{ background: '#f9a825', color: '#1a237e', padding: '10px', fontWeight: '700', textDecoration: 'none', textAlign: 'center' }}>
                  Connexion
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <CreditBadge balance={credits} isUnlimited={isUnlimited} loading={creditsLoading} />
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Dashboard</Link>
                <Link to="/marabouts" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Marabouts</Link>
                <Link to="/profil" onClick={() => setMenuOpen(false)} style={{ color: '#b0b8d4', textDecoration: 'none' }}>Profil</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{ background: 'transparent', border: '1px solid rgba(249,168,37,0.4)', color: '#b0b8d4', padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* CONTENU */}
      <main style={{ flex: 1, paddingBottom: !!user && !isPublic ? '80px' : '0' }}>
        {children}
      </main>

      {/* FOOTER */}
      <footer style={{ background: '#060918', borderTop: '1px solid rgba(249,168,37,0.1)', padding: '40px 20px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <img
              src={logo}
              alt="Secret Divin"
              style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(249,168,37,0.35))' }}
            />
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: '700', color: '#f9a825' }}>Secret Divin</div>
              <div style={{ fontSize: '0.55rem', color: '#b0b8d4', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Sagesse Spirituelle</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h4 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '12px' }}>Services</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[['Poids Mystique', '/poids-mystique'], ['Carrés Magiques', '/carres-magiques'], ['Destin', '/destin'], ['Géomancie', '/geomancie']].map(([label, path]) => (
                  <Link key={path} to={path} style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '12px' }}>À propos</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[['Fonctionnalités', '/fonctionnalites'], ['Tarifs', '/credits'], ['Marabouts', '/marabouts'], ['Blog', '/blog']].map(([label, path]) => (
                  <Link key={path} to={path} style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '12px' }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/contact" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Nous contacter</Link>
                <Link to="/auth" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.9rem' }}>Créer un compte</Link>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(249,168,37,0.1)', paddingTop: '20px', textAlign: 'center', color: '#b0b8d4', fontSize: '0.85rem' }}>
            © 2026 Secret Divin — Sagesse Spirituelle. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* BARRE MOBILE INFÉRIEURE (connecté seulement) */}
      {!!user && !isPublic && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#111a55',
          borderTop: '1px solid rgba(249,168,37,0.2)',
          display: 'flex',
          zIndex: 99,
        }}>
          {[
            { label: 'Dashboard', path: '/dashboard', icon: '⊞' },
            { label: 'Carrés', path: '/carres-magiques', icon: '◈' },
            { label: 'Destin', path: '/destin', icon: '✦' },
            { label: 'Plantes', path: '/plantes', icon: '🌿' },
            { label: 'Profil', path: '/profil', icon: '◎' },
          ].map(({ label, path, icon }) => (
            <Link
              key={path}
              to={path}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px',
                textDecoration: 'none',
                color: location.pathname === path ? '#f9a825' : '#b0b8d4',
                fontSize: '0.7rem',
                gap: '4px',
                borderTop: location.pathname === path ? '2px solid #f9a825' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
