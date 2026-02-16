import React, { useState, useEffect } from "react";
import QuizHub from "./QuizHub";
import UtilityHub from "./UtilityHub";

type Props = {
  onGoToCards: () => void;
  onGoToDidattica: () => void;
  onGoToProfile: () => void;
  openSection?: "quiz" | "utility";
  onCloseSection?: () => void;
};

export default function HomeDashboard({
  onGoToCards,
  onGoToDidattica,
  onGoToProfile,
  openSection,
  onCloseSection,
}: Props) {
  const [mode, setMode] = useState<"home" | "quiz" | "utility">("home");

  useEffect(() => {
    if (openSection === "quiz") setMode("quiz");
    if (openSection === "utility") setMode("utility");
  }, [openSection]);

  const goBack = () => {
    setMode("home");
    onCloseSection?.();
  };

  if (mode === "quiz") {
    return <QuizHub onBack={goBack} />;
  }

  if (mode === "utility") {
    return <UtilityHub onBack={goBack} />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <button onClick={onGoToDidattica}>Didattica</button>
      <button onClick={onGoToCards}>Carte</button>
      <button onClick={onGoToProfile}>Profilo</button>
    </div>
  );
}
