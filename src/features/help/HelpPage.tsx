import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  BookOpen,
  LifeBuoy,
  Mail,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import { helpArticles, faqs, type HelpArticle } from './content';

const CATEGORIES = ['All', 'Getting started', 'Importing', 'Budgets', 'Reports', 'Account'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function HelpPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const articles = useMemo(() => {
    return helpArticles.filter((a) => {
      if (category !== 'All' && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.some((p) => p.toLowerCase().includes(q)) ||
        a.keywords.some((k) => k.includes(q))
      );
    });
  }, [q, category]);

  const matchedFaqs = useMemo(() => {
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.keywords.some((k) => k.includes(q)),
    );
  }, [q]);

  const nothing = articles.length === 0 && matchedFaqs.length === 0;

  return (
    <PageStage>
      <StageItem className="mb-7 text-center">
        <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
          Help Center
        </p>
        <h2 className="font-serif text-[2.3rem] leading-tight text-bright">
          How can we help?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-[0.92rem] text-muted">
          Search guides and answers, or reach out — we’re glad to help you get
          the most from your command center.
        </p>
      </StageItem>

      {/* Search */}
      <StageItem className="mx-auto mb-8 max-w-2xl">
        <label className="relative flex items-center">
          <Search size={18} className="pointer-events-none absolute left-4 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles and FAQs…"
            className="h-12 w-full rounded-control border border-hairline bg-surface pl-12 pr-4 text-[0.92rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
          />
        </label>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  'rounded-full border px-3 py-1 text-[0.76rem] transition-colors duration-300 ease-lux',
                  active
                    ? 'border-brass-deep bg-brass-deep/25 text-brass'
                    : 'border-hairline text-muted hover:text-soft',
                ].join(' ')}
              >
                {c}
              </button>
            );
          })}
        </div>
      </StageItem>

      {nothing ? (
        <StageItem>
          <div className="flex min-h-[28vh] flex-col items-center justify-center text-center">
            <BookOpen size={26} className="mb-4 text-faint" strokeWidth={1.5} />
            <h3 className="font-serif text-[1.2rem] text-bright">No results for “{query}”</h3>
            <p className="mt-2 text-[0.86rem] text-muted">
              Try different words, or contact support below.
            </p>
          </div>
        </StageItem>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Articles */}
          <StageItem>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={15} className="text-brass" strokeWidth={1.75} />
              <h3 className="font-serif text-[1.15rem] text-bright">Guides</h3>
              <span className="font-mono text-[0.68rem] text-faint">{articles.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {articles.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  open={openArticle === a.id}
                  onToggle={() => setOpenArticle((id) => (id === a.id ? null : a.id))}
                />
              ))}
              {articles.length === 0 && (
                <p className="rounded-panel border border-hairline bg-surface p-5 text-[0.85rem] text-muted">
                  No guides in this category match your search.
                </p>
              )}
            </div>
          </StageItem>

          {/* FAQ + support */}
          <div className="flex flex-col gap-6">
            <StageItem>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare size={15} className="text-brass" strokeWidth={1.75} />
                <h3 className="font-serif text-[1.15rem] text-bright">FAQ</h3>
              </div>
              <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
                {matchedFaqs.map((f, i) => {
                  const open = openFaq === f.id;
                  return (
                    <div key={f.id} className={i > 0 ? 'border-t border-hairline' : ''}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq((id) => (id === f.id ? null : f.id))}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left"
                      >
                        <span className="flex-1 text-[0.88rem] text-bright">{f.question}</span>
                        <ChevronDown
                          size={15}
                          className={[
                            'flex-none text-faint transition-transform duration-300',
                            open ? 'rotate-180' : '',
                          ].join(' ')}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-4 text-[0.84rem] leading-relaxed text-muted">
                              {f.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {matchedFaqs.length === 0 && (
                  <p className="px-5 py-4 text-[0.85rem] text-muted">
                    No FAQs match your search.
                  </p>
                )}
              </div>
            </StageItem>

            <StageItem>
              <SupportCard />
            </StageItem>
          </div>
        </div>
      )}
    </PageStage>
  );
}

function ArticleCard({
  article,
  open,
  onToggle,
}: {
  article: HelpArticle;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-5 text-left">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">
              {article.category}
            </span>
          </div>
          <h4 className="text-[0.98rem] text-bright">{article.title}</h4>
          <p className="mt-1 text-[0.84rem] text-muted">{article.summary}</p>
        </div>
        <ChevronDown
          size={16}
          className={[
            'mt-1 flex-none text-faint transition-transform duration-300',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-hairline px-5 py-4">
              {article.body.map((p, i) => (
                <p key={i} className="text-[0.86rem] leading-relaxed text-soft">
                  {p}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SupportCard() {
  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <LifeBuoy size={16} strokeWidth={1.75} className="text-brass" />
        <h3 className="font-serif text-[1.15rem] text-bright">Still need help?</h3>
      </div>
      <p className="mb-5 text-[0.85rem] leading-relaxed text-muted">
        Reach out and a real person will get back to you. Include a screenshot if
        something looks off — it speeds things up.
      </p>
      <div className="flex flex-col gap-3">
        <a
          href="mailto:support@expensemachine.example"
          className="flex items-center gap-3 rounded-control border border-hairline bg-elevated px-4 py-3 transition-colors hover:border-brass-deep"
        >
          <Mail size={16} className="text-soft" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <div className="text-[0.86rem] text-bright">Email support</div>
            <div className="text-[0.74rem] text-faint">support@expensemachine.example</div>
          </div>
          <ArrowRight size={15} className="text-faint" />
        </a>
        <div className="flex items-center gap-3 rounded-control border border-hairline bg-elevated px-4 py-3">
          <MessageSquare size={16} className="text-soft" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <div className="text-[0.86rem] text-bright">Live chat</div>
            <div className="text-[0.74rem] text-faint">Weekdays, 9am–6pm IST</div>
          </div>
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-gain">online</span>
        </div>
      </div>
    </div>
  );
}
