import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublishedPosts } from '../services/blogService';
import type { BlogPost } from '@historia/shared';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listPublishedPosts();
        if (!cancelled) setPosts(list);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load posts');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <section className="container-narrow py-20 text-center md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          Field notes
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold text-primary-900 md:text-6xl">
          The Historia Journal
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-700">
          Stories from the road. Why we built this. How to use it. The history
          behind the markers.
        </p>
      </section>

      <section className="container-wide pb-24">
        {error && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-error-200 bg-error-50 p-6 text-center text-error-800">
            <p className="font-semibold">Could not load posts</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {!error && posts === null && <PostListSkeleton />}

        {!error && posts !== null && posts.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-primary-200 bg-white p-12 text-center">
            <h2 className="font-serif text-2xl font-semibold text-primary-900">
              Posts are on the way.
            </h2>
            <p className="mt-3 text-gray-700">
              Our journal is being seeded right now. Come back soon, or follow
              along on the app.
            </p>
          </div>
        )}

        {!error && posts && posts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const date = post.publishedAt?.toDate?.();
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-md"
    >
      {post.heroImageUrl ? (
        <img
          src={post.heroImageUrl}
          alt=""
          className="aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100" />
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="text-xs uppercase tracking-wider text-primary-600">
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
        </div>
        <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-primary-900 group-hover:text-primary-700">
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-base text-gray-700">{post.excerpt}</p>
        <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary-700">
          Read story →
        </span>
      </div>
    </Link>
  );
}

function PostListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-primary-100 bg-white"
        >
          <div className="aspect-[16/10] animate-pulse bg-primary-100" />
          <div className="space-y-3 p-6">
            <div className="h-3 w-1/3 animate-pulse rounded bg-primary-100" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-primary-100" />
            <div className="h-4 w-full animate-pulse rounded bg-primary-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-primary-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
