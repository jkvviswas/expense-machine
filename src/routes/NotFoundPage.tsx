import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { PageStage, StageItem } from '../components/layout/PageStage';

export function NotFoundPage() {
  return (
    <PageStage>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <StageItem>
          <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
            <div
              className="absolute inset-0 rounded-focal"
              style={{
                boxShadow: 'inset 0 0 40px var(--em-glow-brass)',
                border: '1px solid var(--em-brass-deep)',
              }}
            />
            <Compass size={30} strokeWidth={1.5} className="text-brass" />
          </div>
        </StageItem>
        <StageItem>
          <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-brass">
            Off the map
          </p>
        </StageItem>
        <StageItem>
          <h2 className="mb-3 font-serif text-4xl text-bright">
            Nothing lives here
          </h2>
        </StageItem>
        <StageItem>
          <p className="mb-7 max-w-sm text-soft">
            This route doesn&rsquo;t exist yet. Let&rsquo;s get you back to your
            command center.
          </p>
        </StageItem>
        <StageItem>
          <Link
            to="/"
            className="rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
          >
            Back to dashboard
          </Link>
        </StageItem>
      </div>
    </PageStage>
  );
}
