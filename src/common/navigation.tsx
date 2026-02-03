import { DOCS_URL, GITHUB_URL } from '@constants/index';

const bottomNavigation: cat.BottomNavigation = [
  {
    id: 1,
    label: 'Home',
    href: '/',
    icon: <span style={{ fontSize: 20 }}>🏠</span>,
  },
  {
    id: 2,
    label: 'Facts',
    href: '/facts',
    icon: <span style={{ fontSize: 20 }}>📚</span>,
  },
];

const navBar: cat.Navbar = [
  { id: 1, label: 'Docs', href: DOCS_URL, external: true },
  { id: 2, label: 'Github', href: GITHUB_URL, external: true },
  { id: 3, label: 'Facts', href: '/facts', external: false },
];

export { bottomNavigation, navBar };
