import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { BlogPost } from '@historia/shared';

const BLOG_COLLECTION = 'blogPosts';

export async function listPublishedPosts(): Promise<BlogPost[]> {
  // Sort client-side by publishedAt desc to avoid needing a composite
  // Firestore index. Fine while the post count stays small.
  const q = query(
    collection(db, BLOG_COLLECTION),
    where('status', '==', 'published'),
    limit(100)
  );
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<BlogPost, 'id'>),
  }));
  posts.sort((a, b) => {
    const aMs = a.publishedAt?.toMillis?.() ?? 0;
    const bMs = b.publishedAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const q = query(
    collection(db, BLOG_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<BlogPost, 'id'>) };
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const ref = doc(db, BLOG_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<BlogPost, 'id'>) };
}
