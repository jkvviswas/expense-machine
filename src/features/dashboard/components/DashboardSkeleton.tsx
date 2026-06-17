import { motion } from 'framer-motion';

/** Calm loading state. The focal ring outline stays, content shimmers in. */
export function DashboardSkeleton() {
  return (
    <div>
      {/* focal ring placeholder with halo */}
      <div className="relative flex flex-col items-center py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[640px] max-w-[110vw] -translate-x-1/2"
          style={{
            background: 'radial-gradient(ellipse at center, var(--em-glow-brass), transparent 60%)',
          }}
        />
        <div className="mb-5 h-3 w-28 rounded bg-elevated" />
        <div className="relative flex h-60 w-60 items-center justify-center rounded-full border border-hairline sm:h-72 sm:w-72">
          <motion.div
            className="h-9 w-40 rounded bg-elevated"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
        <div className="mt-8 flex gap-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-2.5 w-12 rounded bg-elevated/60" />
              <div className="h-3.5 w-20 rounded bg-elevated" />
            </div>
          ))}
        </div>
      </div>

      {/* context strip placeholder */}
      <div className="mb-8 mt-10 grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-surface px-5 py-4">
            <div className="mb-2 h-2.5 w-20 rounded bg-elevated/60" />
            <motion.div
              className="h-5 w-24 rounded bg-elevated"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* panels placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-panel border border-hairline bg-surface p-6">
            <div className="mb-5 h-4 w-32 rounded bg-elevated" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="mb-3 flex items-center justify-between">
                <div className="h-3 w-40 rounded bg-elevated/60" />
                <div className="h-3 w-16 rounded bg-elevated/60" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
