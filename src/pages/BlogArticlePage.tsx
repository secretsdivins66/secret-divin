import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Reveal } from '../components/Reveal';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  views: number;
  created_at: string;
}

interface NavArticle {
  title: string;
  slug: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function parseContent(content: string): React.ReactNode[] {
  const blocks = content.split(/\n\n+/).filter(b => b.trim());
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} style={{ color: '#f9a825', fontWeight: '700', fontSize: '1.3rem', margin: '28px 0 12px', paddingBottom: '8px', borderBottom: '1px solid rgba(249,168,37,0.2)' }}>
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={i} style={{ color: '#f9a825', fontWeight: '600', fontSize: '1.1rem', margin: '22px 0 10px' }}>
          {trimmed.slice(4)}
        </h3>
      );
    }
    return (
      <p key={i} style={{ color: '#b0b8d4', lineHeight: '1.85', fontSize: '0.95rem', margin: '0 0 14px' }}>
        {trimmed}
      </p>
    );
  });
}

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [prev, setPrev] = useState<NavArticle | null>(null);
  const [next, setNext] = useState<NavArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const viewIncremented = useRef(false);

  useEffect(() => {
    if (!slug) return;
    viewIncremented.current = false;
    setLoading(true);
    setArticle(null);
    setPrev(null);
    setNext(null);
    setNotFound(false);

    supabase
      .from('blog_articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        const art = data as Article;
        setArticle(art);
        setLoading(false);

        // Increment views once
        if (!viewIncremented.current) {
          viewIncremented.current = true;
          await supabase
            .from('blog_articles')
            .update({ views: (art.views ?? 0) + 1 })
            .eq('id', art.id)
            .catch(() => {});
        }

        // Fetch all slugs for prev/next navigation
        const { data: all } = await supabase
          .from('blog_articles')
          .select('title, slug, created_at')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (all) {
          const list = all as { title: string; slug: string; created_at: string }[];
          const idx = list.findIndex(a => a.slug === slug);
          if (idx > 0) setNext({ title: list[idx - 1].title, slug: list[idx - 1].slug });
          if (idx < list.length - 1) setPrev({ title: list[idx + 1].title, slug: list[idx + 1].slug });
        }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: '#b0b8d4', padding: '120px 20px' }}>
        Chargement de l'article...
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '2rem', color: '#f9a825', marginBottom: '16px' }}>✦</div>
        <h1 style={{ color: '#f9a825', marginBottom: '12px' }}>Article introuvable</h1>
        <p style={{ color: '#b0b8d4', marginBottom: '28px' }}>Cet article n'existe pas ou n'est plus publié.</p>
        <Link to="/blog" style={{ color: '#f9a825', fontWeight: '600', textDecoration: 'none', borderBottom: '1px solid rgba(249,168,37,0.4)', paddingBottom: '2px' }}>
          ← Retour au blog
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 20px', color: 'white' }}>

      {/* Retour */}
      <Reveal>
        <Link to="/blog" style={{ color: '#b0b8d4', textDecoration: 'none', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}>
          ← Blog
        </Link>
      </Reveal>

      {/* En-tête article */}
      <Reveal delay={60}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(249,168,37,0.1)',
              border: '1px solid rgba(249,168,37,0.3)',
              color: '#f9a825',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: '600',
            }}>
              {article.category}
            </span>
            <span style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>◎ {(article.views ?? 0) + 1} vues</span>
            <span style={{ color: '#b0b8d4', fontSize: '0.78rem' }}>{fmtDate(article.created_at)}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: '700', color: 'white', lineHeight: '1.3', marginBottom: '16px' }}>
            {article.title}
          </h1>
          {article.excerpt && (
            <p style={{ color: '#b0b8d4', fontSize: '1rem', lineHeight: '1.7', fontStyle: 'italic', borderLeft: '3px solid #f9a825', paddingLeft: '16px' }}>
              {article.excerpt}
            </p>
          )}
        </div>
      </Reveal>

      {/* Séparateur */}
      <Reveal delay={100}>
        <div style={{ color: '#b0b8d4', letterSpacing: '3px', textAlign: 'center', marginBottom: '40px', fontSize: '0.85rem' }}>
          ——— ✦ ———
        </div>
      </Reveal>

      {/* Contenu */}
      <Reveal delay={130}>
        <div style={{ marginBottom: '60px' }}>
          {parseContent(article.content || '')}
        </div>
      </Reveal>

      {/* Navigation précédent/suivant */}
      {(prev || next) && (
        <Reveal delay={160}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: prev && next ? '1fr 1fr' : '1fr',
            gap: '12px',
            borderTop: '1px solid rgba(249,168,37,0.15)',
            paddingTop: '32px',
            marginBottom: '40px',
          }}>
            {prev && (
              <Link to={`/blog/${prev.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.18)',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', marginBottom: '6px' }}>← Article précédent</div>
                  <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.88rem', lineHeight: '1.4' }}>
                    {prev.title.length > 60 ? prev.title.substring(0, 60) + '...' : prev.title}
                  </div>
                </div>
              </Link>
            )}
            {next && (
              <Link to={`/blog/${next.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: '#111a55',
                  border: '1px solid rgba(249,168,37,0.18)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'right',
                }}>
                  <div style={{ color: '#b0b8d4', fontSize: '0.75rem', marginBottom: '6px' }}>Article suivant →</div>
                  <div style={{ color: '#f9a825', fontWeight: '600', fontSize: '0.88rem', lineHeight: '1.4' }}>
                    {next.title.length > 60 ? next.title.substring(0, 60) + '...' : next.title}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </Reveal>
      )}

      {/* Retour blog */}
      <Reveal>
        <div style={{ textAlign: 'center' }}>
          <Link to="/blog" style={{
            display: 'inline-block',
            background: 'transparent',
            border: '1px solid rgba(249,168,37,0.4)',
            color: '#f9a825',
            padding: '10px 24px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.88rem',
            borderRadius: '4px',
          }}>
            ← Tous les articles
          </Link>
        </div>
      </Reveal>

    </div>
  );
}
