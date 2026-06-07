import { PACKS, WHATSAPP_NUMBER } from '../utils/mystique';

interface Props {
  toolName: string;
  cost: number;
  balance: number;
  onClose: () => void;
}

function waUrl(pack: typeof PACKS[0]): string {
  const msg = pack.credits === null
    ? `Bonjour, je souhaite souscrire au pack ${pack.name} (Illimité 1 mois) — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`
    : `Bonjour, je souhaite acheter le pack ${pack.name} — ${pack.credits} crédits — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function CreditModal({ toolName, cost, balance, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.82)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: '#111a55',
        border: '1px solid #f9a825',
        borderRadius: '10px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ color: '#f9a825', fontWeight: 'bold', fontSize: '1.3rem', marginBottom: '12px' }}>
          Crédits insuffisants
        </h2>
        <p style={{ color: '#b0b8d4', marginBottom: '4px' }}>
          Solde actuel : <strong style={{ color: 'white' }}>{balance} crédit(s)</strong>
        </p>
        <p style={{ color: '#b0b8d4', marginBottom: '24px' }}>
          Requis : <strong style={{ color: '#f9a825' }}>{cost} crédits</strong> pour {toolName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {PACKS.filter(p => p.id !== 'unlimited').map(pack => (
            <div key={pack.id} style={{
              background: '#0a0e2e',
              border: '1px solid rgba(249,168,37,0.25)',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{pack.name}</span>
                <span style={{ color: '#b0b8d4', fontSize: '0.82em', marginLeft: '8px' }}>
                  {pack.credits} crédits
                </span>
                <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.95rem' }}>
                  {pack.price.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <a
                href={waUrl(pack)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(37,211,102,0.15)',
                  border: '1px solid rgba(37,211,102,0.4)',
                  color: '#25d366',
                  padding: '7px 14px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                WhatsApp
              </a>
            </div>
          ))}

          {/* Unlimited pack */}
          {PACKS.filter(p => p.id === 'unlimited').map(pack => (
            <div key={pack.id} style={{
              background: '#0a0e2e',
              border: '1px solid rgba(249,168,37,0.5)',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{ color: '#f9a825', fontWeight: 'bold' }}>{pack.name}</span>
                <span style={{ color: '#b0b8d4', fontSize: '0.82em', marginLeft: '8px' }}>
                  Accès total 1 mois
                </span>
                <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.95rem' }}>
                  {pack.price.toLocaleString('fr-FR')} FCFA/mois
                </div>
              </div>
              <a
                href={waUrl(pack)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(37,211,102,0.15)',
                  border: '1px solid rgba(37,211,102,0.4)',
                  color: '#25d366',
                  padding: '7px 14px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                WhatsApp
              </a>
            </div>
          ))}
        </div>

        <a
          href="/credits"
          style={{
            display: 'block',
            background: '#f9a825',
            color: '#1a237e',
            textAlign: 'center',
            padding: '12px',
            fontWeight: 'bold',
            textDecoration: 'none',
            marginBottom: '10px',
            borderRadius: '4px',
          }}
        >
          Voir tous les tarifs
        </a>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid rgba(249,168,37,0.4)',
            color: '#f9a825',
            padding: '10px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
