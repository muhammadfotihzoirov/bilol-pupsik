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

const KEY = "neoanime:library:v1";
const MAX_ITEMS = 200; // hard cap — DoS/quota protection

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
  };

  return { items, add, remove, MAX_ITEMS };
}
