import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type RarityKey = "comune" | "rara" | "epica" | "leggendaria";

type CardDef = {
  id: string;
  name: string;
  rarity: RarityKey;
  image: string;
  set: "antibiotici";
};


type UserProfile = {
  id: string;
  displayName: string;
  email?: string;
  avatarDataUrl?: string;
  createdAt: number; // epoch ms
};

const LS_PROFILE = "nd_profile";
const LS_COLLECTION = "nd_collection_abx";
const LS_PILLS = "nd_pillole";
const LS_RECENT_PULLS = "nd_recent_pulls";
const LS_QUIZ_DAILY_DONE = "nd_quiz_daily_done";
const LS_QUIZ_WEEKLY_DONE = "nd_quiz_weekly_done";

// Economia (pillole)
const ECONOMY = {
  packPrice: 60,
  daily: { perCorrect: 2, completionBonus: 4, perfectBonus: 2, questions: 5 },
  weekly: { perCorrect: 3, completionBonus: 9, perfectBonus: 6, questions: 12 },
} as const;

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const stripWeirdText = (s: string): string => {
  // Rimuove caratteri "strani" (CJK / replacement char) che su alcuni device appaiono come "cinesi"
  return s
    .replace(/[\u4E00-\u9FFF]/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return stripWeirdText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: any = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value as any)) out[k] = sanitizeDeep(v);
    return out as T;
  }
  return value;
}

function sanitizeLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("nd_")) continue; // NurseDiary keys
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      // prova JSON
      try {
        const parsed = JSON.parse(raw);
        const cleaned = sanitizeDeep(parsed);
        localStorage.setItem(key, JSON.stringify(cleaned));
      } catch {
        const cleaned = stripWeirdText(raw);
        if (cleaned !== raw) localStorage.setItem(key, cleaned);
      }
    }
  } catch {
    // ignore
  }
}

function uid(prefix = "u") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}


const RARITY_COLORS: Record<RarityKey, string> = {
  comune: "rgba(180,180,180,0.9)",
  rara: "rgba(91,217,255,0.95)",
  epica: "rgba(165,110,255,0.95)",
  leggendaria: "rgba(255,210,90,1)",
};

const CARDS: CardDef[] = [
  { id: "aminoglicosidi", name: "Aminoglicosidi", rarity: "rara", image: "/cards/antibiotici-aminoglicosidi.png", set: "antibiotici" },
  { id: "carbapenemi", name: "Carbapenemi", rarity: "epica", image: "/cards/antibiotici-carbapenemi.png", set: "antibiotici" },
  { id: "penicilline", name: "Penicilline", rarity: "comune", image: "/cards/antibiotici-penicilline.png", set: "antibiotici" },
  { id: "cefalosporine", name: "Cefalosporine", rarity: "comune", image: "/cards/antibiotici-cefalosporine.png", set: "antibiotici" },
  { id: "fluorochinoloni", name: "Fluorochinoloni", rarity: "rara", image: "/cards/antibiotici-fluorochinoloni.png", set: "antibiotici" },
  { id: "glicopeptidi", name: "Glicopeptidi", rarity: "rara", image: "/cards/antibiotici-glicopeptidi.png", set: "antibiotici" },
  { id: "lincosamidi", name: "Lincosamidi", rarity: "epica", image: "/cards/antibiotici-lincosamidi.png", set: "antibiotici" },
  { id: "macrolidi", name: "Macrolidi", rarity: "comune", image: "/cards/antibiotici-macrolidi.png", set: "antibiotici" },
  { id: "nitroimidazoli", name: "Nitroimidazoli", rarity: "leggendaria", image: "/cards/antibiotici-nitroimidazoli.png", set: "antibiotici" },
  { id: "oxazolidinoni", name: "Oxazolidinoni", rarity: "leggendaria", image: "/cards/antibiotici-oxazolidinoni.png", set: "antibiotici" },
  { id: "sulfonamidi", name: "Sulfonamidi", rarity: "epica", image: "/cards/antibiotici-sulfonamidi.png", set: "antibiotici" },
  { id: "tetracicline", name: "Tetracicline", rarity: "epica", image: "/cards/antibiotici-tetracicline.png", set: "antibiotici" },
];


type ContentItem = {
  id: string;
  titolo: string;
  categoria: string;
  tag: string;
  descrizione: string;
  contenuto: string;
  link: string;
  immagine: string;
  tipo: string;
  premium: string;
};

function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

function safe(v: unknown) {
  return (v ?? "").toString().trim();
}

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cols = splitCSVLine(row);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj as ContentItem;
  });
}

async function shareOrCopy(url: string) {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({
        title: "NurseDiary",
        url,
      });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      alert("Link copiato negli appunti OK");
      return;
    }

    // fallback super-basic
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("Link copiato negli appunti OK");
  } catch (e) {
    // non errore grave
    console.log("Share/copy annullato o fallito", e);
  }
}

function ContentCard({
  item,
  isFavorite,
  onToggleFavorite,
}: {
  item: ContentItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const id = safe(item.id);
  const titolo = safe(item.titolo);
  const categoria = safe(item.categoria);
  const descrizione = safe(item.descrizione);
  const tag = safe(item.tag);
  const tipo = safe(item.tipo);
  const premium = safe(item.premium);

  const href = `/c/${encodeURIComponent(id)}`;

  return (
    <article
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "baseline",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={href}
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              {titolo}
            </Link>

            {premium && premium.toLowerCase() === "si" && (
              <span
                style={{
                  fontSize: 12,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(165,110,255,0.18)",
                  opacity: 0.95,
                }}
              >
                Premium
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => onToggleFavorite(id)}
            aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            title={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: isFavorite ? "rgba(255,210,90,0.18)" : "rgba(0,0,0,0.18)",
              color: "white",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            猸�
          </button>

          <button
            type="button"
            onClick={() => shareOrCopy(typeof window !== "undefined" ? window.location.origin + href : href)}
            aria-label="Condividi o copia link"
            title="Condividi / copia link"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              color: "white",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.35 }}>{descrizione}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {categoria && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(91,217,255,0.10)",
              opacity: 0.95,
            }}
          >
            {categoria}
          </span>
        )}
        {tipo && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              opacity: 0.9,
            }}
          >
            {tipo}
          </span>
        )}
        {tag && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.16)",
              opacity: 0.9,
            }}
          >
            #{tag}
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <Link
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "white",
            fontSize: 14,
            opacity: 0.95,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.18)",
            padding: "10px 12px",
            borderRadius: 14,
          }}
        >
          Apri contenuto 鈫�
        </Link>
      </div>
    </article>
  );
}


const slots = Array.from({ length: 12 }, (_, i) => i);

function CarteTab() {
  // ---- Persistent state (SSR-safe) ----
  const [pillole, setPillole] = useState<number>(() => {
    if (typeof window === "undefined") return 120;
    return Number(localStorage.getItem("nd_pillole")) || 120;
  });

  const [collection, setCollection] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("nd_collection_abx") || "{}");
    } catch {
      return {};
    }
  });

  const [recentPulls, setRecentPulls] = useState<CardDef[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("nd_recent_pulls") || "[]");
    } catch {
      return [];
    }
  });

  // ---- UI state ----
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState<CardDef[]>([]);
  const [activeRarity, setActiveRarity] = useState<RarityKey | null>(null);
  const [legendFlash, setLegendFlash] = useState(false);

  const [cardsView, setCardsView] = useState<"negozio" | "collezione" | "scambia" | "guadagna">("negozio");

// Guadagna pillole: quiz
type QuizMode = "giornaliero" | "settimanale";
type QuizQ = { id: string; q: string; options: string[]; answer: number };

const QUIZ_BANK: QuizQ[] = useMemo(
  () => [
    { id: "q1", q: "Qual 猫 la sede pi霉 comune per misurare la saturazione SpO鈧�?", options: ["Dito", "Tibia", "Addome", "Scapola"], answer: 0 },
    { id: "q2", q: "La tecnica 鈥減ush-pause鈥� nel lavaggio di un accesso venoso serve a:", options: ["Ridurre la pressione arteriosa", "Creare turbolenza e prevenire occlusioni", "Aumentare la diuresi", "Sterilizzare il catetere"], answer: 1 },
    { id: "q3", q: "In caso di sospetta ipoglicemia, il primo controllo utile 猫:", options: ["ECG", "Glicemia capillare", "Saturazione", "Temperatura"], answer: 1 },
    { id: "q4", q: "Un paziente con dispnea improvvisa: quale dato raccogli per primo?", options: ["Peso", "SpO鈧� e FR", "Altezza", "Anamnesi familiare"], answer: 1 },
    { id: "q5", q: "Per ridurre contaminazioni in emocoltura 猫 importante:", options: ["Usare guanti sterili e antisepsi corretta", "Prelevare sempre dopo antibiotico", "Agitare energicamente il flacone", "Usare solo aghi piccoli"], answer: 0 },
    { id: "q6", q: "Un CVC appena medicato: cosa va documentato sempre?", options: ["Colore dei capelli", "Data/ora e condizioni del sito", "Numero di passi", "Marca del cerotto"], answer: 1 },
    { id: "q7", q: "La PEA (attivit脿 elettrica senza polso) richiede:", options: ["Solo ossigeno", "RCP + ricerca cause reversibili", "Antibiotico immediato", "Solo fluidi"], answer: 1 },
    { id: "q8", q: "Un segno tipico di disidratazione 猫:", options: ["Cute calda e sudata", "Mucose secche", "Bradicardia severa sempre", "Tosse produttiva"], answer: 1 },
    { id: "q9", q: "Nel dolore toracico acuto, una priorit脿 猫:", options: ["Misurare la circonferenza vita", "ECG precoce", "Fare fisioterapia", "Dare latte"], answer: 1 },
    { id: "q10", q: "Una corretta igiene delle mani dura (in media) almeno:", options: ["2 secondi", "10鈥�20 secondi", "1 minuto", "5 minuti"], answer: 1 },
    { id: "q11", q: "Un parametro che indica possibile sepsi 猫:", options: ["Febbre + tachicardia + FR aumentata", "Solo prurito", "Solo insonnia", "Solo fame"], answer: 0 },
    { id: "q12", q: "La scala AVPU valuta:", options: ["Dolore addominale", "Stato di coscienza", "Tono muscolare", "Colore della cute"], answer: 1 },
    { id: "q13", q: "Nel sospetto shock, quale parametro 猫 molto utile monitorare?", options: ["Diuresi oraria", "Colore occhi", "Numero di SMS", "Capelli"], answer: 0 },
    { id: "q14", q: "Prima di un prelievo arterioso, 猫 utile verificare:", options: ["Test di Allen (se indicato)", "Glicemia postprandiale", "Visione 10/10", "BMI"], answer: 0 },
    { id: "q15", q: "Un campione di urine per urinocoltura dovrebbe essere:", options: ["Primo mitto scartato, poi mitto intermedio", "Sempre raccolto dalla borsa catetere", "Mescolato con sapone", "Tenuto a temperatura ambiente 24h"], answer: 0 },
    { id: "q16", q: "Nel paziente ipossico, una delle prime verifiche pratiche 猫:", options: ["Che il sensore SpO鈧� sia posizionato correttamente", "Che abbia mangiato", "Che dorma", "Che abbia scarpe comode"], answer: 0 },
    { id: "q17", q: "Il rischio di infezione aumenta con:", options: ["Manipolazioni frequenti del device", "Igiene mani corretta", "Antisepsi adeguata", "Medicazioni protette"], answer: 0 },
    { id: "q18", q: "Un segno compatibile con extravasazione 猫:", options: ["Gonfiore e dolore nel sito", "Aumento appetito", "Visione migliore", "Riduzione sete"], answer: 0 },
    { id: "q19", q: "L鈥檕biettivo principale della medicazione sterile 猫:", options: ["Decorare il sito", "Ridurre rischio infezione e proteggere il punto di inserzione", "Aumentare la pressione", "Ridurre la glicemia"], answer: 1 },
    { id: "q20", q: "In triage/urgenza, il dolore (NRS) 猫:", options: ["Un parametro non necessario", "Un parametro da rilevare e rivalutare", "Solo per bambini", "Solo per sportivi"], answer: 1 },

    // --- Domande aggiuntive (alcune pi霉 difficili) ---
    { id: "q21", q: "Qual 猫 il range di pH normale nel sangue arterioso?", options: ["7.10鈥�7.20", "7.35鈥�7.45", "7.50鈥�7.60", "6.90鈥�7.00"], answer: 1 },
    { id: "q22", q: "Nel lavaggio di un CVC, la tecnica push-pause 猫 utile perch茅:", options: ["Aumenta la coagulazione", "Riduce la turbolenza", "Crea turbolenza che aiuta a prevenire depositi", "Sostituisce l鈥檈parina sempre"], answer: 2 },
    { id: "q23", q: "Quale segno 猫 pi霉 suggestivo di extravasazione durante infusione EV?", options: ["Bradicardia", "Dolore/bruciore e tumefazione locale", "Miosi", "Tosse"], answer: 1 },
    { id: "q24", q: "In presenza di iperkaliemia severa con ECG alterato, la priorit脿 猫:", options: ["Diuretico", "Calcio gluconato EV", "Antibiotico", "Paracetamolo"], answer: 1 },
    { id: "q25", q: "Una PVC (pressione venosa centrale) elevata pu貌 essere associata a:", options: ["Ipovolemia", "Scompenso destro/iperidratazione", "Iperventilazione", "Anemia"], answer: 1 },
    { id: "q26", q: "Per ridurre il rischio di contaminazione nelle emocolture, 猫 fondamentale:", options: ["Guanti sterili sempre", "Disinfezione accurata della cute e del tappo", "Fare 1 sola bottiglia", "Usare sempre ago cannula"], answer: 1 },
    { id: "q27", q: "Qual 猫 un criterio tipico di SIRS?", options: ["FR < 10", "FC > 90", "Temp < 34", "PAS > 180"], answer: 1 },
    { id: "q28", q: "In un paziente con dispnea, prima di tutto si valuta:", options: ["PA e temperatura", "Vie aeree e SpO鈧�", "Diuresi", "BMI"], answer: 1 },
    { id: "q29", q: "Quale valore di glicemia indica ipoglicemia nell鈥檃dulto (in genere)?", options: ["> 140 mg/dl", "< 70 mg/dl", "< 120 mg/dl", "< 90 mg/dl"], answer: 1 },
    { id: "q30", q: "La noradrenalina 猫 principalmente:", options: ["Un diuretico", "Un vasopressore alfa-adrenergico", "Un antiaritmico classe III", "Un analgesico"], answer: 1 },
    // Difficili
    { id: "q31", q: "Quale condizione aumenta il rischio di nefrotossicit脿 da aminoglicosidi?", options: ["Et脿 giovane", "Terapia breve", "Insufficienza renale pre-esistente", "Assunzione di vitamina C"], answer: 2 },
    { id: "q32", q: "Un paziente con pH 7.28 e HCO鈧冣伝 basso suggerisce:", options: ["Alcalosi respiratoria", "Acidosi metabolica", "Acidosi respiratoria", "Alcalosi metabolica"], answer: 1 },
    { id: "q33", q: "Qual 猫 la complicanza pi霉 temuta di un PICC malposizionato?", options: ["Dolore al braccio", "Aritmie/posizionamento in atrio", "Febbre da fieno", "Cefalea"], answer: 1 },
    { id: "q34", q: "Quale affermazione su C. difficile 猫 corretta?", options: ["Diarrea sempre virale", "Antibioticoterapia 猫 un fattore di rischio", "Non 猫 contagioso", "Si cura solo con FANS"], answer: 1 },
    { id: "q35", q: "Nel triage, il 'golden standard' per confermare ipossiemia 猫:", options: ["SpO鈧�", "Emogasanalisi arteriosa", "Temperatura", "RX torace"], answer: 1 },
    { id: "q36", q: "Quale misura riduce pi霉 efficacemente il rischio di flebite da infusione periferica?", options: ["Aumentare la velocit脿", "Sostituire il sito se dolore/rossore", "Usare aghi pi霉 grossi", "Non lavare mai"], answer: 1 },
    { id: "q37", q: "Nella gestione del dolore, la scala NRS misura:", options: ["Il rischio di caduta", "L鈥檌ntensit脿 soggettiva del dolore", "La saturazione", "La PA"], answer: 1 },
    { id: "q38", q: "Un segno di reazione trasfusionale acuta 猫:", options: ["Miglioramento dispnea", "Febbre/brividi e dolore lombare", "Aumento appetito", "Cute secca"], answer: 1 },
    { id: "q39", q: "Quale parametro 猫 pi霉 utile per valutare la perfusione periferica?", options: ["Capillary refill time", "Colore capelli", "Peso", "Altezza"], answer: 0 },
    { id: "q40", q: "In shock settico, il target MAP comunemente usato 猫 circa:", options: ["45 mmHg", "65 mmHg", "90 mmHg", "110 mmHg"], answer: 1 },
  ],
  []
);

const [earnTab, setEarnTab] = useState<QuizMode>("giornaliero");

const [dailyDoneKey, setDailyDoneKey] = useState<string>(() => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nd_quiz_daily_done") || "";
});

const [weeklyDoneKey, setWeeklyDoneKey] = useState<string>(() => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nd_quiz_weekly_done") || "";
});

const [quiz, setQuiz] = useState<{
  mode: QuizMode;
  status: "idle" | "running" | "done";
  idx: number;
  correct: number;
  selected: number | null;
  questions: QuizQ[];
  history: { id: string; q: string; options: string[]; answer: number; selected: number }[];
}>({ mode: "giornaliero", status: "idle", idx: 0, correct: 0, selected: null, questions: [], history: [] });

function todayKeyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoWeekKey() {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const y = date.getUTCFullYear();
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

function pickQuizQuestions(mode: QuizMode) {
  const key = mode === "giornaliero" ? todayKeyISO() : isoWeekKey();
  const seed = seedFromString(`${mode}-${key}`);
  const rnd = mulberry32(seed);
  const arr = [...QUIZ_BANK];
  // fisher-yates seeded
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const n = mode === "giornaliero" ? 5 : 12;
  return arr.slice(0, Math.min(n, arr.length));
}

function quizDoneFor(mode: QuizMode) {
  const key = mode === "giornaliero" ? todayKeyISO() : isoWeekKey();
  return mode === "giornaliero" ? dailyDoneKey === key : weeklyDoneKey === key;
}

function startQuiz(mode: QuizMode) {
  if (quizDoneFor(mode)) return;
  const questions = pickQuizQuestions(mode);
  setQuiz({ mode, status: "running", idx: 0, correct: 0, selected: null, questions, history: [] });
}

function selectAnswer(choiceIdx: number) {
  setQuiz((q) => ({ ...q, selected: choiceIdx }));
}

function nextQuestion() {
  setQuiz((q) => {
    if (q.status !== "running") return q;
    const current = q.questions[q.idx];
    const selectedIdx = q.selected ?? -1;
    const isCorrect = selectedIdx === current.answer;
    const nextIdx = q.idx + 1;
    const historyItem = { ...current, selected: selectedIdx };
    if (nextIdx >= q.questions.length) {
      return {
        ...q,
        status: "done",
        correct: q.correct + (isCorrect ? 1 : 0),
        selected: null,
        idx: q.idx,
        history: [...q.history, historyItem],
      };
    }
    return {
      ...q,
      idx: nextIdx,
      correct: q.correct + (isCorrect ? 1 : 0),
      selected: null,
      history: [...q.history, historyItem],
    };
  });
}

function claimQuizReward() {
  setQuiz((q) => {
    if (q.status !== "done") return q;

    const cfg = q.mode === "giornaliero" ? ECONOMY.daily : ECONOMY.weekly;
    const perCorrect = cfg.perCorrect;
    const completionBonus = cfg.completionBonus;
    const perfectBonus = q.correct === q.questions.length ? cfg.perfectBonus : 0;
    const earned = q.correct * perCorrect + completionBonus + perfectBonus;

    const key = q.mode === "giornaliero" ? todayKeyISO() : isoWeekKey();
    setPillole((p) => p + earned);

    if (typeof window !== "undefined") {
      if (q.mode === "giornaliero") {
        setDailyDoneKey(key);
        localStorage.setItem("nd_quiz_daily_done", key);
      } else {
        setWeeklyDoneKey(key);
        localStorage.setItem("nd_quiz_weekly_done", key);
      }
    }

    return { ...q, status: "idle", idx: 0, correct: 0, selected: null, questions: [], history: [] };
  });
}


  // Collezione: filtri / ordinamento
  const [filterSet, setFilterSet] = useState<"tutti" | "antibiotici">("tutti");
  const [filterRarity, setFilterRarity] = useState<"tutte" | RarityKey>("tutte");
  const [sortMode, setSortMode] = useState<"unlocked" | "rarity" | "name">("unlocked");

  // Negozio: selezione pack
  type PackDef = {
    id: string;
    name: string;
    price: number; // pillole
    image: string;
    set: "antibiotici";
  };

  const PACKS: PackDef[] = useMemo(
    () => [
      { id: "pack-antibiotici", name: "Bustina Antibiotici", price: ECONOMY.packPrice, image: "/packs/pack-antibiotici.png", set: "antibiotici" },
    ],
    []
  );

  const [selectedPackId, setSelectedPackId] = useState<string>(() => PACKS[0]?.id ?? "pack-antibiotici");

  const selectedPack = useMemo(() => PACKS.find((p) => p.id === selectedPackId) || PACKS[0], [PACKS, selectedPackId]);

  // Modal carta
  const [modalCard, setModalCard] = useState<CardDef | null>(null);

  // Scambio: quantit脿 per carta (solo doppioni)
  const [swapQtyById, setSwapQtyById] = useState<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    sanitizeLegacyLocalStorage();
    localStorage.setItem("nd_pillole", String(pillole));
  }, [pillole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_collection_abx", JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nd_recent_pulls", JSON.stringify(recentPulls));
  }, [recentPulls]);

  // ---- Helpers ----
  const rarityRank: Record<RarityKey, number> = useMemo(
    () => ({ comune: 1, rara: 2, epica: 3, leggendaria: 4 }),
    []
  );

  const pillolePerRarity: Record<RarityKey, number> = useMemo(
    () => ({ comune: 1, rara: 3, epica: 7, leggendaria: 15 }),
    []
  );

  const countOf = (id: string) => Number(collection[id] || 0);

  const cardsForPack = useMemo(() => {
    // pronto per future espansioni: filtri per set in base al pack
    const set = selectedPack?.set ?? "antibiotici";
    return CARDS.filter((c) => c.set === set);
  }, [selectedPack]);

  function pickCardFrom(list: CardDef[]): CardDef {
    // Distribuzione semplice: pesi per rarit脿 (non mostrati in UI)
    const weights: Record<RarityKey, number> = {
      comune: 60,
      rara: 25,
      epica: 12,
      leggendaria: 3,
    };

    const pool = list.length ? list : CARDS;
    const total = pool.reduce((acc, c) => acc + (weights[c.rarity] ?? 1), 0);
    let r = Math.random() * total;
    for (const c of pool) {
      r -= weights[c.rarity] ?? 1;
      if (r <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  function openPack() {
    if (!selectedPack) return;
    if (isOpening) return;
    if (pillole < selectedPack.price) return;

    setIsOpening(true);
    setPulledCards([]);
    setActiveRarity(null);
    setLegendFlash(false);

    setPillole((p) => p - selectedPack.price);

    // 70% 1 carta, 30% 2 carte (non mostrato in UI)
    const cardCount = Math.random() < 0.7 ? 1 : 2;

    const pulls: CardDef[] = [];
    for (let i = 0; i < cardCount; i++) pulls.push(pickCardFrom(cardsForPack));

    const highest = pulls.reduce((a, b) => (rarityRank[a.rarity] >= rarityRank[b.rarity] ? a : b));
    setActiveRarity(highest.rarity);

    if (highest.rarity === "leggendaria") {
      setLegendFlash(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate?.([40, 30, 40]);
      }
      setTimeout(() => setLegendFlash(false), 700);
    }

    setTimeout(() => {
      setPulledCards(pulls);

      setCollection((prev) => {
        const next = { ...prev };
        pulls.forEach((c) => {
          next[c.id] = (next[c.id] || 0) + 1;
        });
        return next;
      });

      setRecentPulls((prev) => {
        const merged = [...pulls, ...prev].slice(0, 20);
        return merged;
      });

      setIsOpening(false);
    }, 650);
  }

  // ---- Collezione: lista filtrata + ordinata ----
  const filteredCards = useMemo(() => {
    let list = [...CARDS];

    if (filterSet !== "tutti") list = list.filter((c) => c.set === filterSet);
    if (filterRarity !== "tutte") list = list.filter((c) => c.rarity === filterRarity);

    const isUnlocked = (c: CardDef) => countOf(c.id) > 0;

    const byName = (a: CardDef, b: CardDef) => a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    const byRarityThenName = (a: CardDef, b: CardDef) =>
      rarityRank[b.rarity] - rarityRank[a.rarity] || byName(a, b);
    const byUnlockedFirst = (a: CardDef, b: CardDef) => {
      const au = isUnlocked(a) ? 1 : 0;
      const bu = isUnlocked(b) ? 1 : 0;
      return bu - au || byRarityThenName(a, b);
    };

    if (sortMode === "name") list.sort(byName);
    else if (sortMode === "rarity") list.sort(byRarityThenName);
    else list.sort(byUnlockedFirst);

    return list;
  }, [collection, filterSet, filterRarity, sortMode, rarityRank]);

  // ---- Scambio: candidati + totale pillole ----
  const swapRows = useMemo(() => {
    return CARDS.map((card) => {
      const count = countOf(card.id);
      const dupes = Math.max(0, count - 1);
      return { card, count, dupes };
    })
      .filter((x) => x.dupes > 0)
      .sort((a, b) => rarityRank[b.card.rarity] - rarityRank[a.card.rarity]);
  }, [collection, rarityRank]);

  const swapTotalPills = useMemo(() => {
    return swapRows.reduce((acc, row) => {
      const qty = Math.min(row.dupes, Math.max(0, swapQtyById[row.card.id] || 0));
      return acc + qty * (pillolePerRarity[row.card.rarity] || 0);
    }, 0);
  }, [swapRows, swapQtyById, pillolePerRarity]);

  function incSwap(id: string, max: number) {
    setSwapQtyById((prev) => {
      const cur = prev[id] || 0;
      const next = Math.min(max, cur + 1);
      return { ...prev, [id]: next };
    });
  }

  function decSwap(id: string) {
    setSwapQtyById((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur - 1);
      return { ...prev, [id]: next };
    });
  }

  function confirmSwap() {
    if (swapTotalPills <= 0) return;

    // aggiorna collezione (brucia solo doppioni, lasciando almeno 1)
    setCollection((prev) => {
      const next = { ...prev };
      swapRows.forEach(({ card, dupes }) => {
        const qty = Math.min(dupes, Math.max(0, swapQtyById[card.id] || 0));
        if (qty > 0) next[card.id] = Math.max(1, (next[card.id] || 0) - qty);
      });
      return next;
    });

    setPillole((p) => p + swapTotalPills);
    setSwapQtyById({});
  }

  // ---- UI components ----
  const TabButton = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        minWidth: 112,
        whiteSpace: "nowrap",
        padding: "10px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.18)",
        color: "white",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );

  
  const CardTile = ({ card }: { card: CardDef }) => {
    const owned = countOf(card.id);
    const locked = owned <= 0;
    const aura = RARITY_COLORS[card.rarity];
    // aspect ratio ~ 3:4
    return (
      <div
        onClick={() => {
          if (!locked) setModalCard(card);
        }}
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.22)",
          cursor: locked ? "default" : "pointer",
        }}
      >
        <div style={{ position: "relative", width: "100%", paddingTop: "140%" }}>
          {/* aura leggera solo per sbloccate (preview) - dietro l'immagine */}
          {!locked && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: -30,
                background: `radial-gradient(circle at 50% 40%, ${aura} 0%, rgba(0,0,0,0) 60%)`,
                filter: "blur(18px)",
                opacity: 0.32,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          <img
            src={card.image}
            alt={locked ? "Carta bloccata" : card.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: "scale(1.02)",
              display: "block",
              filter: locked ? "grayscale(1) blur(0.25px)" : "none",
              opacity: locked ? 0.18 : 1,
              zIndex: 1,
            }}
          />

          {/* overlay locked con lucchetto centrale grande */}
          {locked && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ fontSize: 48, lineHeight: 1 }}></span>
              </div>
            </div>
          )}
        </div>

        {/* badges */}
        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 8, zIndex: 6 }}>
          {!locked && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.40)",
                border: `1px solid ${aura}`,
                color: "white",
                fontWeight: 900,
              }}
            >
              {card.rarity.toUpperCase()}
            </span>
          )}

          {!locked && owned > 1 && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.40)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "white",
                fontWeight: 900,
              }}
            >
              x{owned}
            </span>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 10px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.68) 55%, rgba(0,0,0,0.82) 100%)",
            color: "white",
            fontWeight: 800,
            zIndex: 5,
          }}
        >
          {locked ? "???" : card.name}
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{locked ? "Da sbloccare" : "Collezione"}</div>
        </div>
      </div>
    );
  };

const Modal = ({ card }: { card: CardDef }) => {
    const aura = RARITY_COLORS[card.rarity];
    return (
      <div
        onClick={() => setModalCard(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: 18,
          paddingBottom: "calc(18px + 92px)",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(420px, 92vw)",
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(10,10,10,0.88)",
            padding: 14,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 50px 12px ${aura}`,
            maxHeight: "calc(100vh - 140px)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: 16 }}>{card.name}</div>
            <button
              onClick={() => setModalCard(null)}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 800,
              }}
            >
              Chiudi
            </button>
          </div>



          <div style={{ height: 10 }} />

          <div
  style={{
    borderRadius: 22,
    padding: 0,
    background: "transparent",
    boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 48px 14px ${aura}`,
  }}
>
  <div
    style={{
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.25)",
    }}
  >
    <img src={card.image} alt={card.name} style={{ width: "100%", height: "auto", display: "block" }} />
  </div>
</div>

          <div style={{ height: 12 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
              }}
            >
              {card.rarity.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Copie: x{countOf(card.id)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ---- Render ----
  return (
    <div style={{ padding: "14px 12px 90px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ color: "white", fontWeight: 1000, fontSize: 18 }}>Carte</div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.22)",
            color: "white",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
          title="Pillole"
        >
           {pillole}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div
  style={{
    display: "flex",
    gap: 10,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 2,
    scrollbarWidth: "none",
  }}
>
  <div style={{ display: "flex", gap: 10, minWidth: "max-content" }}>
    <TabButton label="Negozio" active={cardsView === "negozio"} onClick={() => setCardsView("negozio")} />
    <TabButton label="Collezione" active={cardsView === "collezione"} onClick={() => setCardsView("collezione")} />
    <TabButton label="Scambia" active={cardsView === "scambia"} onClick={() => setCardsView("scambia")} />
    <TabButton label="Guadagna" active={cardsView === "guadagna"} onClick={() => setCardsView("guadagna")} />
  </div>
</div>

      <div style={{ height: 14 }} />

      {cardsView === "negozio" && (
        <div>
          <div style={{ color: "white", fontWeight: 900, opacity: 0.9 }}>Scegli una bustina</div>
          <div style={{ height: 10 }} />

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <img
              src={selectedPack?.image}
              alt={selectedPack?.name || "Pack"}
              style={{ width: 92, height: 92, objectFit: "contain" }}
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ color: "white", fontWeight: 1000, fontSize: 16 }}>{selectedPack?.name}</div>
              <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, marginTop: 4 }}>
                Costo: {selectedPack?.price} 
              </div>
              <div style={{ height: 10 }} />

              <select
                value={selectedPackId}
                onChange={(e) => setSelectedPackId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.24)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                {PACKS.map((p) => (
                  <option key={p.id} value={p.id} style={{ color: "black" }}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div style={{ height: 10 }} />

              <button
                onClick={openPack}
                disabled={isOpening || pillole < (selectedPack?.price || 0)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background:
                    isOpening || pillole < (selectedPack?.price || 0)
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  cursor: isOpening || pillole < (selectedPack?.price || 0) ? "not-allowed" : "pointer",
                }}
              >
                {isOpening ? "Apertura..." : "Apri bustina"}
              </button>
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Effetto flash leggendaria */}
          {legendFlash && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,210,90,0.10)",
                pointerEvents: "none",
                zIndex: 40,
              }}
            />
          )}

          {/* Carte estratte (solo sessione corrente) */}
          {pulledCards.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.20)",
              }}
            >
              <div style={{ color: "white", fontWeight: 1000 }}>
                Carte estratte{" "}
                {activeRarity && (
                  <span style={{ opacity: 0.85, fontWeight: 800 }}>鈥� {activeRarity.toUpperCase()}</span>
                )}
              </div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {pulledCards.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <img src={c.image} alt={c.name} style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                    <div style={{ padding: 10, background: "rgba(0,0,0,0.35)", color: "white", fontWeight: 900 }}>
                      {c.name}
                      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 700 }}>{c.rarity.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 14 }} />

          {/* Ultime estrazioni (persistenti, max 20) */}
          {recentPulls.length > 0 && (
            <div style={{ padding: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.18)" }}>
              <div style={{ color: "white", fontWeight: 1000 }}>Ultime estrazioni</div>
              <div style={{ height: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {recentPulls.map((c, idx) => (
                  <div
                    key={`${c.id}-recent-${idx}`}
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.22)",
                    }}
                  >
                    <img src={c.image} alt={c.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {cardsView === "collezione" && (
        <div>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>SET</div>
                <select
                  value={filterSet}
                  onChange={(e) => setFilterSet(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.24)",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  <option value="tutti" style={{ color: "black" }}>
                    Tutti
                  </option>
                  <option value="antibiotici" style={{ color: "black" }}>
                    Antibiotici
                  </option>
                </select>
              </div>

              <div>
                <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>RARIT脌</div>
                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.24)",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  <option value="tutte" style={{ color: "black" }}>
                    Tutte
                  </option>
                  <option value="comune" style={{ color: "black" }}>
                    Comune
                  </option>
                  <option value="rara" style={{ color: "black" }}>
                    Rara
                  </option>
                  <option value="epica" style={{ color: "black" }}>
                    Epica
                  </option>
                  <option value="leggendaria" style={{ color: "black" }}>
                    Leggendaria
                  </option>
                </select>
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>ORDINAMENTO</div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.24)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                <option value="unlocked" style={{ color: "black" }}>
                  Sbloccate prima
                </option>
                <option value="rarity" style={{ color: "black" }}>
                  Rarit脿 鈫� Nome
                </option>
                <option value="name" style={{ color: "black" }}>
                  Nome A 鈫� Z
                </option>
              </select>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filteredCards.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {cardsView === "scambia" && (
        <div>
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
            }}
          >
            <div style={{ color: "white", fontWeight: 1000 }}>Scambia doppioni</div>
            <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, marginTop: 6, fontSize: 13 }}>
              Seleziona quante copie vuoi scambiare. Le prime copie rimangono in collezione.
            </div>

            <div style={{ height: 12 }} />

            {swapRows.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>Nessun doppione disponibile.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {swapRows.map(({ card, dupes }) => {
                  const qty = Math.min(dupes, Math.max(0, swapQtyById[card.id] || 0));
                  const valueEach = pillolePerRarity[card.rarity] || 0;
                  return (
                    <div
                      key={card.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      <img src={card.image} alt={card.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {card.name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85, color: "white", fontWeight: 800 }}>
                          Doppioni: {dupes} 鈥� {valueEach} ciascuno
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => decSwap(card.id)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontWeight: 1000,
                          }}
                        >
                          鈭�
                        </button>
                        <div style={{ minWidth: 28, textAlign: "center", color: "white", fontWeight: 1000 }}>{qty}</div>
                        <button
                          onClick={() => incSwap(card.id, dupes)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.08)",
                            color: "white",
                            fontWeight: 1000,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ height: 12 }} />

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                paddingTop: 10,
                borderTop: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ color: "white", fontWeight: 1000 }}>Totale: {swapTotalPills} </div>
              <button
                onClick={confirmSwap}
                disabled={swapTotalPills <= 0}
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: swapTotalPills <= 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  cursor: swapTotalPills <= 0 ? "not-allowed" : "pointer",
                }}
              >
                Scambia selezionati
              </button>
            </div>
          </div>
        </div>
      )}

      {cardsView === "guadagna" && (
  <div>
    <div
      style={{
        padding: 12,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ color: "white", fontWeight: 1000 }}>Guadagna pillole</div>
        <div style={{ opacity: 0.8, fontWeight: 900, color: "white" }}>
          Ricompense bilanciate (pillole)
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <TabButton label="Quiz giornaliero" active={earnTab === "giornaliero"} onClick={() => setEarnTab("giornaliero")} />
        <TabButton label="Quiz settimanale" active={earnTab === "settimanale"} onClick={() => setEarnTab("settimanale")} />
      </div>

      <div style={{ height: 12 }} />

      {quiz.status === "idle" && (
        <div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 900, lineHeight: 1.3 }}>
            {earnTab === "giornaliero" ? "5 domande 鈥� una volta al giorno" : "12 domande 鈥� una volta a settimana"}
          </div>
          <div style={{ height: 10 }} />
          {quizDoneFor(earnTab) ? (
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>
              OK Gi脿 completato {earnTab === "giornaliero" ? "oggi" : "questa settimana"}.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startQuiz(earnTab)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(91,217,255,0.18)",
                color: "white",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Inizia quiz
            </button>
          )}
        </div>
      )}

      {quiz.status === "running" && (
        <div>
          <div style={{ color: "white", fontWeight: 1000 }}>
            Domanda {quiz.idx + 1}/{quiz.questions.length}
          </div>
          <div style={{ height: 10 }} />
          <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900, lineHeight: 1.35 }}>
            {quiz.questions[quiz.idx]?.q}
          </div>
          <div style={{ height: 10 }} />

          <div style={{ display: "grid", gap: 10 }}>
            {quiz.questions[quiz.idx]?.options.map((opt, i) => {
              const selected = quiz.selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectAnswer(i)}
                  style={{
                    textAlign: "left",
                    padding: "12px 12px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: selected ? "rgba(165,110,255,0.22)" : "rgba(0,0,0,0.22)",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div style={{ height: 12 }} />

          <button
            type="button"
            onClick={nextQuestion}
            disabled={quiz.selected === null}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.14)",
              background: quiz.selected === null ? "rgba(255,255,255,0.08)" : "rgba(91,217,255,0.18)",
              color: "white",
              fontWeight: 1000,
              cursor: quiz.selected === null ? "not-allowed" : "pointer",
            }}
          >
            {quiz.idx + 1 >= quiz.questions.length ? "Concludi" : "Avanti"}
          </button>
        </div>
      )}

      {quiz.status === "done" && (
        <div>
          <div style={{ color: "white", fontWeight: 1000 }}>Quiz completato</div>
          <div style={{ height: 8 }} />
          <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: 900 }}>
            Risposte corrette: {quiz.correct}/{quiz.questions.length}
          </div>
          <div style={{ height: 10 }} />

          {quiz.history.filter((h) => h.selected !== h.answer).length > 0 && (
            <div style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.18)",
              color: "rgba(255,255,255,0.9)",
            }}>
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>Correzione errori</div>
              <div style={{ display: "grid", gap: 10 }}>
                {quiz.history
                  .filter((h) => h.selected !== h.answer)
                  .map((h) => (
                    <div key={h.id} style={{
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                    }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{h.q}</div>
                      <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.35 }}>
                        Tua risposta: <span style={{ fontWeight: 900 }}>{h.selected >= 0 ? h.options[h.selected] : "(nessuna)"}</span>
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.35, marginTop: 2 }}>
                        Corretta: <span style={{ fontWeight: 1000 }}>{h.options[h.answer]}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div style={{ height: 10 }} />
          <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 900, fontSize: 13 }}>
            Premio: {(() => {
              const cfg = quiz.mode === "giornaliero" ? ECONOMY.daily : ECONOMY.weekly;
              const completion = cfg.completionBonus;
              const perfect = quiz.correct === quiz.questions.length ? cfg.perfectBonus : 0;
              return quiz.correct * cfg.perCorrect + completion + perfect;
            })()} pillole

          </div>
          <div style={{ height: 10 }} />
          <button
            type="button"
            onClick={claimQuizReward}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,210,90,0.20)",
              color: "white",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            Riscatta pillole
          </button>
        </div>
      )}
    </div>

    <div style={{ height: 12 }} />

    <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
      Nota: i quiz sono pensati come mini-gioco didattico e non sostituiscono protocolli/linee guida locali.
    </div>
  </div>
)}

      {modalCard && <Modal card={modalCard} />}
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Tutte");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const favoritesCount = favorites.size;

  const [profile, setProfile] = useState<UserProfile | null>(null);
const [isEditingProfile, setIsEditingProfile] = useState(false);
const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [profileDraftName, setProfileDraftName] = useState("");
  const [profileDraftEmail, setProfileDraftEmail] = useState("");
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = safeJsonParse<UserProfile | null>(localStorage.getItem(LS_PROFILE), null);
    setProfile(p);
  }, []);

  const saveProfile = (p: UserProfile | null) => {
    if (typeof window === "undefined") return;
    if (!p) {
      localStorage.removeItem(LS_PROFILE);
      setProfile(null);
      return;
    }
    localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    setProfile(p);
  };

  const loadStats = () => {
    if (typeof window === "undefined") {
      return { pills: 0, unlocked: 0, totalCopies: 0, duplicates: 0, dailyDone: false, weeklyDone: false, lastPulls: 0 };
    }
    const pills = Number(localStorage.getItem(LS_PILLS) || "0") || 0;
    const collection = safeJsonParse<Record<string, number>>(localStorage.getItem(LS_COLLECTION), {});
    const unlocked = Object.values(collection).filter((n) => n >= 1).length;
    const totalCopies = Object.values(collection).reduce((a, b) => a + (Number(b) || 0), 0);
    const duplicates = Object.values(collection).reduce((a, b) => a + Math.max(0, (Number(b) || 0) - 1), 0);
    const dailyDone = localStorage.getItem(LS_QUIZ_DAILY_DONE) === "1";
    const weeklyDone = localStorage.getItem(LS_QUIZ_WEEKLY_DONE) === "1";
    const lastPulls = safeJsonParse<any[]>(localStorage.getItem(LS_RECENT_PULLS), []).length;
    return { pills, unlocked, totalCopies, duplicates, dailyDone, weeklyDone, lastPulls };
  };

  type TabKey = "home" | "contenuti" | "carte" | "profilo";
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  useEffect(() => {
    // Home resta sempre default, ma se arriva un deep-link tipo /#contenuti lo rispettiamo
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "").trim() as TabKey;

    const allowed: TabKey[] = ["home", "contenuti", "carte", "profilo"];
    if (allowed.includes(hash) && hash !== "home") {
      setActiveTab(hash);
    }
  }, []);

  // Se sei in "solo preferiti" e diventano 0, esci automaticamente
  useEffect(() => {
    if (onlyFavorites && favorites.size === 0) {
      setOnlyFavorites(false);
    }
  }, [onlyFavorites, favorites]);

  // Carica CSV contenuti
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/contenuti.csv", { cache: "no-store" });
        const text = await res.text();
        const parsed = parseCSV(text) as ContentItem[];
        setItems(parsed);
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, []);

  // Carica preferiti da localStorage (una sola volta)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nd_favorites");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      setFavorites(new Set(arr));
    } catch (e) {
      console.error("Errore lettura preferiti", e);
    }
  }, []);

  // Salva preferiti in localStorage (ogni volta che cambiano)
  useEffect(() => {
    try {
      localStorage.setItem("nd_favorites", JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.error("Errore salvataggio preferiti", e);
    }
  }, [favorites]);

  useEffect(() => {
    // Se cambio categoria mentre sono in onlyFavorites, resetto la query
    // per evitare combinazioni troppo restrittive.
    if (onlyFavorites && query.length > 0) {
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const categorie = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const c = safe(i.categoria).trim();
      if (c) set.add(c);
    });
    return ["Tutte", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((i) => {
      const catOk = categoria === "Tutte" || safe(i.categoria) === categoria;
      const favOk = !onlyFavorites || favorites.has(safe(i.id));

      const hay = `${safe(i.titolo)} ${safe(i.descrizione)} ${safe(i.tag)} ${safe(i.tipo)}`.toLowerCase();
      const qOk = !q || hay.includes(q);

      return catOk && qOk && favOk;
    });
  }, [items, query, categoria, onlyFavorites, favorites]);

  const favoriteItems = useMemo(() => {
    return filtered.filter((i) => favorites.has(safe(i.id)));
  }, [filtered, favorites]);

  const otherItems = useMemo(() => {
    return filtered.filter((i) => !favorites.has(safe(i.id)));
  }, [filtered, favorites]);

  const ContenutiView = (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          marginBottom: 18,
          paddingTop: 8,
          paddingBottom: 12,
          background: "rgba(10,12,18,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/logo.png"
              alt="NurseDiary"
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                objectFit: "cover",
                background: "rgba(255,255,255,0.10)",
                padding: 6,
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            />
            <h1
              style={{
                margin: 0,
                letterSpacing: -0.3,
                background: "linear-gradient(90deg, rgba(91,217,255,1), rgba(165,110,255,1))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                boxShadow: "0 8px 30px rgba(91,217,255,0.25)",
              }}
            >
              NurseDiary
            </h1>
          </div>

          <p style={{ margin: 0, opacity: 0.75, lineHeight: 1.35 }}>
            Biblioteca rapida di contenuti infermieristici. Cerca per titolo/tag e filtra per categoria.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <div style={{ position: "relative", flex: "1 1 280px" }}>
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca (es. ECG, PEA, accesso venoso...)"
                style={{
                  width: "100%",
                  padding: "12px 36px 12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  outline: "none",
                }}
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Cancella ricerca"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "white",
                    opacity: 0.9,
                    fontSize: 16,
                  }}
                >
                  鉁�
                </button>
              )}
            </div>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.18)",
                color: "white",
                outline: "none",
                flex: "0 0 180px",
              }}
              aria-label="Seleziona categoria"
            >
              {categorie.map((c) => (
                <option key={c} value={c} style={{ color: "black" }}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              disabled={favoritesCount === 0}
              aria-pressed={onlyFavorites}
              title={favoritesCount === 0 ? "Nessun preferito" : "Mostra solo preferiti"}
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: onlyFavorites ? "rgba(255,210,90,0.20)" : "rgba(0,0,0,0.18)",
                color: "white",
                outline: "none",
                cursor: favoritesCount === 0 ? "not-allowed" : "pointer",
                opacity: favoritesCount === 0 ? 0.55 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              猸� Preferiti <span style={{ opacity: 0.85 }}>({favoritesCount})</span>
            </button>
          </div>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          paddingTop: 10,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              padding: 16,
              background: "rgba(255,255,255,0.04)",
              opacity: 0.9,
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 8 }}>Nessun contenuto trovato.</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Prova a cambiare categoria o a rimuovere filtri/ricerca.
            </div>
          </div>
        ) : (
          <>
            {favoriteItems.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 16 }}>猸� Preferiti</h2>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{favoriteItems.length}</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  {favoriteItems.map((it) => (
                    <ContentCard
                      key={safe(it.id)}
                      item={it}
                      isFavorite={favorites.has(safe(it.id))}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                    opacity: 0.85,
                  }}
                />
              </div>
            )}

            {otherItems.map((it) => (
              <ContentCard
                key={safe(it.id)}
                item={it}
                isFavorite={favorites.has(safe(it.id))}
                onToggleFavorite={toggleFavorite}
              />
            ))}

            {otherItems.length === 0 && favoriteItems.length > 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  borderRadius: 16,
                  padding: 14,
                  opacity: 0.9,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                Nessun altro contenuto oltre ai preferiti.
              </div>
            )}
          </>
        )}
      </section>
    </>
  );

  const HomeView = (
    <section style={{ paddingTop: 6 }}>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 18,
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(91,217,255,0.10)",
              fontSize: 22,
            }}
          >
            鉁�
          </div>
          <div>
            <h2 style={{ margin: 0, letterSpacing: -0.2 }}>Benvenuto in NurseDiary</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.8, lineHeight: 1.35 }}>
              Una biblioteca rapida di contenuti infermieristici: cerca, salva i preferiti e costruisci la tua raccolta.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <span
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              opacity: 0.9,
            }}
          >
            Contenuti: <strong style={{ fontWeight: 700 }}>{items.length}</strong>
          </span>

          <span
            style={{
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,210,90,0.12)",
              opacity: 0.95,
            }}
          >
            Preferiti: <strong style={{ fontWeight: 700 }}>{favorites.size}</strong>
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("contenuti");
              setTimeout(() => {
                const el = document.querySelector('input[type="search"]') as HTMLInputElement | null;
                el?.focus();
              }, 50);
            }}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(91,217,255,0.18)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> Trova subito quello che ti serve</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Apri la ricerca e inizia a digitare (ECG, PEA, accessi venosi鈥�).
            </div>
          </button>

          {favorites.size === 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab("contenuti")}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.18)",
                color: "white",
                borderRadius: 16,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>猸� Crea la tua libreria</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Aggiungi i primi preferiti per ritrovarli al volo.
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTab("contenuti");
                setOnlyFavorites(true);
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,210,90,0.14)",
                color: "white",
                borderRadius: 16,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 800, letterSpacing: -0.1 }}>猸� Apri i tuoi preferiti</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Vai direttamente alla sezione 鈥淧referiti鈥� gi脿 filtrata.
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("carte")}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(165,110,255,0.16)",
              color: "white",
              borderRadius: 16,
              padding: "12px 14px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: -0.1 }}> Scopri la collezione</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Le carte arriveranno a breve: prepara lo spazio per la raccolta.
            </div>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, lineHeight: 1.35 }}>
        Suggerimento: usa 猸� nei contenuti per creare una 鈥渓ista rapida鈥� delle cose che ti servono pi霉 spesso.
      </div>
    </section>
  );

  const CarteView = <CarteTab />;

  const ProfiloView = (() => {
    const s = loadStats();

    const cardStyle: React.CSSProperties = {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(10,12,18,0.60)",
      borderRadius: 18,
      padding: 14,
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
    };

    const pillPill: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.22)",
      fontWeight: 900,
      fontSize: 14,
    };

    const smallLabel: React.CSSProperties = { fontSize: 12, opacity: 0.75, fontWeight: 800 };

    return (
      <section style={{ paddingTop: 6, paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Profilo</h2>
          <div style={pillPill}>
            <span aria-hidden></span>
            <span>{s.pills}</span>
          </div>
        </div>

        {!profile ? (
          <div style={{ ...cardStyle }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Crea un profilo</div>
            <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35, marginBottom: 12 }}>
              Serve solo per salvare progressi (carte, pillole, quiz). Nessuna complessit脿: puoi aggiungere l鈥檈mail pi霉 avanti.
            </div>

            <label style={{ display: "block", ...smallLabel }}>Nome / Nickname</label>
            <input
              value={profileDraftName}
              onChange={(e) => setProfileDraftName(e.target.value)}
              placeholder="Es. NurseMario"
              style={{
                width: "100%",
                marginTop: 6,
                marginBottom: 10,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                fontWeight: 800,
              }}
            />

            <label style={{ display: "block", ...smallLabel }}>Email (opzionale)</label>
            <input
              value={profileDraftEmail}
              onChange={(e) => setProfileDraftEmail(e.target.value)}
              placeholder="email@esempio.it"
              inputMode="email"
              style={{
                width: "100%",
                marginTop: 6,
                marginBottom: 12,
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "white",
                outline: "none",
                fontWeight: 700,
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 1000,
                }}
              >
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDataUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ opacity: 0.9 }}>{(profileDraftName.trim() || "ND").slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <label style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ ...smallLabel, marginBottom: 6 }}>Immagine profilo (opzionale)</div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "block", width: "100%", color: "rgba(255,255,255,0.8)" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setAvatarDataUrl(String(reader.result || ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>


            <button
              type="button"
              onClick={() => {
                const name = profileDraftName.trim();
                if (!name) return;
                saveProfile({
                  id: uid("nd"),
                  displayName: name,
                  email: profileDraftEmail.trim() || undefined,
                  createdAt: Date.now(),
                  avatarDataUrl: avatarDataUrl || undefined,
                });
                setProfileDraftName("");
                setProfileDraftEmail("");
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.10)",
                color: "white",
                fontWeight: 900,
              }}
            >
              Crea profilo
            </button>
          </div>
        ) : (
          <>
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 1000,
                      flex: "0 0 auto",
                    }}
                  >
                    {profile.avatarDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarDataUrl}
                        alt="Avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ opacity: 0.9 }}>{profile.displayName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, fontSize: 18, lineHeight: 1.15 }}>{profile.displayName}</div>
                    <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                      {profile.email ? profile.email : "Email non impostata"} 鈥� Iscritto:{" "}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true);
                    setProfileDraftName(profile.displayName);
                    setProfileDraftEmail(profile.email || "");
                    setAvatarDataUrl(profile.avatarDataUrl || null);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.18)",
                    color: "white",
                    fontWeight: 900,
                    flex: "0 0 auto",
                  }}
                >
                  Modifica
                </button>
              </div>
</div>

            {isEditingProfile && (
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Modifica profilo</div>

                <label style={{ display: "block", ...smallLabel }}>Nome / Nickname</label>
                <input
                  value={profileDraftName}
                  onChange={(e) => setProfileDraftName(e.target.value)}
                  placeholder="Nome"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    marginBottom: 10,
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                    outline: "none",
                    fontWeight: 800,
                  }}
                />

                <label style={{ display: "block", ...smallLabel }}>Email (opzionale)</label>
                <input
                  value={profileDraftEmail}
                  onChange={(e) => setProfileDraftEmail(e.target.value)}
                  placeholder="email@esempio.it"
                  inputMode="email"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    marginBottom: 12,
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(0,0,0,0.25)",
                    color: "white",
                    outline: "none",
                    fontWeight: 700,
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 1000,
                    }}
                  >
                    {avatarDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarDataUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ opacity: 0.9 }}>{(profileDraftName.trim() || "ND").slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <label style={{ flex: 1, cursor: "pointer" }}>
                    <div style={{ ...smallLabel, marginBottom: 6 }}>Aggiorna immagine</div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "block", width: "100%", color: "rgba(255,255,255,0.8)" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setAvatarDataUrl(String(reader.result || ""));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const name = profileDraftName.trim();
                      if (!name) return;
                      saveProfile({
                        ...profile,
                        displayName: name,
                        email: profileDraftEmail.trim() || undefined,
                        avatarDataUrl: avatarDataUrl || undefined,
                      });
                      setIsEditingProfile(false);
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(91,217,255,0.18)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Salva
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(0,0,0,0.18)",
                      color: "white",
                      fontWeight: 900,
                    }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
              <div style={cardStyle}>
                <div style={smallLabel}>Carte sbloccate</div>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>{s.unlocked}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Copie totali: {s.totalCopies}</div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Doppioni</div>
                <div style={{ fontWeight: 1000, fontSize: 20 }}>{s.duplicates}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>Bruciali in 鈥淪cambia鈥�</div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Quiz giornaliero</div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 4 }}>{s.dailyDone ? "OK completato" : "Da fare da fare"}</div>
              </div>
              <div style={cardStyle}>
                <div style={smallLabel}>Quiz settimanale</div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 4 }}>{s.weeklyDone ? "OK completato" : "Da fare da fare"}</div>
              </div>
            </div>

            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Backup dati</div>
              <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35, marginBottom: 10 }}>
                Utile se cambi telefono: esporta e incolla qui per ripristinare. (Solo localStorage, nessun server.)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window === "undefined") return;
                    const payload = {
                      profile: safeJsonParse(localStorage.getItem(LS_PROFILE), null),
                      pills: localStorage.getItem(LS_PILLS),
                      collection: safeJsonParse(localStorage.getItem(LS_COLLECTION), {}),
                      recentPulls: safeJsonParse(localStorage.getItem(LS_RECENT_PULLS), []),
                      favorites: safeJsonParse(localStorage.getItem("nd_favorites"), []),
                      dailyDone: localStorage.getItem(LS_QUIZ_DAILY_DONE),
                      weeklyDone: localStorage.getItem(LS_QUIZ_WEEKLY_DONE),
                    };
                    const str = JSON.stringify(payload);
                    try {
                      await navigator.clipboard.writeText(str);
                      alert("Backup copiato negli appunti OK");
                    } catch {
                      setImportJson(str);
                      alert("Non posso copiare negli appunti: ho messo il backup nel box qui sotto OK");
                    }
                  }}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.10)",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  Esporta
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window === "undefined") return;
                    const payload = safeJsonParse<any>(importJson, null);
                    if (!payload) {
                      alert("JSON non valido 鉂�");
                      return;
                    }
                    if (payload.profile) localStorage.setItem(LS_PROFILE, JSON.stringify(payload.profile));
                    if (typeof payload.pills !== "undefined") localStorage.setItem(LS_PILLS, String(payload.pills));
                    if (payload.collection) localStorage.setItem(LS_COLLECTION, JSON.stringify(payload.collection));
                    if (payload.recentPulls) localStorage.setItem(LS_RECENT_PULLS, JSON.stringify(payload.recentPulls));
                    if (payload.favorites) localStorage.setItem("nd_favorites", JSON.stringify(payload.favorites));
                    if (typeof payload.dailyDone !== "undefined") localStorage.setItem(LS_QUIZ_DAILY_DONE, String(payload.dailyDone));
                    if (typeof payload.weeklyDone !== "undefined") localStorage.setItem(LS_QUIZ_WEEKLY_DONE, String(payload.weeklyDone));
                    // ricarica stato
                    const p = safeJsonParse<UserProfile | null>(localStorage.getItem(LS_PROFILE), null);
                    setProfile(p);
                    alert("Backup importato OK");
                  }}
                  style={{
                    padding: "12px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(0,0,0,0.22)",
                    color: "white",
                    fontWeight: 900,
                  }}
                >
                  Importa
                </button>
              </div>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Incolla qui il backup JSON鈥�"
                rows={5}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "white",
                  outline: "none",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ ...cardStyle }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Premium (bozza)</div>
              <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.35 }}>
                In futuro: sincronizzazione cloud, pi霉 espansioni carte, quiz avanzati e raccolte 鈥減ocket鈥�. Per ora tutto resta free.
              </div>
            </div>
          </>
        )}
      </section>
    );
  })();

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return HomeView;
      case "contenuti":
        return ContenutiView;
      case "carte":
        return CarteView;
      case "profilo":
        return ProfiloView;
      default:
        return HomeView;
    }
  };

  return (
    <main
      style={{
        backgroundImage: "url('/background-main.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        borderRadius: 24,
        maxWidth: 1080,
        margin: "0 auto",
        padding: "28px 16px 110px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* overlay per leggibilit脿 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,12,18,0.72), rgba(10,12,18,0.55))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>{renderActiveTab()}</div>

      <nav
        aria-label="Navigazione principale"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 14,
          width: "min(1080px, calc(100% - 24px))",
          zIndex: 50,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: 10,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {([
          ["home", "", "Home"],
          ["contenuti", "", "Contenuti"],
          ["carte", "", "Carte"],
          ["profilo", "", "Profilo"],
        ] as const).map(([key, icon, label]) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: isActive ? "rgba(91,217,255,0.18)" : "rgba(255,255,255,0.06)",
                color: "white",
                borderRadius: 14,
                padding: "10px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              {isActive && <span style={{ fontSize: 13, opacity: 0.95 }}>{label}</span>}
            </button>
          );
        })}
      </nav>
    </main>
  );
}