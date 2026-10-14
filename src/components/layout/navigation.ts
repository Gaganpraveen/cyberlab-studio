import {
  BookMarked,
  FlaskConical,
  Home,
  Info,
  Library,
  type LucideIcon,
  Map,
  Settings,
  Target,
  TrendingUp,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /learn/web-01 highlights Learn). */
  end?: boolean;
  description: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true, description: 'Continue where you left off' },
  { to: '/learn', label: 'Learn', icon: Map, description: 'The topic map: 16 domains, 128 topics' },
  {
    to: '/labs',
    label: 'Labs',
    icon: FlaskConical,
    description: 'Hands-on attack and defense labs',
  },
  {
    to: '/challenges',
    label: 'Challenges',
    icon: Target,
    description: 'Graded challenges with hints',
  },
  {
    to: '/library',
    label: 'Library',
    icon: Library,
    description: 'Textbooks, standards, and open references',
  },
  {
    to: '/glossary',
    label: 'Glossary',
    icon: BookMarked,
    description: 'Every term, linked and defined',
  },
  {
    to: '/progress',
    label: 'Progress',
    icon: TrendingUp,
    description: 'Your progress, saved in this browser',
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Theme, motion, text size, presenter mode',
  },
  {
    to: '/about',
    label: 'About and ethics',
    icon: Info,
    description: 'Responsible use, credits, and licenses',
  },
];
