import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { supabase } from "./supabase";

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

const MAX_ITEMS = 200; // hard cap — DoS/quota protection

export const coverOverrideSchema = urlSchema;

export function useLibrary() {
  const [items, setItems] = useState<Item[]>([]);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setItems(data as Item[]);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    window.addEventListener("library:changed", fetchItems);
    return () => window.removeEventListener("library:changed", fetchItems);
  }, [fetchItems]);

  const add = async (input: unknown) => {
    const parsed = itemSchema.parse(input);
    if (items.length >= MAX_ITEMS) throw new Error("Достигнут лимит записей");
    const item: Item = { ...parsed, id: crypto.randomUUID() };
    const { error } = await supabase.from("items").insert([item]);
    if (error) {
      console.error("Supabase insert error (items):", error);
      throw new Error(`Ошибка БД: ${error.message}`);
    }
    window.dispatchEvent(new Event("library:changed"));
    return item;
  };

  const remove = async (id: string) => {
    await supabase.from("items").delete().eq("id", id);
    await supabase.from("episodes").delete().eq("animeId", id);
    window.dispatchEvent(new Event("library:changed"));
    window.dispatchEvent(new Event("library:episodes:changed"));
  };

  return { items, add, remove, MAX_ITEMS };
}

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const fetchEpisodes = useCallback(async () => {
    const { data, error } = await supabase.from("episodes").select("*").order("episode", { ascending: true });
    if (!error && data) {
      setEpisodes(data as Episode[]);
    }
  }, []);

  useEffect(() => {
    fetchEpisodes();
    window.addEventListener("library:episodes:changed", fetchEpisodes);
    return () => window.removeEventListener("library:episodes:changed", fetchEpisodes);
  }, [fetchEpisodes]);

  const addEpisode = async (input: unknown) => {
    const parsed = episodeSchema.parse(input);
    const ep: Episode = { ...parsed, id: crypto.randomUUID() };
    const { error } = await supabase.from("episodes").insert([ep]);
    if (error) {
      console.error("Supabase insert error (episodes):", error);
      throw new Error(`Ошибка БД: ${error.message}`);
    }
    window.dispatchEvent(new Event("library:episodes:changed"));
    return ep;
  };

  const removeEpisode = async (id: string) => {
    await supabase.from("episodes").delete().eq("id", id);
    window.dispatchEvent(new Event("library:episodes:changed"));
  };

  const getForAnime = (animeId: string) =>
    episodes
      .filter((e) => e.animeId === animeId)
      .sort((a, b) => a.episode - b.episode);

  return { episodes, addEpisode, removeEpisode, getForAnime };
}

export function useCoverOverrides() {
  const [covers, setCovers] = useState<Record<string, string>>({});

  const fetchCovers = useCallback(async () => {
    const { data, error } = await supabase.from("covers").select("*");
    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach((row: { animeId: string; url: string }) => {
        map[row.animeId] = row.url;
      });
      setCovers(map);
    }
  }, []);

  useEffect(() => {
    fetchCovers();
    window.addEventListener("library:covers:changed", fetchCovers);
    return () => window.removeEventListener("library:covers:changed", fetchCovers);
  }, [fetchCovers]);

  const setCover = async (animeId: string, url: string) => {
    if (!animeId || animeId.length > 100) throw new Error("Неверный id");
    const parsed = coverOverrideSchema.parse(url);
    const { error } = await supabase.from("covers").upsert({ animeId, url: parsed });
    if (error) {
      console.error("Supabase upsert error:", error);
      throw new Error(`Ошибка БД: ${error.message}`);
    }
    window.dispatchEvent(new Event("library:covers:changed"));
  };

  const clearCover = async (animeId: string) => {
    await supabase.from("covers").delete().eq("animeId", animeId);
    window.dispatchEvent(new Event("library:covers:changed"));
  };

  return { covers, setCover, clearCover };
}
