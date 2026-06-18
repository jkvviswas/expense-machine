import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Quote } from 'lucide-react';
import {
  fetchApprovedReviews,
  reviewsConfigured,
  type PublicReview,
} from '../../backend/reviewsBridge';

/**
 * A quiet spotlight of the latest approved community review, shown on the
 * dashboard. Rotates through recent reviews every few seconds. Purely
 * additive / presentational — reads approved reviews from the backend and
 * renders nothing when there are none (or no backend configured).
 */
export function ReviewSpotlight() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!reviewsConfigured()) return;
    let active = true;
    fetchApprovedReviews(8).then((rows) => {
      if (active) setReviews(rows);
    });
    return () => { active = false; };
  }, []);

  // Rotate to the next review every 7s.
  useEffect(() => {
    if (reviews.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % reviews.length), 7000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (!reviewsConfigured() || reviews.length === 0) return null;
  const r = reviews[idx];

  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-brass">
          From the community
        </span>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint transition-colors hover:text-brass"
        >
          Share yours →
        </button>
      </div>
      <div className="flex gap-4">
        <Quote size={22} className="mt-0.5 flex-none text-brass-deep" />
        <div>
          <div className="mb-2 flex gap-0.5 text-brass">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                fill={i < r.rating ? 'currentColor' : 'none'}
                strokeWidth={i < r.rating ? 0 : 1.5}
                className={i < r.rating ? '' : 'text-hairline-strong'}
              />
            ))}
          </div>
          <blockquote className="text-[0.92rem] leading-relaxed text-soft">“{r.comment}”</blockquote>
          <figcaption className="mt-3 text-[0.82rem] text-bright">
            {r.name}
            {r.role ? <span className="text-faint"> · {r.role}</span> : null}
          </figcaption>
        </div>
      </div>
      {reviews.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {reviews.map((rev, i) => (
            <button
              key={rev.id}
              type="button"
              aria-label={`Review ${i + 1}`}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                background: i === idx ? 'var(--em-brass)' : 'var(--em-hairline-strong)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
