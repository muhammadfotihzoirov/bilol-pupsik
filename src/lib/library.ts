import { useEffect, useState } from "react";
import { z } from "zod";

export type Category = "anime" | "series" | "movie";

export const CATEGORY_LABELS: Record<Category, string> = {
  anime: "Аниме",
  series: "Сериалы",
  movie: "Кино",
};

export const CATEGORIES: Category[] = ["anime", "series", "movie"];

export type Item = {
  id: string;
  category: Category;
  title: string;
  genre: string;
  year: number;
  rating: number;
  desc: string;
  cover: string; // URL
  trailer: string; // URL
};

export type Episode = {
  id: string;
  animeId: string; // can be catalog ID like "1" or library item id
  episode: number;
  title: string;
  url: string; // hidden video URL
};

// SECURITY: strict schema — bounded lengths, safe URL scheme, whitelist chars
const urlSchema = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => /^https:\/\//i.test(u), "Только https URL");

export const itemSchema = z.object({
  category: z.enum(["anime", "series", "movie"]),
  title: z.string().trim().min(1).max(100),
  genre: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[\p{L}\p{N}\s\-]+$/u, "Недопустимые символы"),
  year: z.number().int().min(1900).max(2100),
  rating: z.number().min(0).max(10),
  desc: z.string().trim().max(400),
  cover: urlSchema,
  trailer: urlSchema,
});

export const episodeSchema = z.object({
  animeId: z.string().min(1).max(100),
  episode: z.number().int().min(1).max(9999),
  title: z.string().trim().min(1).max(100),
  url: urlSchema,
});

const KEY = "neoanime:library:v1";
const EP_KEY = "neoanime:episodes:v1";
const COVER_KEY = "neoanime:covers:v1";
const MAX_ITEMS = 200; // hard cap — DoS/quota protection
const MAX_EPISODES = 2000;
const MAX_COVERS = 500;

export const coverOverrideSchema = urlSchema;


function read(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(items: Item[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event("library:changed"));
}

function readEpisodes(): Episode[] {
  try {
    const raw = localStorage.getItem(EP_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_EPISODES);
  } catch {
    return [];
  }
}

function writeEpisodes(eps: Episode[]) {
  localStorage.setItem(EP_KEY, JSON.stringify(eps.slice(0, MAX_EPISODES)));
  window.dispatchEvent(new Event("library:episodes:changed"));
}

export function useLibrary() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener("library:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("library:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = (input: unknown) => {
    const parsed = itemSchema.parse(input);
    const current = read();
    if (current.length >= MAX_ITEMS) throw new Error("Достигнут лимит записей");
    const item: Item = { ...parsed, id: crypto.randomUUID() };
    write([item, ...current]);
    return item;
  };

  const remove = (id: string) => {
    write(read().filter((i) => i.id !== id));
    // also remove episodes for this item
    writeEpisodes(readEpisodes().filter((e) => e.animeId !== id));
  };

  return { items, add, remove, MAX_ITEMS };
}

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    setEpisodes(readEpisodes());
    const onChange = () => setEpisodes(readEpisodes());
    window.addEventListener("library:episodes:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("library:episodes:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const addEpisode = (input: unknown) => {
    const parsed = episodeSchema.parse(input);
    const current = readEpisodes();
    if (current.length >= MAX_EPISODES) throw new Error("Достигнут лимит эпизодов");
    const ep: Episode = { ...parsed, id: crypto.randomUUID() };
    writeEpisodes([...current, ep]);
    return ep;
  };

  const removeEpisode = (id: string) => {
    writeEpisodes(readEpisodes().filter((e) => e.id !== id));
  };

  const getForAnime = (animeId: string) =>
    episodes
      .filter((e) => e.animeId === animeId)
      .sort((a, b) => a.episode - b.episode);

  return { episodes, addEpisode, removeEpisode, getForAnime };
}

// Cover overrides — map animeId -> https URL. Used to change catalog covers.
function readCovers(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COVER_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as Record<string, string>;
  } catch {
    return {};
  }
}

function writeCovers(covers: Record<string, string>) {
  const keys = Object.keys(covers).slice(0, MAX_COVERS);
  const trimmed: Record<string, string> = {};
  for (const k of keys) trimmed[k] = covers[k];
  localStorage.setItem(COVER_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new Event("library:covers:changed"));
}

export function useCoverOverrides() {
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    setCovers(readCovers());
    const onChange = () => setCovers(readCovers());
    window.addEventListener("library:covers:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("library:covers:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setCover = (animeId: string, url: string) => {
    if (!animeId || animeId.length > 100) throw new Error("Неверный id");
    const parsed = coverOverrideSchema.parse(url);
    const current = readCovers();
    writeCovers({ ...current, [animeId]: parsed });
  };

  const clearCover = (animeId: string) => {
    const current = readCovers();
    delete current[animeId];
    writeCovers(current);
  };

  return { covers, setCover, clearCover };
}

