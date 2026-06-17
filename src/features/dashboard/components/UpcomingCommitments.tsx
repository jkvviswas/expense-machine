import { Money } from '../../import/components/Money';
import { CategoryDot } from '../../import/components/CategorySelect';
import { formatMoneyFull } from '../../import/format';
import type { Obligation } from '../derive';

export function UpcomingCommitments({
  obligations,
  total,
}: {
  obligations: Obligation[];
  total: number;
}) {
  return (
    <div className="em-lift rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-[1.15rem] text-bright">Upcoming commitments</h3>
        <span className="font-mono text-[0.82rem] text-watch">
          {formatMoneyFull(total)}
        </span>
      </div>
      <div className="flex flex-col">
        {obligations.map((o, i) => (
          <div
            key={o.id}
            className={[
              'flex items-center justify-between py-2.5',
              i < obligations.length - 1 ? 'border-b border-hairline' : '',
            ].join(' ')}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[0.88rem] text-bright">
                <CategoryDot category={o.category} />
                <span className="truncate">{o.label}</span>
              </div>
              <div className="ml-4 flex items-center gap-2 text-[0.72rem] text-faint">
                <span className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider">
                  {o.cadence}
                </span>
                {o.dueLabel}
              </div>
            </div>
            <Money amount={-o.amount} className="text-[0.86rem]" />
          </div>
        ))}
      </div>
    </div>
  );
}
