import Head from "next/head";
import React from "react";

export type PageProps = {
  title?: string;
  children: React.ReactNode;
};

export default function Page({ title = "NurseDiary", children }: PageProps): JSX.Element {
  const pageTitle = title ? `NurseDiary | ${title}` : "NurseDiary";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="theme-color" content="#0ea5e9" />
      </Head>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "white",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "12px 16px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18 }}>NurseDiary</div>
      </header>

      <main style={{ paddingBottom: 88 }}>{children}</main>

      <footer style={{ padding: "18px 16px", color: "rgba(0,0,0,0.55)" }}>
        <small>© {new Date().getFullYear()} NurseDiary</small>
      </footer>
    </>
  );
}
