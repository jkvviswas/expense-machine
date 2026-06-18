import { getSupabase } from './client';
import { isBackendConfigured } from './config';

/**
 * ============================================================================
 *  REVIEWS BRIDGE
 * ============================================================================
 *  Submit a review (requires sign-in) and fetch the publicly approved reviews
 *  for the landing page. Reviews start unapproved; you approve them in Supabase
 *  (Table Editor → reviews → set `approved` = true). Requires the reviews table
 *  from db/reviews.sql.
 */

export interface PublicReview {
  id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  createdAt: string;
}

type Submit =
  | { configured: false }
  | { configured: true; ok: true }
  | { configured: true; ok: false; message: string };

export function reviewsConfigured(): boolean {
  return isBackendConfigured();
}

/** Fetch up to `limit` approved reviews, newest first. Empty array if none/unconfigured. */
export async function fetchApprovedReviews(limit = 12): Promise<PublicReview[]> {
  if (!isBackendConfigured()) return [];
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id,name,role,rating,comment,created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? 'Anonymous',
    role: (r.role as string) ?? '',
    rating: (r.rating as number) ?? 5,
    comment: (r.comment as string) ?? '',
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  }));
}

/** Submit a review for the signed-in user. Starts unapproved (awaits moderation). */
export async function submitReview(input: {
  name: string;
  role?: string;
  rating: number;
  comment: string;
}): Promise<Submit> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { configured: true, ok: false, message: 'Please sign in to leave a review.' };
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const { error } = await supabase.from('reviews').insert({
    user_id: uid,
    name: input.name.trim().slice(0, 80) || 'Anonymous',
    role: (input.role ?? '').trim().slice(0, 80),
    rating,
    comment: input.comment.trim().slice(0, 600),
  });
  if (error) return { configured: true, ok: false, message: error.message };
  return { configured: true, ok: true };
}
