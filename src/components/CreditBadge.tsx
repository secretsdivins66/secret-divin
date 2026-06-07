import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  balance: number;
  isUnlimited: boolean;
  loading: boolean;
}

export function CreditBadge({ balance, isUnlimited, loading }: Props) {
  const low = !isUnlimited && balance < 5;
  const [dim, setDim] = useState(false);

  useEffect(() => {
    if (!low) { setDim(false); return; }
    const t = setInterval(() => setDim(d => !d), 700);
    return () => clearInterval(t);
  }, [low]);

  const color = isUnlimited
    ? '#4caf50'
    : low
      ? (dim ? '#ef5350' : '#ff6b6b')
      : '#f9a825';
  const bg = isUnlimited
    ? 'rgba(76,175,80,0.15)'
    : low
      ? (dim ? 'rgba(229,57,53,0.22)' : 'rgba(229,57,53,0.07)')
      : 'rgba(249,168,37,0.15)';
  const border = isUnlimited
    ? 'rgba(76,175,80,0.5)'
    : low
      ? 'rgba(229,57,53,0.55)'
      : 'rgba(249,168,37,0.4)';

  return (
    <Link
      to="/credits"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        padding: '6px 14px',
        borderRadius: '20px',
        color,
        fontSize: '0.85rem',
        fontWeight: '600',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background 0.35s, color 0.35s',
        whiteSpace: 'nowrap',
      }}
    >
      {loading ? '...' : isUnlimited ? '✦ Illimité' : `✦ ${balance} crédits`}
    </Link>
  );
}
