import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { WHATSAPP_NUMBER } from '../utils/mystique';
import { Reveal } from '../components/Reveal';
import { isValidEmail, sanitizeInput, checkRateLimit } from '../utils/security';

const SEP = '——— ✦ ———';

const SUBJECTS = [
  'Question générale',
  'Problème technique',
  'Achat de crédits',
  'Partenariat',
  'Signaler un problème',
  'Autre',
];

const inp: React.CSSProperties = {
  width: '100%',
  background: '#0a0e2e',
  border: '1px solid rgba(249,168,37,0.25)',
  color: 'white',
  padding: '12px 16px',
  fontSize: '0.95rem',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box',
};

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    if (!isValidEmail(form.email.trim())) {
      setErr('Adresse email invalide.');
      return;
    }
    if (!checkRateLimit('contact_form', 3, 60000)) {
      setErr('Trop de messages envoyés. Réessaie dans quelques instants.');
      return;
    }
    setSending(true);
    setErr('');
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: sanitizeInput(form.name.trim()),
        email: form.email.trim(),
        subject: form.subject,
        message: sanitizeInput(form.message.trim()),
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setErr('Une erreur est survenue. Contactez-nous directement via WhatsApp.');
    } finally {
      setSending(false);
    }
  }

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Bonjour, je vous contacte depuis Secret Divin.')}`;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* En-tête */}
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
            Nous contacter
          </h1>
          <p style={{ color: '#b0b8d4', fontSize: '1rem' }}>
            Une question, un problème, une suggestion ? Nous sommes là.
          </p>
          <div style={{ color: '#b0b8d4', marginTop: '16px', letterSpacing: '3px' }}>{SEP}</div>
        </div>
      </Reveal>

      {/* Verset décoratif */}
      <Reveal delay={80}>
        <div style={{
          background: '#111a55',
          border: '1px solid rgba(249,168,37,0.2)',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <div style={{
            fontFamily: 'Noto Naskh Arabic, serif',
            fontSize: '1.6rem',
            color: '#f9a825',
            direction: 'rtl',
            lineHeight: '2',
            marginBottom: '10px',
          }}>
            وَقُل رَّبِّ زِدْنِي عِلْمًا
          </div>
          <div style={{ color: '#b0b8d4', fontSize: '0.88rem', fontStyle: 'italic' }}>
            « Et dis : Seigneur, accroîs ma science. » — Ta-Ha : 114
          </div>
        </div>
      </Reveal>

      {/* Bouton WhatsApp */}
      <Reveal delay={120}>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'rgba(37,211,102,0.12)',
            border: '1px solid rgba(37,211,102,0.4)',
            color: '#25d366',
            padding: '14px',
            borderRadius: '6px',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '1rem',
            marginBottom: '32px',
          }}
        >
          Contacter directement via WhatsApp
        </a>
      </Reveal>

      {/* Formulaire ou succès */}
      {sent ? (
        <Reveal>
          <div style={{
            background: '#111a55',
            border: '2px solid #4caf50',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✦</div>
            <h2 style={{ color: '#4caf50', fontWeight: '700', marginBottom: '8px' }}>Message envoyé</h2>
            <p style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>
              Votre message a été reçu. Nous vous répondrons sous 24h ou contactez-nous via WhatsApp pour une réponse immédiate.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={160}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{
              background: '#111a55',
              border: '1px solid rgba(249,168,37,0.2)',
              borderRadius: '8px',
              padding: '28px',
            }}>
              <h2 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '20px', fontSize: '1.1rem' }}>
                Formulaire de contact
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                    Votre nom *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Ibrahim Diallo"
                    required
                    style={inp}
                  />
                </div>
                <div>
                  <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="exemple@gmail.com"
                    required
                    style={inp}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                  Sujet
                </label>
                <select
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  style={{ ...inp, cursor: 'pointer' }}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#b0b8d4', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                  Votre message *
                </label>
                <textarea
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  placeholder="Décrivez votre question ou remarque..."
                  required
                  rows={6}
                  style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }}
                />
              </div>

              {err && (
                <div style={{ color: '#ef5350', fontSize: '0.88rem', marginBottom: '14px', padding: '10px', background: 'rgba(239,83,80,0.1)', borderRadius: '4px' }}>
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  background: sending ? 'rgba(249,168,37,0.4)' : '#f9a825',
                  color: '#1a237e',
                  border: 'none',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  borderRadius: '4px',
                }}
              >
                {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
            </div>
          </form>
        </Reveal>
      )}
    </div>
  );
}
