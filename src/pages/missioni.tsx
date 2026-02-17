import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import NurseBottomNav from "../components/nursediary/NurseBottomNav";
import MissionHub from "../components/nursediary/MissionHub";
import { getNextDailyResetMs, getNextWeeklyResetMs } from "@/features/cards/quiz/quizLogic";

export default function MissioniPage(): JSX.Element {
  const router = useRouter();
  const goTab = (tab: "home" | "didattica" | "carte" | "profilo") => router.push(`/?tab=${tab}`);

  const [dailyLeft, setDailyLeft] = useState(0);
  const [weeklyLeft, setWeeklyLeft] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => {
      setDailyLeft(getNextDailyResetMs());
      setWeeklyLeft(getNextWeeklyResetMs());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Page
      title="Missioni"
      headerOverride={{
        title: "Missioni",
        subtitle: "Obiettivi e ricompense",
        showBack: true,
        onBack: () => router.back(),
      }}
    >
      <Section>
        <MissionHub dailyLeft={dailyLeft} weeklyLeft={weeklyLeft} />
      </Section>

      <NurseBottomNav active="profilo" onChange={goTab} />
    </Page>
  );
}
