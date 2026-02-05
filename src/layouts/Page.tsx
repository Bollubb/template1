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
          backgroundColor: "rgb(2,6,23)",
          backgroundImage:
            "linear-gradient(rgba(2,6,23,0.92), rgba(2,6,23,0.985)), url('/background-main.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center -220px",
          backgroundSize: "2200px auto",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {/* HEADER */}
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

        {/* CONTENT */}
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

        {/* FOOTER */}
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
