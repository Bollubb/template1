import { DOCS_URL, GITHUB_URL } from "@constants/index";

export type BottomNavigationItem = {
  title: string;
  href: string;
  external?: boolean;
};

const bottomNavigation: BottomNavigationItem[] = [
  { title: "Docs", href: DOCS_URL, external: true },
  { title: "GitHub", href: GITHUB_URL, external: true },
];

export default bottomNavigation;
