import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Shield,
  Trash2,
  Plus,
  ArrowLeft,
  Film,
  Tv,
  BookOpen,
  Star,
  Package,
  Image,
  Video,
  AlignLeft,
  Hash,
  Calendar,
  Tag,
  ChevronRight,
  X,
  ListVideo,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useLibrary,
  useEpisodes,
  useCoverOverrides,
  itemSchema,
  episodeSchema,
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type Item,
} from "@/lib/library";


// Catalog anime titles (static list for episode assignment)
const CATALOG_ANIME: { id: string; title: string }[] = [
  { id: "1", title: "Атака Титанов" },
  { id: "2", title: "Наруто: Ураганные хроники" },
  { id: "3", title: "Ван-Пис" },
  { id: "4", title: "Клинок, рассекающий демонов" },
  { id: "5", title: "Магическая битва" },
  { id: "6", title: "Моя геройская академия" },
  { id: "7", title: "Стальной алхимик: Братство" },
  { id: "8", title: "Тетрадь смерти" },
  { id: "9", title: "Код Гиасс" },
  { id: "10", title: "Стейнс;Гейт" },
  { id: "11", title: "Твоё имя" },
  { id: "12", title: "Унесённые призраками" },
  { id: "13", title: "Ковбой Бибоп" },
  { id: "14", title: "Евангелион" },
  { id: "15", title: "Клинок Бессмертного" },
  { id: "16", title: "Ре:Зеро" },
  { id: "17", title: "Оверлорд" },
  { id: "18", title: "Ванпанчмен" },
  { id: "19", title: "Мастера меча онлайн" },
  { id: "20", title: "Психопаспорт" },
  { id: "21", title: "Токийский гуль" },
  { id: "22", title: "Хвост Феи" },
  { id: "23", title: "Синий экзорцист" },
  { id: "24", title: "Кибергород ЭДО.808" },
  { id: "25", title: "Призрак в доспехах" },
  { id: "26", title: "Акира" },
  { id: "27", title: "Мушиши" },
  { id: "28", title: "Моб Психо 100" },
];

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Админ · NEOANIME" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const CATEGORY_ICONS: Record<Category, typeof Film> = {
  anime: BookOpen,
  series: Tv,
  movie: Film,
};

const CATEGORY_COLORS: Record<Category, string> = {
  anime: "from-violet-500 to-purple-600",
  series: "from-blue-500 to-cyan-600",
  movie: "from-orange-500 to-pink-600",
};

const emptyForm = {
  category: "anime" as Category,
  title: "",
  genre: "",
  year: new Date().getFullYear(),
  rating: 8,
  desc: "",
  cover: "",
  trailer: "",
};

const emptyEpForm = { animeId: "", episode: 1, title: "", url: "" };

// Allowed admin IPs
const ADMIN_IPS = ["213.230.78.106", "144.124.192.96"];

function useAdminGate(): "loading" | "allowed" | "denied" {
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d: { ip: string }) => {
        setState(ADMIN_IPS.includes(d.ip) ? "allowed" : "denied");
      })
      .catch(() => setState("denied"));
  }, []);
  return state;
}

// Admin = gate wrapper — only renders AdminPanel when IP is allowed.
// AdminPanel holds all hooks — hooks never run conditionally.
function Admin() {
  const gate = useAdminGate();

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ background: "var(--background)", color: "hsl(var(--foreground))" }}>
        <p className="text-7xl font-bold text-muted-foreground/20">404</p>
        <p className="text-sm text-muted-foreground">Страница не найдена</p>
        <a href="/" className="mt-2 text-xs text-primary hover:underline">← На главную</a>
      </div>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const { items, add, remove, MAX_ITEMS } = useLibrary();
  const { episodes, addEpisode, removeEpisode, getForAnime } = useEpisodes();
  const { covers: coverOverrides, setCover, clearCover } = useCoverOverrides();
  const [activeTab, setActiveTab] = useState<Category>("anime");
  const [mainTab, setMainTab] = useState<"catalog" | "episodes" | "covers">("catalog");
  const [coverDraft, setCoverDraft] = useState<Record<string, string>>({});
  const [coverErr, setCoverErr] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [epForm, setEpForm] = useState(emptyEpForm);
  const [epErr, setEpErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [epDeleteConfirm, setEpDeleteConfirm] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // All anime available for episode assignment
  const allAnime = [
    ...CATALOG_ANIME,
    ...items.map((i) => ({ id: `u_${i.id}`, title: i.title })),
  ];

  const submitEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    setEpErr(null);
    const parsed = episodeSchema.safeParse({
      ...epForm,
      episode: Number(epForm.episode),
    });
    if (!parsed.success) {
      setEpErr(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    try {
      addEpisode(parsed.data);
      const animeName = allAnime.find((a) => a.id === epForm.animeId)?.title ?? epForm.animeId;
      toast.success(`Эпизод ${epForm.episode} добавлен!`, { description: animeName });
      setEpForm(emptyEpForm);
    } catch (ex) {
      setEpErr(ex instanceof Error ? ex.message : "Ошибка");
    }
  };

  const tabItems = items.filter((i) => i.category === activeTab);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = itemSchema.safeParse({
      ...form,
      category: activeTab,
      year: Number(form.year),
      rating: Number(form.rating),
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }
    try {
      add(parsed.data);
      toast.success(`«${form.title}» добавлено!`, {
        description: `Категория: ${CATEGORY_LABELS[activeTab]}`,
      });
      setForm({ ...emptyForm });
      setShowForm(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleDelete = (item: Item) => {
    if (deleteConfirm === item.id) {
      remove(item.id);
      toast.success(`«${item.title}» удалено`);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(item.id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: "var(--background)", fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-white/10"
        style={{
          background: "rgba(10,10,20,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1
                className="text-xl tracking-widest"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                АДМИН <span className="text-primary">ПАНЕЛЬ</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Package className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-foreground">{items.length}</span>
              <span className="text-muted-foreground">/ {MAX_ITEMS}</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "var(--gradient-hero)" }}>
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Main tab switcher */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
          <button
            onClick={() => setMainTab("catalog")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${ mainTab === "catalog" ? "text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground" }`}
            style={mainTab === "catalog" ? { background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" } : {}}
          >
            <Package className="h-4 w-4" /> Каталог
          </button>
          <button
            onClick={() => setMainTab("episodes")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${ mainTab === "episodes" ? "text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground" }`}
            style={mainTab === "episodes" ? { background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" } : {}}
          >
            <ListVideo className="h-4 w-4" /> Эпизоды ({episodes.length})
          </button>
        </div>

        {/* Episodes tab */}
        {mainTab === "episodes" && (
          <div>
            {/* Add episode form */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.05))" }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--gradient-hero)" }}>
                  <ListVideo className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Добавить эпизод</p>
                  <p className="text-xs text-muted-foreground">Видео сохранится в базе — ссылка скрыта от зрителей</p>
                </div>
              </div>
              <form onSubmit={submitEpisode} className="p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Tag className="h-3 w-3" /> Аниме</Label>
                    <select
                      value={epForm.animeId}
                      onChange={(e) => setEpForm({ ...epForm, animeId: e.target.value })}
                      className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                    >
                      <option value="" disabled style={{ background: "#0a0a14" }}>Выберите аниме...</option>
                      {allAnime.map((a) => (
                        <option key={a.id} value={a.id} style={{ background: "#0a0a14" }}>{a.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Hash className="h-3 w-3" /> Номер эпизода</Label>
                    <Input type="number" min={1} max={9999} value={String(epForm.episode)} onChange={(e) => setEpForm({ ...epForm, episode: Number(e.target.value) || 1 })} className="border-white/10 bg-white/5 focus:border-primary/50" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Tag className="h-3 w-3" /> Название эпизода</Label>
                    <Input value={epForm.title} onChange={(e) => setEpForm({ ...epForm, title: e.target.value.slice(0, 100) })} placeholder="Пробуждение..." maxLength={100} className="border-white/10 bg-white/5 focus:border-primary/50" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Video className="h-3 w-3" /> Ссылка на видео (https)</Label>
                    <Input value={epForm.url} onChange={(e) => setEpForm({ ...epForm, url: e.target.value.slice(0, 500) })} placeholder="https://..." maxLength={500} className="border-white/10 bg-white/5 focus:border-primary/50" />
                    <p className="mt-1 text-xs text-muted-foreground">Ссылка хранится только в браузере, зрители её не увидят</p>
                  </div>
                  {epErr && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{epErr}</p>}
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full py-5 text-sm font-semibold text-white sm:w-auto sm:px-8" style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}>
                      <Plus className="mr-2 h-4 w-4" /> Добавить эпизод
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Episodes list grouped by anime */}
            {allAnime.filter((a) => getForAnime(a.id).length > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
                <ListVideo className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Эпизоды ещё не добавлены</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {allAnime.filter((a) => getForAnime(a.id).length > 0).map((anime) => (
                  <div key={anime.id} className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" style={{ background: "rgba(139,92,246,0.08)" }}>
                      <BookOpen className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">{anime.title}</p>
                      <Badge variant="outline" className="ml-auto border-white/10 text-xs">{getForAnime(anime.id).length} эп.</Badge>
                    </div>
                    <div className="divide-y divide-white/5">
                      {getForAnime(anime.id).map((ep) => (
                        <div key={ep.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(139,92,246,0.15)" }}>
                            <span className="text-xs font-bold text-primary">{ep.episode}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{ep.title}</p>
                            <p className="text-xs text-muted-foreground">Эпизод {ep.episode} · URL скрыт</p>
                          </div>
                          <button
                            onClick={() => {
                              if (epDeleteConfirm === ep.id) { removeEpisode(ep.id); toast.success("Эпизод удалён"); setEpDeleteConfirm(null); }
                              else { setEpDeleteConfirm(ep.id); setTimeout(() => setEpDeleteConfirm(null), 3000); }
                            }}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${ epDeleteConfirm === ep.id ? "bg-destructive text-white" : "border border-white/10 text-muted-foreground hover:border-destructive/50 hover:text-destructive" }`}
                            title={epDeleteConfirm === ep.id ? "Нажмите ещё раз" : "Удалить"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab === "catalog" && (
          <div>
          {/* Stats row */}
          <div className="mb-6 grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const count = items.filter((i) => i.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                  activeTab === c
                    ? "border-primary/50 shadow-lg"
                    : "border-white/10 hover:border-white/20"
                }`}
                style={{
                  background:
                    activeTab === c
                      ? "rgba(139,92,246,0.12)"
                      : "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[c]}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[c]}</p>
                {activeTab === c && (
                  <div className="absolute right-2 top-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab selector */}
        <div
          className="mb-5 flex gap-1 rounded-2xl border border-white/10 p-1"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  activeTab === c
                    ? "text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={
                  activeTab === c
                    ? { background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }
                    : {}
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{CATEGORY_LABELS[c]}</span>
              </button>
            );
          })}
        </div>

        {/* Add button */}
        <div className="mb-5">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setErr(null);
              if (!showForm) {
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-medium transition-all hover:border-primary/50"
            style={{
              borderColor: showForm ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)",
              background: showForm ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
              color: showForm ? "hsl(var(--primary))" : "hsl(var(--foreground))",
            }}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Скрыть форму
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Добавить в «{CATEGORY_LABELS[activeTab]}»
              </>
            )}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div
            ref={formRef}
            className="mb-6 overflow-hidden rounded-2xl border border-white/10"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="flex items-center gap-3 border-b border-white/10 px-5 py-4"
              style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.05))` }}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[activeTab]}`}
              >
                {(() => { const Icon = CATEGORY_ICONS[activeTab]; return <Icon className="h-4 w-4 text-white" />; })()}
              </div>
              <div>
                <p className="font-semibold">Новая запись</p>
                <p className="text-xs text-muted-foreground">Категория: {CATEGORY_LABELS[activeTab]}</p>
              </div>
            </div>

            <form onSubmit={submit} className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Tag className="h-3 w-3" /> Название
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 100) })}
                    placeholder="Введите название..."
                    maxLength={100}
                    className="border-white/10 bg-white/5 focus:border-primary/50 focus:bg-white/8"
                  />
                </div>

                {/* Genre */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Hash className="h-3 w-3" /> Жанр
                  </Label>
                  <Input
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value.slice(0, 40) })}
                    placeholder="Экшн, Романтика..."
                    maxLength={40}
                    className="border-white/10 bg-white/5 focus:border-primary/50"
                  />
                </div>

                {/* Year */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Calendar className="h-3 w-3" /> Год
                  </Label>
                  <Input
                    type="number"
                    value={String(form.year)}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) || 0 })}
                    min={1900}
                    max={2100}
                    className="border-white/10 bg-white/5 focus:border-primary/50"
                  />
                </div>

                {/* Rating */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Star className="h-3 w-3" /> Рейтинг (0–10)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={String(form.rating)}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) || 0 })}
                    className="border-white/10 bg-white/5 focus:border-primary/50"
                  />
                </div>

                {/* Cover URL */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Image className="h-3 w-3" /> Обложка (https URL)
                  </Label>
                  <Input
                    value={form.cover}
                    onChange={(e) => setForm({ ...form, cover: e.target.value.slice(0, 500) })}
                    placeholder="https://..."
                    maxLength={500}
                    className="border-white/10 bg-white/5 focus:border-primary/50"
                  />
                  {form.cover.startsWith("https://") && (
                    <img
                      src={form.cover}
                      alt="preview"
                      className="mt-2 h-20 w-14 rounded-lg object-cover border border-white/10"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  )}
                </div>

                {/* Trailer URL */}
                <div>
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Video className="h-3 w-3" /> Видео (https URL)
                  </Label>
                  <Input
                    value={form.trailer}
                    onChange={(e) => setForm({ ...form, trailer: e.target.value.slice(0, 500) })}
                    placeholder="https://..."
                    maxLength={500}
                    className="border-white/10 bg-white/5 focus:border-primary/50"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <AlignLeft className="h-3 w-3" /> Описание
                  </Label>
                  <Textarea
                    value={form.desc}
                    maxLength={400}
                    onChange={(e) => setForm({ ...form, desc: e.target.value })}
                    placeholder="Краткое описание..."
                    className="min-h-[80px] border-white/10 bg-white/5 focus:border-primary/50 resize-none"
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {form.desc.length}/400
                  </p>
                </div>

                {err && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                    {err}
                  </p>
                )}

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    className="w-full py-5 text-sm font-semibold text-white sm:w-auto sm:px-8"
                    style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Добавить в каталог
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Items list */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tabItems.length === 0
                ? `В «${CATEGORY_LABELS[activeTab]}» пусто`
                : `${tabItems.length} ${tabItems.length === 1 ? "запись" : tabItems.length < 5 ? "записи" : "записей"} в «${CATEGORY_LABELS[activeTab]}»`}
            </p>
            {tabItems.length > 0 && (
              <Badge
                variant="outline"
                className="border-white/10 text-xs text-muted-foreground"
              >
                {tabItems.length} / {MAX_ITEMS}
              </Badge>
            )}
          </div>

          {tabItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
              {(() => { const Icon = CATEGORY_ICONS[activeTab]; return <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />; })()}
              <p className="text-sm text-muted-foreground">Нет записей в этой категории</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Добавить первую запись
              </button>
            </div>
          ) : (
            <div className="grid gap-3 pb-8 sm:grid-cols-2">
              {tabItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 p-3 transition-all hover:border-white/20"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  {/* Cover */}
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-xl">
                    <img
                      src={item.cover}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        (el.nextElementSibling as HTMLElement).style.display = "flex";
                      }}
                    />
                    <div
                      className="hidden h-full w-full items-center justify-center bg-white/5"
                      style={{ display: "none" }}
                    >
                      <Image className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.genre} · {item.year}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400">{item.rating}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                      deleteConfirm === item.id
                        ? "bg-destructive text-white"
                        : "border border-white/10 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                    }`}
                    title={deleteConfirm === item.id ? "Нажмите ещё раз для удаления" : "Удалить"}
                  >
                    {deleteConfirm === item.id ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}
      </main>
    </div>
  );
}
