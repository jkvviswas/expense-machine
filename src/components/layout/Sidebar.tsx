import { NavLink, Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { primaryNav, footNav, type NavItem } from '../../app/navigation';
import { BrandMark } from '../primitives/BrandMark';
import { useShell } from '../../app/shell-context';
import { useTrash } from '../../features/transactions/store';

interface SidebarProps {
  /** When true, render in collapsed icon-rail mode (desktop only). */
  collapsed: boolean;
  /** Called when a link is chosen — used to close the mobile drawer. */
  onNavigate?: () => void;
}

function Row({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-control py-2.5 pr-3 text-[0.92rem] transition-colors duration-300 ease-lux',
          isActive
            ? 'border-l-2 border-brass bg-brass/[0.16] pl-[calc(0.75rem-2px)] font-semibold text-bright shadow-[inset_0_0_0_1px_var(--em-glow-brass)]'
            : 'pl-3 text-muted hover:bg-elevated/60 hover:text-soft',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.25 : 1.75}
            className={isActive ? 'text-brass-bright' : 'text-current'}
          />
          {!collapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && item.phase !== 'v1' && (
            <span className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider text-faint">
              soon
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const { toggleCollapsed } = useShell();
  const trashCount = useTrash().length;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Brand — doubles as a shortcut to the Dashboard (Stripe/Linear pattern) */}
      <div
        className={`flex h-[var(--em-header-h)] items-center border-b border-hairline ${
          collapsed ? 'justify-center px-2' : 'px-5'
        }`}
      >
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="Go to Dashboard"
          className="flex items-center rounded-control opacity-100 transition-opacity duration-300 ease-lux hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
        >
          <BrandMark glyphOnly={collapsed} size={collapsed ? 30 : 32} />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="flex flex-col gap-1">
          {primaryNav.map((item) => (
            <Row
              key={item.to}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {/* Foot */}
      <div className="border-t border-hairline px-3 py-4">
        <div className="flex flex-col gap-1">
          {footNav.map((item) => {
            const Icon = item.icon;
            const count = item.to === '/trash' ? trashCount : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  [
                    'relative flex items-center gap-3 rounded-control py-2.5 pr-3 text-[0.9rem] transition-colors duration-300 ease-lux',
                    isActive
                      ? 'border-l-2 border-brass bg-brass/[0.16] pl-[calc(0.75rem-2px)] font-semibold text-bright shadow-[inset_0_0_0_1px_var(--em-glow-brass)]'
                      : 'pl-3 text-muted hover:bg-elevated/60 hover:text-soft',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} className={isActive ? 'text-brass-bright' : 'text-current'} />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && count > 0 && (
                      <span className="rounded-full bg-brass/15 px-1.5 py-0.5 font-mono text-[0.6rem] text-brass">
                        {count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Collapse toggle — desktop only */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mt-1 hidden items-center gap-3 rounded-control px-3 py-2.5 text-[0.9rem] text-muted transition-colors duration-300 ease-lux hover:text-soft lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={1.75} />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
