import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPostBySlug } from '../services/blogService';
import type { BlogPost } from '@historia/shared';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const found = await getPostBySlug(slug);
        if (!cancelled) setPost(found);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load post');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <section className="container-narrow py-24 text-center">
        <p className="text-error-700">{error}</p>
      </section>
    );
  }

  if (post === undefined) {
    return (
      <section className="container-narrow py-24" aria-hidden="true">
        <div className="space-y-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-primary-100" />
          <div className="h-12 w-2/3 animate-pulse rounded bg-primary-100" />
          <div className="aspect-[16/8] w-full animate-pulse rounded-2xl bg-primary-100" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-primary-100" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-primary-100" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-primary-100" />
          </div>
        </div>
      </section>
    );
  }

  if (post === null) {
    return (
      <section className="container-narrow py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
          404
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold text-primary-900">
          We couldn't find that post.
        </h1>
        <p className="mt-4 text-gray-700">It may have been moved or unpublished.</p>
        <Link to="/blog" className="btn-secondary mt-8">
          Back to journal
        </Link>
      </section>
    );
  }

  const date = post.publishedAt?.toDate?.();

  return (
    <article className="container-narrow py-16 md:py-24">
      <Link to="/blog" className="text-sm font-semibold text-primary-700 hover:text-primary-900">
        ← Back to journal
      </Link>

      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          {post.authorName}
          {date && (
            <>
              {' · '}
              {date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </>
          )}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-primary-900 md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 max-w-2xl text-xl leading-relaxed text-gray-700">
          {post.excerpt}
        </p>
      </header>

      {post.heroImageUrl && (
        <img
          src={post.heroImageUrl}
          alt=""
          className="mt-10 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft-md"
        />
      )}

      <div className="prose-historia mt-12">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>

      <div className="mt-16 rounded-2xl border border-primary-100 bg-primary-50 p-8 text-center">
        <p className="font-serif text-2xl font-semibold text-primary-900">
          Like this? Try the app.
        </p>
        <p className="mt-2 text-gray-700">
          Discover landmarks near you and turn the next drive into a story.
        </p>
        <Link to="/download" className="btn-primary mt-5">
          Get Historia
        </Link>
      </div>
    </article>
  );
}
