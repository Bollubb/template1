// src/common/navigation.tsx

// Evita alias non configurati in build: usa path relativo affidabile
import { DOCS_URL, GITHUB_URL } from '../constants';

export type BottomNavigationItem = {
  title: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
};

const bottomNavigation: BottomNavigationItem[] = [
  {
    title: 'Docs',
    href: DOCS_URL,
    external: true,
  },
  {
    title: 'GitHub',
    href: GITHUB_URL,
    external: true,
  },
];

export default bottomNavigation;
