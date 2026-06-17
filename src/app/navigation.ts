import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Upload,
  Wallet,
  FileText,
  LineChart,
  Users,
  Landmark,
  CreditCard,
  CalendarClock,
  Settings,
  Bell,
  LifeBuoy,
  Trash2,
} from 'lucide-react';

export interface NavItem {
  /** Route path. */
  to: string;
  /** Label shown in the sidebar and used for the header title. */
  label: string;
  /** Short subtitle shown under the header title. */
  subtitle: string;
  icon: LucideIcon;
  /** Phase the feature ships in — used to render a quiet "soon" hint. */
  phase: 'v1' | 'v2' | 'v3';
}

/**
 * Primary navigation — mirrors Dashboard Architecture V2.
 * Order is deliberate: Dashboard first (the Clarity Moment lives here),
 * then the money-handling rooms, then analysis, then business, then settings.
 */
export const primaryNav: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    subtitle: 'Your financial command center',
    icon: LayoutDashboard,
    phase: 'v1',
  },
  {
    to: '/transactions',
    label: 'Transactions',
    subtitle: 'Every movement of money',
    icon: ArrowLeftRight,
    phase: 'v1',
  },
  {
    to: '/import',
    label: 'Import',
    subtitle: 'Turn a statement into clarity',
    icon: Upload,
    phase: 'v1',
  },
  {
    to: '/budgets',
    label: 'Budgets',
    subtitle: 'Spending limits and pace',
    icon: Wallet,
    phase: 'v1',
  },
  {
    to: '/reports',
    label: 'Reports',
    subtitle: 'Summaries you can hand over',
    icon: FileText,
    phase: 'v1',
  },
  {
    to: '/analytics',
    label: 'Analytics',
    subtitle: 'Understand the shape of spending',
    icon: LineChart,
    phase: 'v1',
  },
  {
    to: '/clients',
    label: 'Clients',
    subtitle: 'The people you do business with',
    icon: Users,
    phase: 'v1',
  },
  {
    to: '/loans',
    label: 'Loans',
    subtitle: 'Loans, EMIs and balances',
    icon: Landmark,
    phase: 'v1',
  },
  {
    to: '/accounts',
    label: 'Accounts',
    subtitle: 'Your bank accounts and balances',
    icon: CreditCard,
    phase: 'v1',
  },
  {
    to: '/commitments',
    label: 'Commitments',
    subtitle: 'Upcoming rent, EMIs and bills',
    icon: CalendarClock,
    phase: 'v1',
  },
  {
    to: '/settings',
    label: 'Settings',
    subtitle: 'Preferences and account',
    icon: Settings,
    phase: 'v1',
  },
];

/** Secondary items pinned to the sidebar foot. */
export interface FootItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const footNav: FootItem[] = [
  { to: '/trash', label: 'Trash', icon: Trash2 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/help', label: 'Help', icon: LifeBuoy },
];

/** Look up the nav item that owns a pathname (for header title/subtitle). */
export function navItemForPath(pathname: string): NavItem | undefined {
  if (pathname === '/') return primaryNav[0];
  const primary = primaryNav.find(
    (item) => item.to !== '/' && pathname.startsWith(item.to),
  );
  if (primary) return primary;
  // Foot routes (Trash/Notifications/Help) — synthesize a title entry so the
  // header reads correctly even though they aren't in the primary rail.
  if (pathname.startsWith('/trash'))
    return { to: '/trash', label: 'Trash', subtitle: 'Recently deleted transactions', icon: Trash2, phase: 'v1' };
  return undefined;
}
