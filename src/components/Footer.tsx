import React from "react";
import styles from "@styles/Footer.module.css";

export default function Footer(): JSX.Element {
  return (
    <footer className={styles.footer}>
      <small>© {new Date().getFullYear()}</small>
    </footer>
  );
}
