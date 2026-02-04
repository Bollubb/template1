// src/common/navigation.tsx

export type BottomNavigationItem = {
  title: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
};

const DOCS_URL = 'https://github.com/Bollubb/template1';
const GITHUB_URL = 'https://github.com/Bollubb/template1';

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
