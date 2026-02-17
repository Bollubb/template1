import React from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import UtilityHub from "../components/nursediary/UtilityHub";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";

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
