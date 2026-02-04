import React from "react";
import Link from "next/link";
import styles from "@styles/BottomNav.module.css";

export default function BottomNav(): JSX.Element {
  return (
    <nav className={styles.bottomnav}>
      <Link href="/">Home</Link>
      <Link href="/breeds">Breeds</Link>
      <Link href="/facts">Facts</Link>
    </nav>
  );
}
