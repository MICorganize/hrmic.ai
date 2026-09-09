"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";

import { cn } from "@/lib/utils";

type FavoriteItem = { href: string; label: string };

type SearchFavoritesPanelProps = {
  items: FavoriteItem[];
  favorites: string[];
  isFavorite: (href: string) => boolean;
  onToggle: (href: string) => void;
  maxFavorites: number;
};

/**
 * The favorite editor is only needed after the user opens the side panel.
 * Keeping it in its own client chunk prevents the input/search UI from
 * delaying the Portal's first interactive render.
 */
export function SearchFavoritesPanel({
  items,
  favorites,
  isFavorite,
  onToggle,
  maxFavorites,
}: SearchFavoritesPanelProps) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const visibleItems = useMemo(() => {
    if (!q) {
      return favorites
        .map((href) => items.find((item) => item.href === href))
        .filter((item): item is FavoriteItem => item !== undefined)
        .map((item) => item.href === "/salary/calculate/normal" ? { ...item, label: "คำนวณเงินเดือน" } : item);
    }
    const needle = q.toLowerCase();
    return items.filter(
      (item) => item.label.toLowerCase().includes(needle) || item.href.toLowerCase().includes(needle)
    );
  }, [favorites, items, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-0 top-1/2 size-5 -translate-y-1/2 text-muted-foreground/55" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาเพื่อเพิ่มเมนูโปรด"
            autoFocus
            className="h-9 w-full border-b border-border bg-transparent pl-9 pr-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">รายการเมนูโปรด</h2>
          <span className="text-sm text-muted-foreground">{favorites.length}/{maxFavorites}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
        {visibleItems.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {q ? "ไม่พบเมนูที่ค้นหา" : "ยังไม่มีเมนูโปรด"}
          </p>
        )}
        {visibleItems.map((item) => {
          const favorite = isFavorite(item.href);
          const cannotAdd = !favorite && favorites.length >= maxFavorites;
          return (
            <button
              key={item.href}
              type="button"
              disabled={cannotAdd}
              onClick={() => onToggle(item.href)}
              className={cn(
                "flex w-full items-center gap-4 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45",
                favorite && "text-foreground"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <Star className={cn("size-5 shrink-0 transition-colors", favorite ? "fill-[#ffc400] text-[#ffc400]" : "text-muted-foreground/45")} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
