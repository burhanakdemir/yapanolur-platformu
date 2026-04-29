"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ProfessionOption = { id: string; name: string };

export type ProfessionComboboxLabels = {
  placeholder: string;
  noResults: string;
  clear: string;
  searching: string;
};

type Props = {
  professions: ProfessionOption[];
  labels: ProfessionComboboxLabels;
  /** Kayıtlı profil veya form başlangıç değeri */
  initialProfessionId?: string | null;
  disabled?: boolean;
  required?: boolean;
  /** Görünür metin kutusu id (label htmlFor) */
  inputId?: string;
  /**
   * Yazarken `/api/professions?search=` ile sonuç alınır; boş sorguda parent listesi kullanılır.
   * Uzun listelerde ağ ve bellek için uygundur.
   */
  serverSearch?: boolean;
};

const VIRTUAL_THRESHOLD = 25;

function trLower(s: string): string {
  return s.toLocaleLowerCase("tr-TR");
}

export default function ProfessionCombobox({
  professions,
  labels,
  initialProfessionId,
  disabled,
  required,
  inputId: inputIdProp,
  serverSearch = false,
}: Props) {
  const genId = useId();
  const inputId = inputIdProp ?? `profession-search-${genId}`;
  const listboxId = `${genId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef("");

  const [selectedId, setSelectedId] = useState("");
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remoteItems, setRemoteItems] = useState<ProfessionOption[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  /** Kayıtlı profil + liste gelince doldur (setState mikro görevde; eslint set-state-in-effect uyumu). */
  useEffect(() => {
    if (!initialProfessionId || professions.length === 0) return;
    const p = professions.find((x) => x.id === initialProfessionId);
    if (!p) return;
    queueMicrotask(() => {
      setSelectedId(p.id);
      setText(p.name);
    });
  }, [initialProfessionId, professions]);

  const localFiltered = useMemo(() => {
    const q = trLower(text.trim());
    if (!q) return professions;
    return professions.filter((p) => trLower(p.name).includes(q));
  }, [professions, text]);

  /** Sunucu araması: yazım debounce; boşta parent listesi */
  useEffect(() => {
    if (!serverSearch) return;
    const q = text.trim();
    if (!q) {
      queueMicrotask(() => {
        setRemoteItems(null);
        setRemoteLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setRemoteItems(null);
      setRemoteLoading(true);
    });
    const ac = new AbortController();
    const tid = window.setTimeout(() => {
      fetch(`/api/professions?search=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setRemoteItems(d);
          else setRemoteItems([]);
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          setRemoteItems([]);
        })
        .finally(() => setRemoteLoading(false));
    }, 300);
    return () => {
      window.clearTimeout(tid);
      ac.abort();
    };
  }, [text, serverSearch]);

  const displayList = useMemo(() => {
    if (serverSearch && text.trim()) {
      return remoteItems ?? [];
    }
    return localFiltered;
  }, [serverSearch, text, localFiltered, remoteItems]);

  const showNoResults =
    open &&
    text.trim() &&
    !remoteLoading &&
    displayList.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  /** Açıkken arka plan kaydırmayı kapat (özellikle mobil). */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function pick(p: ProfessionOption) {
    setSelectedId(p.id);
    setText(p.name);
    setOpen(false);
  }

  function clearSelection() {
    setSelectedId("");
    setText("");
    setHighlight(0);
    setRemoteItems(null);
    setOpen(true);
  }

  if (disabled) {
    const label = professions.find((x) => x.id === initialProfessionId)?.name ?? "—";
    return (
      <div
        id={inputId}
        className="w-full rounded-lg border border-orange-300 bg-orange-100 p-2 text-orange-900"
        aria-readonly="true"
      >
        {label}
      </div>
    );
  }

  const safeHighlight = displayList.length > 0 ? Math.min(highlight, displayList.length - 1) : 0;
  const activeOptionId =
    open && displayList.length > 0 ? `${listboxId}-opt-${displayList[safeHighlight]?.id}` : undefined;

  const useVirtual = displayList.length > VIRTUAL_THRESHOLD;

  return (
    <div ref={containerRef} className="relative space-y-1">
      <input type="hidden" name="professionId" value={selectedId} required={required} />
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          value={text}
          className="w-full rounded-lg border border-orange-200 bg-white p-2 pr-10"
          placeholder={labels.placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            setHighlight(0);
            setOpen(true);
            const q = trLower(v.trim());
            const exact = professions.find((p) => trLower(p.name) === q);
            if (exact) {
              setSelectedId(exact.id);
            } else {
              setSelectedId("");
            }
          }}
          onFocus={() => {
            setHighlight(0);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              const q = trLower(textRef.current.trim());
              if (!q) {
                setSelectedId("");
                return;
              }
              const exact = professions.find((p) => trLower(p.name) === q);
              if (exact) {
                setSelectedId(exact.id);
                setText(exact.name);
                return;
              }
              const one = professions.filter((p) => trLower(p.name).includes(q));
              if (one.length === 1) {
                pick(one[0]);
              }
            }, 120);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setOpen(true);
              return;
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const max = Math.max(0, displayList.length - 1);
              setHighlight((h) => Math.min(h + 1, max));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            }
            if (e.key === "Enter" && open && displayList.length > 0) {
              e.preventDefault();
              pick(displayList[safeHighlight]);
            }
          }}
        />
        {(selectedId || text) && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-orange-50 hover:text-orange-900"
            aria-label={labels.clear}
            onMouseDown={(ev) => {
              ev.preventDefault();
              clearSelection();
            }}
          >
            {labels.clear}
          </button>
        )}
      </div>

      {open && displayList.length > 0 && !useVirtual && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-orange-200 bg-white py-1 shadow-lg"
        >
          {displayList.map((p, i) => (
            <li
              key={p.id}
              id={`${listboxId}-opt-${p.id}`}
              role="option"
              aria-selected={selectedId === p.id}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === safeHighlight ? "bg-orange-100 text-orange-950" : "text-slate-800 hover:bg-orange-50"
              }`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(p);
              }}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}

      {open && displayList.length > 0 && useVirtual && (
        <VirtualProfessionList
          listboxId={listboxId}
          displayList={displayList}
          safeHighlight={safeHighlight}
          selectedId={selectedId}
          onPick={pick}
          onHighlight={setHighlight}
        />
      )}

      {open && remoteLoading && text.trim() && serverSearch && (
        <p
          className="absolute z-20 mt-1 w-full rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-slate-600"
          role="status"
          aria-live="polite"
        >
          {labels.searching}
        </p>
      )}

      {open && showNoResults && (
        <p
          className="absolute z-20 mt-1 w-full rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-slate-600"
          role="status"
          aria-live="polite"
        >
          {labels.noResults}
        </p>
      )}
    </div>
  );
}

function VirtualProfessionList({
  listboxId,
  displayList,
  safeHighlight,
  selectedId,
  onPick,
  onHighlight,
}: {
  listboxId: string;
  displayList: ProfessionOption[];
  safeHighlight: number;
  selectedId: string;
  onPick: (p: ProfessionOption) => void;
  onHighlight: (i: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual: React Compiler bu hook'u güvenli memoize edemiyor; bilinçli kullanım.
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer API
  const virtualizer = useVirtualizer({
    count: displayList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 8,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(safeHighlight, { align: "auto" });
  }, [safeHighlight, virtualizer]);

  return (
    <div
      id={listboxId}
      ref={parentRef}
      role="listbox"
      className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-orange-200 bg-white py-1 shadow-lg"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const p = displayList[vi.index];
          const i = vi.index;
          return (
            <div
              key={p.id}
              id={`${listboxId}-opt-${p.id}`}
              role="option"
              aria-selected={selectedId === p.id}
              className={`absolute left-0 top-0 w-full cursor-pointer px-3 py-2 text-sm ${
                i === safeHighlight ? "bg-orange-100 text-orange-950" : "text-slate-800 hover:bg-orange-50"
              }`}
              style={{ transform: `translateY(${vi.start}px)` }}
              onMouseEnter={() => onHighlight(i)}
              onMouseDown={(ev) => {
                ev.preventDefault();
                onPick(p);
              }}
            >
              {p.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
