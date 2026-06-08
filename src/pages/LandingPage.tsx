import { Link } from 'react-router-dom';
import { PACKS, WHATSAPP_NUMBER } from '../utils/mystique';
import { Reveal } from '../components/Reveal';
import logo from '../assets/logo.svg';

const SEP = '——— ✦ ———';

const GRID_TOOLS = [
  { icon: '◈', name: 'Poids Mystique',   desc: 'Calcul Abjad fondamental',     path: '/poids-mystique', free: true },
  { icon: '◇', name: 'Carrés Magiques',  desc: 'Talismans numériques sacrés',  path: '/carres-magiques' },
  { icon: '✦', name: 'Destin & Vocation', desc: 'Votre mission sur terre',     path: '/destin' },
  { icon: '⊕', name: 'Géomancie',         desc: 'Ilm al-Raml islamique',        path: '/geomancie' },
  { icon: '◎', name: 'Rêves',             desc: 'Selon Ibn Sirin',              path: '/reves' },
  { icon: '⊞', name: 'Plantes Mystiques', desc: 'Rituels et remèdes spirituels', path: '/plantes' },
  { icon: '⊗', name: 'Compatibilité',     desc: 'Harmonie spirituelle des âmes', path: '/compatibilite' },
  { icon: '◆', name: 'Attraper',          desc: 'Talisman personnalisé',         path: '/attraper' },
  { icon: '⊘', name: 'Secrets Mystiques', desc: 'Connaissances ésotériques',     path: '/secrets' },
];

const STEPS = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en quelques secondes. Le poids mystique est accessible immédiatement sans crédit.' },
  { num: '02', title: 'Choisissez votre outil', desc: 'Parcourez 12 outils de sciences ésotériques islamiques. Chaque analyse est personnalisée selon votre profil.' },
  { num: '03', title: 'Recevez votre analyse', desc: 'En quelques secondes, une analyse mystique complète et personnalisée, fondée sur les sciences islamiques.' },
];

const TESTIMONIALS = [
  {
    quote: "L'analyse de mon poids mystique m'a ouvert les yeux sur ma vocation spirituelle. Un outil remarquable, fondé sur une tradition millénaire.",
    author: 'Ibrahim D.',
    city: 'Dakar, Sénégal',
  },
  {
    quote: "La compatibilité a révélé des aspects de ma relation que je n'aurais jamais compris seul. Précis et ancré dans les sciences islamiques.",
    author: 'Fatou K.',
    city: 'Abidjan, Côte d\'Ivoire',
  },
  {
    quote: "La formation complète est excellente. J'ai progressé du niveau débutant à pratiquant avancé en quelques semaines grâce aux 9 modules structurés.",
    author: 'Moussa B.',
    city: 'Bamako, Mali',
  },
];

function waUrl(pack: typeof PACKS[0]): string {
  const msg = pack.credits === null
    ? `Bonjour, je souhaite souscrire au pack ${pack.name} (Illimité 1 mois) — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`
    : `Bonjour, je souhaite acheter le pack ${pack.name} — ${pack.credits} crédits — ${pack.price.toLocaleString('fr-FR')} FCFA sur Secret Divin.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function LandingPage() {
  return (
    <div style={{ color: 'white' }}>

      {/* ━━━ HERO ━━━ */}
      <section style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(249,168,37,0.07) 0%, transparent 65%)',
        position: 'relative',
      }}>
        <Reveal>
          <img
            src={logo}
            alt="Secret Divin"
            style={{
              width: 'clamp(72px, 12vw, 100px)',
              height: 'clamp(72px, 12vw, 100px)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 18px rgba(249,168,37,0.45))',
              marginBottom: '20px',
            }}
          />
        </Reveal>

        <Reveal>
          <div style={{
            fontFamily: 'Noto Naskh Arabic, serif',
            fontSize: 'clamp(1.8rem, 5vw, 3rem)',
            color: '#f9a825',
            direction: 'rtl',
            lineHeight: '1.8',
            marginBottom: '12px',
          }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div style={{ color: '#b0b8d4', letterSpacing: '3px', marginBottom: '24px', fontSize: '0.85rem' }}>{SEP}</div>
        </Reveal>

        <Reveal delay={140}>
          <h1 style={{
            fontSize: 'clamp(2.4rem, 7vw, 4.2rem)',
            fontWeight: '700',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #f9a825 30%, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.1',
          }}>
            Secret Divin
          </h1>
        </Reveal>

        <Reveal delay={190}>
          <p style={{ color: '#b0b8d4', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', maxWidth: '580px', lineHeight: '1.7', marginBottom: '8px' }}>
            La plateforme de sagesse spirituelle islamique — sciences ésotériques, calculs mystiques et guidance spirituelle personnalisée.
          </p>
        </Reveal>

        <Reveal delay={230}>
          <p style={{ fontFamily: 'Noto Naskh Arabic, serif', color: '#f9a825', fontSize: '1.1rem', direction: 'rtl', marginBottom: '36px' }}>
            الحكمة الروحية والعلوم الباطنية الإسلامية
          </p>
        </Reveal>

        <Reveal delay={270}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/auth" style={{
              background: '#f9a825',
              color: '#1a237e',
              padding: '15px 36px',
              fontWeight: '700',
              textDecoration: 'none',
              fontSize: '1.05rem',
              borderRadius: '4px',
            }}>
              Commencer gratuitement
            </Link>
            <Link to="/fonctionnalites" style={{
              background: 'transparent',
              border: '1px solid rgba(249,168,37,0.5)',
              color: '#f9a825',
              padding: '15px 36px',
              textDecoration: 'none',
              fontSize: '1.05rem',
              borderRadius: '4px',
            }}>
              Voir les outils
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ━━━ STATS ━━━ */}
      <section style={{ background: '#111a55', borderTop: '1px solid rgba(249,168,37,0.1)', borderBottom: '1px solid rgba(249,168,37,0.1)', padding: '40px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', textAlign: 'center' }}>
          {[
            { val: '12+',   label: 'Outils mystiques' },
            { val: '5 000+', label: 'Analyses générées' },
            { val: '24h/24', label: 'Disponibilité' },
          ].map(s => (
            <Reveal key={s.val}>
              <div>
                <div style={{ fontSize: '2.4rem', fontWeight: '700', color: '#f9a825', lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: '#b0b8d4', marginTop: '6px', fontSize: '0.9rem' }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ━━━ OUTILS (9 cards) ━━━ */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 20px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
              12 outils de sciences ésotériques islamiques
            </h2>
            <p style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>
              Chaque analyse est unique, personnalisée selon votre profil mystique
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {GRID_TOOLS.map((tool, i) => (
            <Reveal key={tool.path} delay={i * 50}>
              <Link to={tool.path} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.2)',
                  borderRadius: '10px',
                  padding: '24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  transition: 'border-color 0.25s, transform 0.25s',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(249,168,37,0.1)',
                    border: '1px solid rgba(249,168,37,0.25)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    color: '#f9a825',
                    flexShrink: 0,
                  }}>
                    {tool.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', fontSize: '0.95rem', marginBottom: '4px' }}>{tool.name}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>{tool.desc}</div>
                  </div>
                  {tool.free && (
                    <span style={{
                      background: 'rgba(76,175,80,0.15)',
                      border: '1px solid rgba(76,175,80,0.4)',
                      color: '#4caf50',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}>
                      GRATUIT
                    </span>
                  )}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <Link to="/fonctionnalites" style={{
              color: '#f9a825',
              textDecoration: 'none',
              fontSize: '0.9rem',
              borderBottom: '1px solid rgba(249,168,37,0.4)',
              paddingBottom: '2px',
            }}>
              Voir toutes les fonctionnalités en détail →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ━━━ COMMENT ÇA MARCHE ━━━ */}
      <section style={{ background: 'rgba(17,26,85,0.4)', borderTop: '1px solid rgba(249,168,37,0.08)', borderBottom: '1px solid rgba(249,168,37,0.08)', padding: '80px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
                Comment ça marche ?
              </h2>
              <p style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>Simple, rapide et disponible depuis n'importe où</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 80}>
                <div style={{ background: '#111a55', border: '1px solid rgba(249,168,37,0.2)', borderRadius: '10px', padding: '28px', textAlign: 'center' }}>
                  <div style={{
                    width: '52px', height: '52px',
                    background: 'linear-gradient(135deg, #f9a825, #e65100)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '1rem', fontWeight: '700', color: 'white',
                  }}>
                    {s.num}
                  </div>
                  <h3 style={{ color: '#f9a825', fontWeight: '700', marginBottom: '10px', fontSize: '1rem' }}>{s.title}</h3>
                  <p style={{ color: '#b0b8d4', fontSize: '0.88rem', lineHeight: '1.65' }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ TARIFS APERÇU ━━━ */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 20px' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
              Tarifs simples et transparents
            </h2>
            <p style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>
              Crédits permanents · Pas d'abonnement caché · Remboursement si erreur
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {PACKS.map((pack, i) => (
            <Reveal key={pack.id} delay={i * 60}>
              <div style={{
                background: '#111a55',
                border: `2px solid ${pack.popular ? '#f9a825' : 'rgba(249,168,37,0.18)'}`,
                borderRadius: '10px',
                padding: '22px',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {pack.popular && (
                  <div style={{
                    position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                    background: '#f9a825', color: '#1a237e', fontSize: '0.65rem', fontWeight: '700',
                    padding: '3px 12px', letterSpacing: '1.5px', whiteSpace: 'nowrap',
                  }}>
                    POPULAIRE
                  </div>
                )}
                <div style={{ color: '#f9a825', fontWeight: '700' }}>{pack.name}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'white', lineHeight: 1 }}>
                  {pack.price.toLocaleString('fr-FR')}
                  <span style={{ fontSize: '0.75rem', color: '#b0b8d4', fontWeight: '400' }}> FCFA</span>
                </div>
                <div style={{ color: '#b0b8d4', fontSize: '0.82rem' }}>
                  {pack.credits === null ? 'Accès illimité' : `${pack.credits} crédits`}
                </div>
                <a
                  href={waUrl(pack)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    border: '1px solid rgba(37,211,102,0.4)',
                    color: '#25d366',
                    padding: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    borderRadius: '4px',
                    marginTop: 'auto',
                  }}
                >
                  Commander
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <Link to="/credits" style={{ color: '#f9a825', textDecoration: 'none', fontSize: '0.9rem', borderBottom: '1px solid rgba(249,168,37,0.4)', paddingBottom: '2px' }}>
              Voir le détail des tarifs et coûts par outil →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ━━━ TÉMOIGNAGES ━━━ */}
      <section style={{ background: 'rgba(17,26,85,0.4)', borderTop: '1px solid rgba(249,168,37,0.08)', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
                Ce qu'ils en disent
              </h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 80}>
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.2)',
                  borderRadius: '10px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <div style={{ color: '#f9a825', fontSize: '0.95rem', letterSpacing: '2px' }}>✦ ✦ ✦ ✦ ✦</div>
                  <p style={{ color: '#b0b8d4', fontSize: '0.92rem', lineHeight: '1.7', fontStyle: 'italic', flex: 1 }}>
                    « {t.quote} »
                  </p>
                  <div>
                    <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>{t.author}</div>
                    <div style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>{t.city}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ CTA FINAL ━━━ */}
      <section style={{ padding: '100px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(249,168,37,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <div style={{
              fontFamily: 'Noto Naskh Arabic, serif',
              fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
              color: '#f9a825',
              direction: 'rtl',
              lineHeight: '1.9',
              marginBottom: '16px',
            }}>
              وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۙ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p style={{ color: '#b0b8d4', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '8px' }}>
              « Quiconque craint Allah, Il lui trouvera une issue et le pourvoira de là où il ne s'y attend pas. »
            </p>
            <p style={{ color: '#b0b8d4', fontSize: '0.8rem', marginBottom: '36px' }}>— At-Talaq : 2-3</p>
          </Reveal>
          <Reveal delay={140}>
            <div style={{ color: '#b0b8d4', letterSpacing: '3px', marginBottom: '36px', fontSize: '0.85rem' }}>{SEP}</div>
          </Reveal>
          <Reveal delay={180}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '700', color: 'white', marginBottom: '12px' }}>
              Votre chemin spirituel commence ici
            </h2>
            <p style={{ color: '#b0b8d4', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '32px' }}>
              Rejoignez des milliers de personnes qui utilisent les sciences ésotériques islamiques pour comprendre leur destin et leur vocation.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/auth" style={{
                background: '#f9a825',
                color: '#1a237e',
                padding: '16px 40px',
                fontWeight: '700',
                textDecoration: 'none',
                fontSize: '1.05rem',
                borderRadius: '4px',
              }}>
                Commencer maintenant
              </Link>
              <Link to="/contact" style={{
                background: 'transparent',
                border: '1px solid rgba(249,168,37,0.4)',
                color: '#f9a825',
                padding: '16px 40px',
                textDecoration: 'none',
                fontSize: '1.05rem',
                borderRadius: '4px',
              }}>
                Nous contacter
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
