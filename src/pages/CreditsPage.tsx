import { useState, useEffect } from 'react';
import { PACKS, TOOL_COSTS, WHATSAPP_NUMBER } from '../utils/mystique';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabaseClient';

const SEP = '——— ✦ ———';

const TOOL_LABELS: Record<string, string> = {
  'poids-mystique':  'Poids Mystique',
  'tutoriels':       'Tutoriels',
  'carres-magiques': 'Carrés Magiques',
  'destin':          'Destin & Vocation',
  'attraper':        'Attraper / Talisman',
  'secrets':         'Secrets Mystiques',
  'geomancie':       'Géomancie',
  'compatibilite':   'Compatibilité',
  'reves':           'Rêves',
  'plantes':         'Plantes Mystiques',
  'jours':           'Jours Favorables',
  'formation':       'Formation (par leçon)',
};

const STEPS = [
  {
    num: '01',
    title: 'Choisissez votre pack',
    desc: 'Sélectionnez le pack adapté à vos besoins. Pas d\'abonnement caché, pas d\'engagement.',
  },
  {
    num: '02',
    title: 'Contactez-nous via WhatsApp',
    desc: 'Cliquez sur le bouton WhatsApp du pack choisi. Votre message est pré-rempli avec tous les détails.',
  },
  {
    num: '03',
    title: 'Recevez vos crédits',
    desc: 'Après confirmation du paiement, vos crédits sont ajoutés à votre compte en moins de 30 minutes.',
  },
];

const PAYMENT_METHODS = [
  { label: 'Orange Money',       desc: 'Transfert mobile instantané' },
  { label: 'Wave',               desc: 'Sans frais de transfert' },
  { label: 'MTN Mobile Money',   desc: 'Disponible dans toute la zone' },
  { label: 'Virement bancaire',  desc: 'Sur demande uniquement' },
  { label: 'PayPal',             desc: 'Paiement international' },
  { label: 'Crypto USDT TRC20',  desc: 'Transfert blockchain sécurisé' },
];

const FAQ_ITEMS = [
  {
    q: 'Mes crédits expirent-ils ?',
    a: 'Non. Vos crédits sont permanents et ne s\'expirent jamais. Vous pouvez les utiliser à votre propre rythme, sans pression.',
  },
  {
    q: 'Combien de temps pour recevoir mes crédits ?',
    a: 'Après confirmation du paiement, vos crédits sont ajoutés en moins de 30 minutes, généralement en quelques minutes seulement.',
  },
  {
    q: 'Que se passe-t-il si une génération échoue ?',
    a: 'En cas d\'erreur technique lors d\'une génération, vos crédits sont automatiquement remboursés sur votre compte, sans délai.',
  },
  {
    q: 'Le pack Illimité, c\'est quoi exactement ?',
    a: 'Le pack Illimité vous donne accès à toutes les fonctionnalités de la plateforme sans compter vos crédits, pour un mois complet à partir de la date d\'activation.',
  },
  {
    q: 'Puis-je cumuler plusieurs recharges ?',
    a: 'Oui. Chaque recharge s\'additionne à votre solde existant. Il n\'y a aucune limite sur le nombre de crédits accumulés.',
  },
  {
    q: 'Puis-je partager mes crédits avec quelqu\'un d\'autre ?',
    a: 'Non. Les crédits sont liés à votre compte personnel et ne peuvent pas être transférés à un autre utilisateur.',
  },
];

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

function waUrl(pack: typeof PACKS[0]): string {
  const msg = pack.credits === null
    ? `Bonjour, je souhaite souscrire au pack ${pack.name} (Illimité 1 mois) — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`
    : `Bonjour, je souhaite acheter le pack ${pack.name} — ${pack.credits} crédits — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const card: React.CSSProperties = {
  background: '#111a55',
  border: '1px solid rgba(249,168,37,0.2)',
  borderRadius: '8px',
};

export function CreditsPage() {
  const { balance, isUnlimited, userId } = useCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) { setTransactions([]); return; }
    setTxLoading(true);
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setTransactions(data as Transaction[]);
        setTxLoading(false);
      });
  }, [userId]);

  const isLoggedIn = !!userId;
  const balanceLow = !isUnlimited && balance < 5;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* En-tête */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
          Recharger mes crédits
        </h1>
        <p style={{ color: '#b0b8d4', fontSize: '1.05rem' }}>
          Des crédits permanents, des tarifs transparents, une recharge en quelques minutes
        </p>
        <div style={{ color: '#b0b8d4', marginTop: '16px', letterSpacing: '3px' }}>{SEP}</div>
      </div>

      {/* Solde actuel */}
      {isLoggedIn && (
        <div style={{
          ...card,
          border: `2px solid ${isUnlimited ? '#4caf50' : balanceLow ? '#ef5350' : '#f9a825'}`,
          padding: '24px 32px',
          marginBottom: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ color: '#b0b8d4', fontSize: '0.88rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Votre solde actuel
            </div>
            <div style={{ fontSize: '2.8rem', fontWeight: '700', color: isUnlimited ? '#4caf50' : balanceLow ? '#ef5350' : '#f9a825', lineHeight: 1 }}>
              {isUnlimited ? 'Illimité' : `${balance}`}
            </div>
            {!isUnlimited && (
              <div style={{ color: '#b0b8d4', fontSize: '0.9rem', marginTop: '4px' }}>
                {balanceLow
                  ? '✦ Solde faible — rechargez pour continuer'
                  : `crédit${balance > 1 ? 's' : ''} disponible${balance > 1 ? 's' : ''}`}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#b0b8d4', fontSize: '0.85rem' }}>Chaque outil coûte</div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '1.3rem' }}>2 crédits</div>
            <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>sauf outils gratuits</div>
          </div>
        </div>
      )}

      {/* Packs */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '24px', textAlign: 'center' }}>
          Choisissez votre pack ✦
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
        }}>
          {PACKS.map(pack => (
            <div key={pack.id} style={{
              ...card,
              border: `2px solid ${pack.popular ? '#f9a825' : 'rgba(249,168,37,0.22)'}`,
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {pack.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#f9a825',
                  color: '#1a237e',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '3px 14px',
                  letterSpacing: '1.5px',
                  whiteSpace: 'nowrap',
                }}>
                  POPULAIRE
                </div>
              )}
              <div>
                <div style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.15rem' }}>{pack.name}</div>
                <div style={{ color: '#b0b8d4', fontSize: '0.83rem' }}>{pack.description}</div>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: '700', color: 'white', lineHeight: 1.1 }}>
                {pack.price.toLocaleString('fr-FR')}
                <span style={{ fontSize: '0.85rem', color: '#b0b8d4', fontWeight: '400' }}> FCFA</span>
                {pack.period && (
                  <span style={{ fontSize: '0.72rem', color: '#b0b8d4', fontWeight: '400' }}>/{pack.period}</span>
                )}
              </div>
              <div style={{
                background: 'rgba(249,168,37,0.1)',
                border: '1px solid rgba(249,168,37,0.2)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#f9a825',
                fontWeight: '600',
                textAlign: 'center',
                fontSize: '0.95rem',
              }}>
                {pack.credits === null ? 'Accès illimité' : `${pack.credits} crédits`}
              </div>
              <a
                href={waUrl(pack)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  background: pack.popular ? '#f9a825' : 'transparent',
                  border: `2px solid ${pack.popular ? '#f9a825' : 'rgba(37,211,102,0.5)'}`,
                  color: pack.popular ? '#1a237e' : '#25d366',
                  padding: '11px',
                  textAlign: 'center',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontSize: '0.88rem',
                  borderRadius: '4px',
                  marginTop: 'auto',
                }}
              >
                Commander via WhatsApp
              </a>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '60px' }}>{SEP}</div>

      {/* Tableau des coûts */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '24px', textAlign: 'center' }}>
          Coût par outil
        </h2>
        <div style={{ ...card, overflow: 'hidden' }}>
          {Object.entries(TOOL_COSTS).map(([key, cost], i, arr) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '13px 20px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
            }}>
              <span style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>{TOOL_LABELS[key] ?? key}</span>
              <span style={{
                color: cost === 0 ? '#4caf50' : '#f9a825',
                fontWeight: '600',
                background: cost === 0 ? 'rgba(76,175,80,0.1)' : 'rgba(249,168,37,0.1)',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                border: `1px solid ${cost === 0 ? 'rgba(76,175,80,0.25)' : 'rgba(249,168,37,0.2)'}`,
              }}>
                {cost === 0 ? 'GRATUIT' : `${cost} crédits`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '60px' }}>{SEP}</div>

      {/* 3 étapes */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '32px', textAlign: 'center' }}>
          Comment recharger ?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
          {STEPS.map(step => (
            <div key={step.num} style={{ ...card, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{
                width: '52px', height: '52px',
                background: 'linear-gradient(135deg, #f9a825, #e65100)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '1.05rem', fontWeight: '700', color: 'white',
              }}>
                {step.num}
              </div>
              <h3 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '10px', fontSize: '1rem' }}>
                {step.title}
              </h3>
              <p style={{ color: '#b0b8d4', fontSize: '0.88rem', lineHeight: '1.65' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '60px' }}>{SEP}</div>

      {/* Moyens de paiement */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '24px', textAlign: 'center' }}>
          Moyens de paiement acceptés
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {PAYMENT_METHODS.map(pm => (
            <div key={pm.label} style={{
              ...card,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '0.93rem' }}>✦ {pm.label}</div>
              <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>{pm.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Historique des transactions */}
      {isLoggedIn && (
        <>
          <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '60px' }}>{SEP}</div>
          <section style={{ marginBottom: '60px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '24px', textAlign: 'center' }}>
              Historique des transactions
            </h2>
            {txLoading ? (
              <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '48px' }}>Chargement...</div>
            ) : transactions.length === 0 ? (
              <div style={{ ...card, padding: '40px', textAlign: 'center', color: '#b0b8d4' }}>
                Aucune transaction enregistrée pour le moment.
              </div>
            ) : (
              <div style={{ ...card, overflow: 'hidden' }}>
                {transactions.map((tx, i) => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '13px 20px',
                    borderBottom: i < transactions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    flexWrap: 'wrap',
                    gap: '8px',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ color: 'white', fontSize: '0.9rem' }}>
                        {tx.description || tx.type}
                      </div>
                      <div style={{ color: '#b0b8d4', fontSize: '0.73rem', marginTop: '2px' }}>
                        {fmtDate(tx.created_at)} — {fmtTime(tx.created_at)}
                      </div>
                    </div>
                    <div style={{
                      fontWeight: '700',
                      fontSize: '1rem',
                      color: tx.amount > 0 ? '#4caf50' : '#ef5350',
                      whiteSpace: 'nowrap',
                    }}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount} crédit{Math.abs(tx.amount) > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <div style={{ textAlign: 'center', color: '#b0b8d4', letterSpacing: '3px', marginBottom: '60px' }}>{SEP}</div>

      {/* FAQ */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: '#f9a825', marginBottom: '24px', textAlign: 'center' }}>
          Questions fréquentes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{
              ...card,
              border: `1px solid ${faqOpen === i ? 'rgba(249,168,37,0.45)' : 'rgba(249,168,37,0.15)'}`,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.93rem',
                  gap: '12px',
                }}
              >
                <span>{item.q}</span>
                <span style={{ color: '#f9a825', fontSize: '1.3rem', flexShrink: 0, lineHeight: 1 }}>
                  {faqOpen === i ? '−' : '+'}
                </span>
              </button>
              {faqOpen === i && (
                <div style={{
                  padding: '0 20px 16px',
                  color: '#b0b8d4',
                  lineHeight: '1.7',
                  fontSize: '0.88rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '14px',
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
