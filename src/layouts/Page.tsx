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
        <meta name="theme-color" content="#0b1220" />
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(1200px 700px at 50% -10%, rgba(59,130,246,0.35), rgba(2,6,23,1) 55%)",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(2,6,23,0.65)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18 }}>NurseDiary</div>
        </header>

        <main style={{ paddingBottom: 96 }}>
          <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 14px" }}>
            {children}
          </div>
        </main>

        <footer style={{ padding: "18px 16px", color: "rgba(255,255,255,0.55)" }}>
          <small>© {new Date().getFullYear()} NurseDiary</small>
        </footer>
      </div>
    </>
  );
}
