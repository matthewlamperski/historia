import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  BlogPostInputSchema,
  type BlogPost,
  type BlogPostStatus,
} from '@historia/shared';

const COLLECTION = 'blogPosts';

export type BlogPostInput = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  heroImageUrl?: string;
  authorName: string;
  status: BlogPostStatus;
};

export async function listAllPosts(): Promise<BlogPost[]> {
  const q = query(collection(db, COLLECTION), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BlogPost, 'id'>) }));
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<BlogPost, 'id'>) };
}

export async function createPost(input: BlogPostInput): Promise<string> {
  const parsed = BlogPostInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  await assertSlugFree(input.slug);
  const data = {
    ...parsed.data,
    publishedAt: parsed.data.status === 'published' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION), data);
  return ref.id;
}

export async function updatePost(id: string, input: BlogPostInput): Promise<void> {
  const parsed = BlogPostInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
  }
  await assertSlugFree(input.slug, id);

  // Preserve original publishedAt when updating an already-published post;
  // set it now if transitioning draft→published.
  const ref = doc(db, COLLECTION, id);
  const current = await getDoc(ref);
  const currentData = current.exists() ? (current.data() as BlogPost) : null;

  const update: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: serverTimestamp(),
  };

  if (parsed.data.status === 'published') {
    if (!currentData?.publishedAt) {
      update.publishedAt = serverTimestamp();
    }
  } else {
    update.publishedAt = null;
  }

  await updateDoc(ref, update);
}

export async function deletePost(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

async function assertSlugFree(slug: string, ignoreId?: string) {
  const q = query(collection(db, COLLECTION), where('slug', '==', slug));
  const snap = await getDocs(q);
  const conflict = snap.docs.find((d) => d.id !== ignoreId);
  if (conflict) {
    throw new Error(`Slug "${slug}" is already in use.`);
  }
}

export function formatDate(t: Timestamp | undefined | null): string {
  if (!t) return '—';
  return t.toDate().toLocaleString();
}
