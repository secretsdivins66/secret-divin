import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { validatePassword, getPasswordStrength } from '../utils/security';
import logo from '../assets/logo.svg';

type Tab = 'login' | 'register';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate(from, { replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) { setError(passwordCheck.message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess('Compte créé ! Vérifie ton email pour confirmer ton inscription.');
  }

  async function handleGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a0e2e',
    border: '1px solid rgba(249,168,37,0.3)',
    color: 'white',
    padding: '12px 16px',
    fontSize: '1rem',
    outline: 'none',
    borderRadius: '4px',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={logo}
            alt="Secret Divin"
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 12px rgba(249,168,37,0.5))',
              margin: '0 auto 16px',
              display: 'block',
            }}
          />
          <h1 style={{ color: '#f9a825', fontSize: '1.8rem', fontWeight: '700' }}>Secret Divin</h1>
          <p style={{ color: '#b0b8d4', fontSize: '0.9rem', marginTop: '4px' }}>Sagesse Spirituelle</p>
          <p style={{ color: '#f9a825', fontFamily: 'Noto Naskh Arabic, serif', fontSize: '1rem', direction: 'rtl', marginTop: '4px' }}>الحكمة الروحية</p>
        </div>

        {/* Carte */}
        <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '8px', padding: '32px' }}>
          {/* Onglets */}
          <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid rgba(249,168,37,0.2)' }}>
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid #f9a825' : '2px solid transparent',
                  color: tab === t ? '#f9a825' : '#b0b8d4',
                  fontWeight: tab === t ? '700' : '400',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: '-1px',
                }}
              >
                {t === 'login' ? 'Se connecter' : "S'inscrire"}
              </button>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid #e53935', color: '#ef9a9a', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid #4caf50', color: '#a5d6a7', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {success}
            </div>
          )}

          {/* Formulaire connexion */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ton@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif', borderRadius: '4px' }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* Formulaire inscription */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ton@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="8 caractères, 1 majuscule, 1 chiffre" style={inputStyle} />
                {password && (() => {
                  const strength = getPasswordStrength(password);
                  return (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3].map(level => (
                          <div key={level} style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: level <= strength.level ? strength.color : 'rgba(255,255,255,0.1)',
                          }} />
                        ))}
                      </div>
                      <span style={{ color: strength.color, fontSize: '0.8rem' }}>{strength.label}</span>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Confirmer le mot de passe</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={{ background: '#f9a825', color: '#1a237e', fontWeight: '700', padding: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif', borderRadius: '4px' }}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(249,168,37,0.2)' }} />
            <span style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>ou</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(249,168,37,0.2)' }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(249,168,37,0.4)',
              color: 'white',
              padding: '12px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '4px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}
