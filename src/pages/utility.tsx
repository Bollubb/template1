import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";

// Disable SSR for UtilityHub: it relies on browser-only APIs (localStorage, clipboard, etc.)
// This prevents Next static export from failing on /utility.
const UtilityHub = dynamic(() => import("../components/nursediary/UtilityHub"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 18, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ fontWeight: 950, fontSize: 14 }}>Utility</div>
      <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>Caricamento strumenti…</div>
    </div>
  ),
});

export default function UtilityPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  return (
    <Page
      title="Utility"
      headerOverride={{
        title: "Utility",
        subtitle: "Strumenti rapidi",
        showBack: true,
        onBack: () => router.back(),
      }}
    >
      <Section>
        <UtilityHub onBack={() => router.back()} />
      </Section>

      <NurseBottomNav active="home" onChange={goTab} />
    </Page>
  );
}
