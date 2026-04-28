import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import {
  deletePost,
  formatDate,
  listAllPosts,
} from '../services/blogService';
import type { BlogPost } from '@historia/shared';

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setPosts(await listAllPosts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const visible = posts.filter((p) => filter === 'all' || p.status === filter);

  async function onDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deletePost(post.id);
      await refresh();
      setToast({ kind: 'success', message: `Deleted "${post.title}".` });
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Delete failed',
      });
    }
  }

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title="Blog"
        subtitle="Posts published from here appear on historia.app/blog."
        actions={
          <Link to="/blog/new" className="btn-primary-admin">
            + New post
          </Link>
        }
      />

      <div className="mb-6 flex gap-2">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'border border-primary-200 bg-white text-primary-800 hover:bg-primary-50'
            }`}
          >
            {f === 'all' ? 'All' : f === 'published' ? 'Published' : 'Drafts'}
            <span className="ml-2 opacity-70">
              {f === 'all'
                ? posts.length
                : posts.filter((p) => p.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-white p-12 text-center">
          <p className="text-gray-700">
            {filter === 'all' ? 'No posts yet.' : `No ${filter} posts.`}
          </p>
          <Link to="/blog/new" className="btn-primary-admin mt-4">
            Write the first one
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-primary-100 text-sm">
            <thead className="bg-primary-50 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {visible.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-primary-900">{post.title}</p>
                    <p className="line-clamp-1 text-xs text-gray-500">{post.excerpt}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        post.status === 'published'
                          ? 'bg-success-100 text-success-800'
                          : 'bg-warning-100 text-warning-800'
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {post.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatDate(post.publishedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {formatDate(post.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/blog/${post.id}`}
                      className="text-primary-700 hover:text-primary-900"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(post)}
                      className="ml-4 text-error-700 hover:text-error-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
