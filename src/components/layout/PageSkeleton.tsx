import { PageStage, StageItem } from './PageStage';
import { Skeleton } from '../../features/motion/components';

/**
 * Generic loading skeleton shown while a lazy route chunk loads. Mirrors the
 * common page rhythm (title, metric row, content block) so the transition into
 * real content feels continuous rather than a flash of empty space.
 */
export function PageSkeleton() {
  return (
    <PageStage>
      <StageItem className="mb-7">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="h-9 w-64" />
      </StageItem>
      <StageItem className="mb-7">
        <div className="grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface px-5 py-4">
              <Skeleton className="mb-2 h-2.5 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </StageItem>
      <StageItem>
        <div className="rounded-panel border border-hairline bg-surface p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-hairline py-3.5 last:border-0">
              <div className="flex-1">
                <Skeleton className="mb-2 h-3.5 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </StageItem>
    </PageStage>
  );
}
