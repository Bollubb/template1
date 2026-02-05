import Head from "next/head";
import React from "react";

export type PageProps = {
  title?: string;
  children: React.ReactNode;
};

export default function Page({
  title = "NurseDiary",
  children,
}: PageProps): JSX.Element {
  const pageTitle = title ? `NurseDiary | ${title}` : "NurseDiary";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="theme-color" content="#020617" />
      </Head>

      <div
        style={{
          minHeight: "100vh",
          overflowX: "hidden",
          color: "rgba(255,255,255,0.92)",

          /* 🔴 FIX CRITICO: niente repeat, niente tile */
          backgroundColor: "rgba(2,6,23,1)",
          backgroundImage:
            'radial-gradient(1200px 700px at 50% -10%, rgba(59,130,246,0.25), rgba(2,6,23,0.95) 55%), url("/background-main.png")',
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
        }}
      >
        {/* ===== Header ===== */}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            <img
              src="/logo.png"
              alt="NurseDiary"
              width={28}
              height={28}
              style={{ borderRadius: 8 }}
            />
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: 0.2,
              }}
            >
              NurseDiary
            </div>
          </div>
        </header>

        {/* ===== Main ===== */}
        <main style={{ paddingBottom: 96 }}>
          <div
            style={{
              maxWidth: 520,
              margin: "0 auto",
              padding: "16px 14px",
            }}
          >
            {children}
          </div>
        </main>

        {/* ===== Footer ===== */}
        <footer
          style={{
            padding: "18px 16px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
          }}
        >
          <small>© {new Date().getFullYear()} NurseDiary</small>
        </footer>
      </div>
    </>
  );
}
