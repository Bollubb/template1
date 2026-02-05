import Head from "next/head";
import React, { useEffect, useMemo, useState } from "react";

import Page from "../layouts/Page";
import Section from "../layouts/Section";
import styles from "../styles/Home.module.css";

import { ContentCard } from "../components/nursediary/ContentCard";
import { CarteTab } from "../components/nursediary/CarteTab";
import NurseBottomNav, { type NurseTab } from "../components/nursediary/NurseBottomNav";

import type { ContentItem } from "../types/nursediary/types";
import { fetchContentItems } from "../utils/nursediary/contentCsv";

const safe = (v: unknown) => (v == null ? "" : String(v));

const LS = {
  favorites: "nd_favorites",
  read: "nd_read",
  pills: "nd_pills",
  packCost: "nd_pack_cost",
} as const;

export default function Home(): JSX.Element {
  const [activeTab, setActiveTab] = useState<NurseTab>("home");

  // Didattica data
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categoria, setCategoria] = useState("Tutte");

  // Search + filters
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [sortMode, setSortMode] = useState<"rilevanza" | "az" | "categoria" | "preferiti">("rilevanza");

  // Favorites storage
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Letto / non letto (Didattica)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Cards economy (base)
  const [pills, setPills] = useState<number>(0);
  const [packCost, setPackCost] = useState<number>
