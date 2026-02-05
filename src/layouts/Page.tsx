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
          overflowX: "hidden",
          // Background "come prima": immagine + overlay scuro per leggibilità
          backgroundImage:
            "linear-gradient(rgba(2,6,23,0.85), rgba(2,6,23,0.92)), url('/background-main.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          color: "rgba(255,255,255,0.92)",
        }}
      >

        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(2,6,23,0.65)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo.png"
              alt="NurseDiary"
              width={28}
              height={28}
              style={{ borderRadius: 8 }}
            />
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.2 }}>NurseDiary</div>
          </div>
        </header>

        <main style={{ paddingBottom: 96 }}>
          <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 14px" }}>{children}</div>
        </main>

        <footer style={{ padding: "18px 16px", color: "rgba(255,255,255,0.55)" }}>
          <small>© {new Date().getFullYear()} NurseDiary</small>
        </footer>
      </div>
    </>
  );
}
