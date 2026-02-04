import React from "react";
import Link from "next/link";
import styles from "@styles/Header.module.css";

export default function Header(): JSX.Element {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/">Home</Link>
        <Link href="/breeds">Breeds</Link>
        <Link href="/facts">Facts</Link>
      </nav>
    </header>
  );
}
