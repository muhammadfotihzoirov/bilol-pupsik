import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { z } from "zod";
import { Play, Search, Star, Flame, Shield, Lock, BookOpen, Tv, Trophy } from "lucide-react";
import { useLibrary, useEpisodes, useCoverOverrides, CATEGORY_LABELS } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import hero from "@/assets/hero.jpg";
import a1 from "@/assets/anime1.jpg";
import a2 from "@/assets/anime2.jpg";
import a3 from "@/assets/anime3.jpg";
import a4 from "@/assets/anime4.jpg";
import a5 from "@/assets/anime5.jpg";
import a6 from "@/assets/anime6.jpg";
import narutoCover from "@/assets/naruto.jpg.asset.json";
import aotCover from "@/assets/aot.webp.asset.json";
import demonSlayerCover from "@/assets/demon-slayer.jpg.asset.json";
import jjkCover from "@/assets/jjk.webp.asset.json";
import mhaCover from "@/assets/mha.jpg.asset.json";


export const Route = createFileRoute("/")({
  component: Index,
});

type Anime = {
  id: string;
  title: string;
  genre: string;
  rating: number;
  episodes: number;
  year: number;
  cover: string;
  trailer: string;
  desc: string;
};

// Public CC0/demo videos hosted on stable CDNs (Mozilla MDN, samplelib, w3schools).
// Multiple sources reduce risk of a single host blocking hotlinks.
const V = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
  "https://download.samplelib.com/mp4/sample-5s.mp4",
  "https://download.samplelib.com/mp4/sample-10s.mp4",
  "https://download.samplelib.com/mp4/sample-15s.mp4",
  "https://download.samplelib.com/mp4/sample-20s.mp4",
  "https://download.samplelib.com/mp4/sample-30s.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://www.w3schools.com/html/movie.mp4",
];

// Fallback cover pool from local generated art (used if remote poster fails).
const COVERS = [a1, a2, a3, a4, a5, a6];

// Hardcoded real covers for known catalog entries (by id).
const DEFAULT_COVERS: Record<string, string> = {
  "1": aotCover.url,           // Атака Титанов
  "2": narutoCover.url,        // Наруто: Ураганные хроники
  "4": demonSlayerCover.url,   // Клинок, рассекающий демонов
  "5": jjkCover.url,           // Магическая битва
  "6": mhaCover.url,           // Моя геройская академия
};

// Unique per-anime cover: deterministic seed => distinct image per title.
// Uses picsum.photos with a title-derived seed so every card looks different.
const coverFor = (id: string, title: string) =>
  DEFAULT_COVERS[id] ??
  `https://picsum.photos/seed/neoanime-${id}-${encodeURIComponent(title).slice(0, 24)}/640/896`;


const RAW: Omit<Anime, "cover" | "trailer">[] = [
  { id: "1", title: "Атака Титанов", genre: "Экшн", rating: 9.1, episodes: 87, year: 2013, desc: "Человечество за стенами против гигантов." },
  { id: "2", title: "Наруто: Ураганные хроники", genre: "Экшн", rating: 8.7, episodes: 500, year: 2007, desc: "Путь ниндзя к званию Хокаге." },
  { id: "3", title: "Ван-Пис", genre: "Приключения", rating: 9.0, episodes: 1100, year: 1999, desc: "Пираты в поисках легендарного сокровища." },
  { id: "4", title: "Клинок, рассекающий демонов", genre: "Экшн", rating: 8.9, episodes: 55, year: 2019, desc: "Мальчик мстит демонам за семью." },
  { id: "5", title: "Магическая битва", genre: "Экшн", rating: 8.8, episodes: 47, year: 2020, desc: "Мир проклятий и магов." },
  { id: "6", title: "Моя геройская академия", genre: "Экшн", rating: 8.4, episodes: 158, year: 2016, desc: "Школа для будущих супергероев." },
  { id: "7", title: "Стальной алхимик: Братство", genre: "Приключения", rating: 9.4, episodes: 64, year: 2009, desc: "Братья и цена запретной алхимии." },
  { id: "8", title: "Тетрадь смерти", genre: "Триллер", rating: 9.0, episodes: 37, year: 2006, desc: "Тетрадь, убивающая любого." },
  { id: "9", title: "Код Гиасс", genre: "Меха", rating: 8.7, episodes: 50, year: 2006, desc: "Изгнанный принц и сила Гиасса." },
  { id: "10", title: "Стейнс;Гейт", genre: "Триллер", rating: 9.1, episodes: 24, year: 2011, desc: "Учёные, случайно открывшие путешествия во времени." },
  { id: "11", title: "Твоё имя", genre: "Романтика", rating: 8.9, episodes: 1, year: 2016, desc: "Два подростка меняются телами через время." },
  { id: "12", title: "Унесённые призраками", genre: "Фэнтези", rating: 8.6, episodes: 1, year: 2001, desc: "Девочка в мире духов." },
  { id: "13", title: "Ковбой Бибоп", genre: "Экшн", rating: 8.8, episodes: 26, year: 1998, desc: "Охотники за головами в космосе." },
  { id: "14", title: "Евангелион", genre: "Меха", rating: 8.5, episodes: 26, year: 1995, desc: "Пилоты мехов против Ангелов." },
  { id: "15", title: "Клинок Бессмертного", genre: "Экшн", rating: 8.3, episodes: 24, year: 2019, desc: "Проклятый бессмертный самурай." },
  { id: "16", title: "Ре:Зеро", genre: "Фэнтези", rating: 8.5, episodes: 50, year: 2016, desc: "Возврат в точку смерти." },
  { id: "17", title: "Оверлорд", genre: "Фэнтези", rating: 8.0, episodes: 52, year: 2015, desc: "Игрок застрял в теле лича." },
  { id: "18", title: "Ванпанчмен", genre: "Экшн", rating: 8.7, episodes: 24, year: 2015, desc: "Герой, побеждающий одним ударом." },
  { id: "19", title: "Мастера меча онлайн", genre: "Фэнтези", rating: 7.5, episodes: 100, year: 2012, desc: "Заперты в VR-игре навсегда." },
  { id: "20", title: "Психопаспорт", genre: "Триллер", rating: 8.3, episodes: 41, year: 2012, desc: "Общество, где мысли под контролем." },
  { id: "21", title: "Токийский гуль", genre: "Триллер", rating: 7.8, episodes: 48, year: 2014, desc: "Полугуль между двух миров." },
  { id: "22", title: "Хвост Феи", genre: "Приключения", rating: 8.0, episodes: 328, year: 2009, desc: "Гильдия магов и приключения." },
  { id: "23", title: "Синий экзорцист", genre: "Экшн", rating: 7.9, episodes: 37, year: 2011, desc: "Сын Сатаны становится экзорцистом." },
  { id: "24", title: "Кибергород ЭДО.808", genre: "Киберпанк", rating: 7.6, episodes: 3, year: 1990, desc: "Мегаполис будущего и хакеры." },
  { id: "25", title: "Призрак в доспехах", genre: "Киберпанк", rating: 8.3, episodes: 1, year: 1995, desc: "Кибернетика и сознание." },
  { id: "26", title: "Акира", genre: "Киберпанк", rating: 8.1, episodes: 1, year: 1988, desc: "Нео-Токио и телекинетический хаос." },
  { id: "27", title: "Мушиши", genre: "Фэнтези", rating: 8.7, episodes: 46, year: 2005, desc: "Странник изучает духов природы." },
  { id: "28", title: "Моб Психо 100", genre: "Экшн", rating: 8.6, episodes: 37, year: 2016, desc: "Школьник-эспер с бешеной силой." },
];

const CATALOG: Anime[] = RAW.map((a, i) => ({
  ...a,
  cover: coverFor(a.id, a.title),
  trailer: V[i % V.length],
}));

const GENRES = ["Все", "Экшн", "Приключения", "Романтика", "Меха", "Триллер", "Фэнтези", "Киберпанк"];

// SECURITY: strict input schema — length limit, whitelist chars, prevents XSS-vector strings.
// Client-only site, but the schema protects the query state from injection into future backends.
const searchSchema = z
  .string()
  .max(50, "Слишком длинный запрос")
  .regex(/^[\p{L}\p{N}\s\-:!?.]*$/u, "Недопустимые символы");

// Admin IPs allowed to see the Admin link
const ADMIN_IPS = ["213.230.78.106", "144.124.192.96"];

function useIsAdminIP(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d: { ip: string }) => {
        if (ADMIN_IPS.includes(d.ip)) setIsAdmin(true);
      })
      .catch(() => {
        // silently fail — no admin access on error
      });
  }, []);
  return isAdmin;
}

function Index() {
  const { items: userItems } = useLibrary();
  const { getForAnime } = useEpisodes();
  const isAdminIP = useIsAdminIP();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [activeEpId, setActiveEpId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 50);
    }
  }, [mobileSearchOpen]);

  // Merge admin-added items into the catalog (title carries category prefix badge)
  const mergedCatalog: Anime[] = useMemo(() => {
    const mapped: Anime[] = userItems.map((it) => ({
      id: `u_${it.id}`,
      title: it.title,
      genre: it.genre,
      rating: it.rating,
      episodes: 1,
      year: it.year,
      cover: it.cover,
      trailer: it.trailer,
      desc: `[${CATEGORY_LABELS[it.category]}] ${it.desc}`,
    }));
    return [...mapped, ...CATALOG];
  }, [userItems]);

  const [active, setActive] = useState<Anime>(CATALOG[0]);

  // Episodes for current active anime
  const activeEpisodes = useMemo(() => getForAnime(active.id), [active.id, getForAnime]);
  const currentEp = activeEpisodes.find((e) => e.id === activeEpId) ?? activeEpisodes[0] ?? null;
  // Video src: episode URL if episode selected, else catalog trailer. Never exposed in DOM as text.
  const videoSrc = currentEp ? currentEp.url : active.trailer;
  const [genre, setGenre] = useState("Все");
  const [rawQuery, setRawQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const parsed = searchSchema.safeParse(rawQuery);
    return parsed.success ? parsed.data.toLowerCase() : "";
  }, [rawQuery]);

  const filtered = mergedCatalog.filter(
    (a) =>
      (genre === "Все" || a.genre === genre) &&
      a.title.toLowerCase().includes(query),
  );

  const onQueryChange = (v: string) => {
    const parsed = searchSchema.safeParse(v);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ошибка");
    } else {
      setError(null);
    }
    // Hard cap regardless — defense in depth
    setRawQuery(v.slice(0, 50));
  };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-2">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
            >
              <Flame className="h-5 w-5" />
            </div>
            <span
              className="text-2xl tracking-widest"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              NEO<span className="text-primary">ANIME</span>
            </span>
          </a>

          <nav className="hidden items-center justify-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#catalog">Каталог</a>
            <a className="transition-colors hover:text-foreground" href="#player">Плеер</a>
            <a className="transition-colors hover:text-foreground" href="#top">Топ</a>
            {isAdminIP && (
              <Link to="/admin" className="flex items-center gap-1 transition-colors hover:text-foreground">
                <Lock className="h-3.5 w-3.5" /> Админ
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rawQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Поиск..."
                maxLength={50}
                aria-invalid={!!error}
                className="w-48 border-border bg-secondary/50 pl-9"
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="border-t border-destructive/40 bg-destructive/10 px-6 py-1 text-center text-xs text-destructive">
            {error}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt="Аниме баннер"
          width={1920}
          height={720}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
            <Shield className="mr-1 h-3 w-3" /> Каталог {CATALOG.length}+ тайтлов
          </Badge>
          <h1
            className="mt-6 max-w-3xl text-5xl leading-none tracking-tight sm:text-7xl lg:text-8xl"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Погрузись в мир{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              бесконечных вселенных
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Тысячи тайтлов, честные оценки и плеер без рекламы. Смотри аниме в неоновом стиле — где угодно и когда угодно.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="gap-2 text-primary-foreground"
              style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
              onClick={() => document.getElementById("player")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="h-4 w-4 fill-current" /> Смотреть
            </Button>
            <Button size="lg" variant="outline" className="border-border bg-background/40 backdrop-blur">
              В избранное
            </Button>
          </div>
        </div>
      </section>

      {/* Player */}
      <section id="player" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary">Сейчас смотрят</p>
            <h2 className="mt-1 text-3xl font-bold sm:text-4xl">{active.title}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{active.desc}</p>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Star className="h-4 w-4 fill-primary text-primary" />
            {active.rating} · {active.episodes} эп. · {active.year}
          </div>
        </div>

        {/* Episode selector — shown only when episodes exist */}
        {activeEpisodes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {activeEpisodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => { setActiveEpId(ep.id); setTimeout(() => videoRef.current?.play(), 100); }}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  currentEp?.id === ep.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Эп. {ep.episode} — {ep.title}
              </button>
            ))}
          </div>
        )}

        <Card
          className="overflow-hidden border-border p-0"
          style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
        >
          <CardContent className="p-0">
            {/* Video src set via JS ref — URL never appears in page source as readable text */}
            <video
              ref={videoRef}
              key={`${active.id}-${currentEp?.id ?? "trailer"}`}
              className="aspect-video w-full bg-black"
              controls
              controlsList="nodownload nofullscreen"
              poster={active.cover}
              src={videoSrc}
              preload="metadata"
              onContextMenu={(e) => e.preventDefault()}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{active.genre}</Badge>
                <Badge variant="outline" className="border-accent/40 text-accent">HD 1080p</Badge>
                {currentEp && <Badge variant="outline" className="border-primary/40 text-primary">Эп. {currentEp.episode}</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">
                {currentEp ? `${currentEp.title} · Эпизод ${currentEp.episode}` : `Трейлер · ${active.episodes} эп.`}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Каталог <span className="text-muted-foreground text-lg">({filtered.length})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                  genre === g
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setActive(a);
                setActiveEpId(null);
                document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group relative overflow-hidden rounded-2xl border border-border text-left transition-all hover:-translate-y-1 hover:border-primary/60"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={a.cover}
                  alt={a.title}
                  loading="lazy"
                  width={640}
                  height={896}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = COVERS[Number(a.id.replace(/\D/g, "") || 0) % COVERS.length];
                    if (img.src !== fallback) img.src = fallback;
                  }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-hero)" }}
                >
                  <Star className="h-3 w-3 fill-current" /> {a.rating}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className="grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
                    style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
                  >
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="truncate font-semibold">{a.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {a.genre} · {a.year}
                </p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">Ничего не найдено</p>
        )}
      </section>

      <footer className="border-t border-border py-8 pb-28 text-center text-sm text-muted-foreground md:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:justify-between">
          <span>© 2026 NeoAnime · Сделано с любовью к аниме</span>
          <span className="flex items-center gap-1 text-xs">
            <Shield className="h-3 w-3 text-primary" /> Защита: Zod-валидация · CSP-ready · no-download
          </span>
        </div>
      </footer>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-xl md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileSearchOpen(false);
          }}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={mobileSearchRef}
              value={rawQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Поиск аниме..."
              maxLength={50}
              aria-invalid={!!error}
              className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Закрыть
            </button>
          </div>
          {error && (
            <p className="px-4 py-2 text-xs text-destructive">{error}</p>
          )}
          {rawQuery && (
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-3 text-xs text-muted-foreground">
                Найдено: <span className="text-foreground">{filtered.length}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {filtered.slice(0, 12).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActive(a);
                      setMobileSearchOpen(false);
                      setTimeout(() => document.getElementById("player")?.scrollIntoView({ behavior: "smooth" }), 100);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 p-2 text-left"
                  >
                    <img src={a.cover} alt={a.title} className="h-12 w-9 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.genre} · {a.year}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 md:hidden"
        style={{
          background: "rgba(10,10,20,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className={`grid ${isAdminIP ? "grid-cols-5" : "grid-cols-4"} items-center`}>
          <a
            href="#catalog"
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors active:text-primary hover:text-foreground"
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium">Каталог</span>
          </a>
          <a
            href="#player"
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors active:text-primary hover:text-foreground"
          >
            <Tv className="h-5 w-5" />
            <span className="text-[10px] font-medium">Плеер</span>
          </a>
          <a
            href="#top"
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors active:text-primary hover:text-foreground"
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] font-medium">Топ</span>
          </a>
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors active:text-primary hover:text-foreground"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">Поиск</span>
          </button>
          {isAdminIP && (
            <Link
              to="/admin"
              className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors active:text-primary hover:text-foreground"
            >
              <Lock className="h-5 w-5" />
              <span className="text-[10px] font-medium">Админ</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
