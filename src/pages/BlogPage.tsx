import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Reveal } from '../components/Reveal';

const SEP = '——— ✦ ———';

const CATEGORIES = [
  'Tous',
  'Poids mystique',
  'Carrés magiques',
  'Géomancie',
  'Rêves',
  'Plantes mystiques',
  'Talismans',
  'Formation',
  'Spiritualité',
];

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  views: number;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('Tous');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    supabase
      .from('blog_articles')
      .select('id, title, slug, category, excerpt, views, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setArticles((data as Article[]) ?? []);
        setLoading(false);
      })
      .then(undefined, () => setLoading(false));
  }, []);

  const filtered = articles.filter(a => {
    const matchCat = cat === 'Tous' || a.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* En-tête */}
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '700', color: '#f9a825', marginBottom: '8px' }}>
            Blog ✦ Sagesse Spirituelle
          </h1>
          <p style={{ color: '#b0b8d4', fontSize: '1rem' }}>
            Articles sur les sciences ésotériques islamiques — Abjad, géomancie, rêves et plus
          </p>
          <div style={{ color: '#b0b8d4', marginTop: '16px', letterSpacing: '3px' }}>{SEP}</div>
        </div>
      </Reveal>

      {/* Recherche */}
      <Reveal delay={60}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un article..."
          style={{
            width: '100%',
            background: '#111a55',
            border: '1px solid rgba(249,168,37,0.25)',
            color: 'white',
            padding: '12px 16px',
            fontSize: '0.95rem',
            borderRadius: '6px',
            marginBottom: '20px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </Reveal>

      {/* Filtres catégories */}
      <Reveal delay={100}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '40px' }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                background: cat === c ? '#f9a825' : 'rgba(249,168,37,0.08)',
                border: `1px solid ${cat === c ? '#f9a825' : 'rgba(249,168,37,0.25)'}`,
                color: cat === c ? '#1a237e' : '#b0b8d4',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: cat === c ? '700' : '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '80px' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <Reveal>
          <div style={{
            background: '#111a55',
            border: '1px solid rgba(249,168,37,0.15)',
            borderRadius: '8px',
            padding: '60px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px', color: '#f9a825' }}>✦</div>
            <p style={{ color: '#b0b8d4', fontSize: '0.95rem' }}>
              {articles.length === 0
                ? 'Aucun article publié pour le moment. Revenez bientôt.'
                : 'Aucun article dans cette catégorie.'}
            </p>
          </div>
        </Reveal>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map((article, i) => (
            <Reveal key={article.id} delay={i * 50}>
              <Link to={`/blog/${article.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.18)',
                  borderRadius: '10px',
                  padding: '24px',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'border-color 0.25s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{
                      background: 'rgba(249,168,37,0.1)',
                      border: '1px solid rgba(249,168,37,0.25)',
                      color: '#f9a825',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.73rem',
                      fontWeight: '600',
                    }}>
                      {article.category}
                    </span>
                    <span style={{ color: '#b0b8d4', fontSize: '0.75rem' }}>
                      ◎ {article.views ?? 0} vues
                    </span>
                  </div>
                  <h2 style={{ color: 'white', fontWeight: '700', fontSize: '1rem', lineHeight: '1.45', margin: 0 }}>
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p style={{ color: '#b0b8d4', fontSize: '0.88rem', lineHeight: '1.6', margin: 0, flex: 1 }}>
                      {article.excerpt.length > 130 ? article.excerpt.substring(0, 130) + '...' : article.excerpt}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ color: '#b0b8d4', fontSize: '0.75rem' }}>{fmtDate(article.created_at)}</span>
                    <span style={{ color: '#f9a825', fontSize: '0.82rem', fontWeight: '600' }}>Lire →</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
