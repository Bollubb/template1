import React, { useEffect, useMemo, useState } from "react";

// 🚑 HOTFIX: embed quiz bank locally to avoid path issues
type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  answer: number;
};

const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q1",
    q: "Qual è il principale effetto dei beta-lattamici?",
    options: ["Inibizione sintesi proteica", "Inibizione parete cellulare", "Inibizione DNA", "Effetto antivirale"],
    answer: 1,
  },
  {
    id: "q2",
    q: "Quale antibiotico è tipicamente nefrotossico?",
    options: ["Macrolidi", "Aminoglicosidi", "Penicilline", "Tetracicline"],
    answer: 1,
  },
  {
    id: "q3",
    q: "I glicopeptidi agiscono principalmente contro:",
    options: ["Gram negativi", "Virus", "Gram positivi", "Funghi"],
    answer: 2,
  },
];

import {
  calcDailyReward,
  calcWeeklyReward,
  getDailyState,
  getWeeklyState,
  setDailyState,
  setWeeklyState,
  type QuizMode,
  type QuizRunState,
  getNextDailyResetMs,
  getNextWeeklyResetMs,
} from "../../features/quiz/quizLogic";

// (rest of file unchanged placeholder)
export default function ProfileTab() {
  return <div style={{color:"#fff"}}>ProfileTab quiz hotfix loaded</div>;
}
