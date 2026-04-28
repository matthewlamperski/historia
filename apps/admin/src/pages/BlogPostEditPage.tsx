import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import {
  createPost,
  getPost,
  updatePost,
  type BlogPostInput,
} from '../services/blogService';
import { uploadBlogHero } from '../services/storageService';
import { useAuth } from '../hooks/useAuth';

const EMPTY: BlogPostInput = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  heroImageUrl: '',
  authorName: 'The Historia team',
  status: 'draft',
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function BlogPostEditPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !postId;

  const [draft, setDraft] = useState<BlogPostInput>({ ...EMPTY });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isNew) {
      // Default authorName to admin's email if no display name available.
      if (user?.displayName) {
        setDraft((d) => ({ ...d, authorName: user.displayName as string }));
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const post = await getPost(postId!);
        if (cancelled) return;
        if (!post) {
          setToast({ kind: 'error', message: 'Post not found.' });
          return;
        }
        setDraft({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          heroImageUrl: post.heroImageUrl ?? '',
          authorName: post.authorName,
          status: post.status,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, isNew, user]);

  function setField<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onTitleChange(v: string) {
    setField('title', v);
    if (autoSlug) setField('slug', slugify(v));
  }

  async function onUploadHero(file: File) {
    setUploading(true);
    try {
      const slug = draft.slug || slugify(draft.title) || 'post';
      const { url } = await uploadBlogHero(slug, file);
      setField('heroImageUrl', url);
      setToast({ kind: 'success', message: 'Hero image uploaded.' });
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  }

  async function save(nextStatus?: BlogPostInput['status']) {
    setSaving(true);
    try {
      const payload: BlogPostInput = {
        ...draft,
        status: nextStatus ?? draft.status,
        heroImageUrl: draft.heroImageUrl?.trim() || undefined,
      };
      if (isNew) {
        const id = await createPost(payload);
        setToast({ kind: 'success', message: 'Created.' });
        setTimeout(() => navigate(`/blog/${id}`), 600);
      } else {
        await updatePost(postId!, payload);
        setDraft(payload);
        setToast({ kind: 'success', message: 'Saved.' });
      }
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title={isNew ? 'New post' : draft.title || 'Untitled'}
        backHref="/blog"
        backLabel="Back to posts"
        subtitle={`Status: ${draft.status}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className="btn-secondary-admin disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={saving}
              className="btn-primary-admin disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Publish'}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Title & slug">
            <Field label="Title">
              <input
                value={draft.title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="input-admin"
                placeholder="The Story Behind Explore Historia"
              />
            </Field>
            <Field
              label="Slug"
              help="URL slug, kebab-case. Auto-derived from the title until you edit it manually."
            >
              <input
                value={draft.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setField('slug', slugify(e.target.value));
                }}
                className="input-admin font-mono"
                placeholder="story-behind-historia"
              />
            </Field>
            <Field label="Author display name">
              <input
                value={draft.authorName}
                onChange={(e) => setField('authorName', e.target.value)}
                className="input-admin"
              />
            </Field>
          </Card>

          <Card title="Excerpt" subtitle="Shown on the blog index card. ≤ 280 chars.">
            <textarea
              value={draft.excerpt}
              onChange={(e) => setField('excerpt', e.target.value.slice(0, 280))}
              rows={3}
              className="input-admin"
              placeholder="A short hook. Make it stand on its own."
            />
            <p className="mt-1 text-xs text-gray-600">
              {draft.excerpt.length}/280
            </p>
          </Card>

          <Card
            title="Body (markdown)"
            subtitle="Headings, lists, blockquotes, links, and images all work. Paste from Google Docs is fine."
            actions={
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="btn-secondary-admin text-xs"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            }
          >
            {showPreview ? (
              <article className="prose-historia">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {draft.body || '*Nothing to preview yet.*'}
                </ReactMarkdown>
              </article>
            ) : (
              <textarea
                value={draft.body}
                onChange={(e) => setField('body', e.target.value)}
                rows={28}
                className="input-admin font-mono text-sm"
                placeholder="# Hello, Historia"
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Hero image" subtitle="Optional. Used at the top of the post page.">
            <div className="flex flex-col gap-3">
              {draft.heroImageUrl ? (
                <img
                  src={draft.heroImageUrl}
                  alt=""
                  className="aspect-video w-full rounded-xl object-cover"
                />
              ) : (
                <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-primary-200 bg-primary-50 text-sm text-gray-500">
                  No hero
                </div>
              )}
              <label className="btn-secondary-admin cursor-pointer">
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadHero(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <input
                value={draft.heroImageUrl ?? ''}
                onChange={(e) => setField('heroImageUrl', e.target.value)}
                className="input-admin font-mono text-xs"
                placeholder="or paste a URL"
              />
            </div>
          </Card>

          <Card title="Status">
            <div className="flex gap-2">
              {(['draft', 'published'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    draft.status === s
                      ? 'bg-primary-600 text-white'
                      : 'border border-primary-200 bg-white text-primary-800 hover:bg-primary-50'
                  }`}
                  onClick={() => setField('status', s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Only published posts appear on the marketing site.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold text-primary-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-primary-900">{label}</span>
      <div className="mt-1">{children}</div>
      {help && <p className="mt-1 text-xs text-gray-600">{help}</p>}
    </label>
  );
}
