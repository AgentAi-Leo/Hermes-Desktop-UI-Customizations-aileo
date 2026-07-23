import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Download, FileText, RefreshCw, Search } from "lucide-react";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Button } from "@nous-research/ui/ui/components/button";
import { Card, CardContent } from "@nous-research/ui/ui/components/card";
import { Input } from "@nous-research/ui/ui/components/input";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { usePageHeader } from "@/contexts/usePageHeader";
import { usePersistentFullscreen } from "@/lib/persistent-fullscreen";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { BriefEntry, BriefKind, BriefListResponse } from "@/lib/api";
import {
  BRIEF_DATE_NAV_MESSAGE_TYPE,
  BRIEF_EXPORT_BUTTON_CLASS,
  BRIEF_DATE_PAGE_SIZE,
  BRIEF_PLAYER_MESSAGE_TYPE,
  BRIEF_PREVIEW_SANDBOX,
  adjacentBriefDate,
  briefDateNavigationWraps,
  briefDashboardHtml,
  briefDashboardMarkdown,
  briefDownloadName,
  briefHtmlDownloadName,
  briefPreviewCanvasColor,
  filterBriefs,
  formatArchiveDate,
  formatStockArchiveDate,
  focusBriefPreview,
  isBriefPlayerShortcut,
  isBriefPlayerTextEditingTarget,
  matchingStockPortfolioCsv,
  paginateBriefs,
  prepareBriefPreviewHtml,
  stockPortfolioCsv,
  stockPortfolioCsvName,
  stockDateNavigationDirection,
  supportsBriefDateNavigation,
} from "@/lib/briefs";
import type { StockPortfolioCsvExport } from "@/lib/briefs";

interface BriefsPageProps {
  kind: BriefKind;
  title: string;
  emptyMessage: string;
}

const AI_VOLUME_STORAGE_KEY = "hermes-briefs-ai-volume-v1";
const AI_DEFAULT_VOLUME = 0.45;
const AI_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const AI_DEFAULT_PLAYBACK_RATE = 1.25;

function readStoredAiVolume() {
  if (typeof window === "undefined") return AI_DEFAULT_VOLUME;
  try {
    const stored = localStorage.getItem(AI_VOLUME_STORAGE_KEY);
    if (stored === null) return AI_DEFAULT_VOLUME;
    const numeric = Number(stored);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : AI_DEFAULT_VOLUME;
  } catch (_reason) {
    return AI_DEFAULT_VOLUME;
  }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function BriefsPage({ kind, title, emptyMessage }: BriefsPageProps) {
  const { setAfterTitle, setEnd } = usePageHeader();
  const isPersistentFullscreen = usePersistentFullscreen();
  const previewCanvasColor = briefPreviewCanvasColor(kind);
  const [listing, setListing] = useState<BriefListResponse | null>(null);
  const [selected, setSelected] = useState<BriefEntry | null>(null);
  const [query, setQuery] = useState("");
  const [datePage, setDatePage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stockCsv, setStockCsv] = useState<StockPortfolioCsvExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const previewLoadedRef = useRef(false);
  const pendingPlayerCommandRef = useRef<string | null>(null);
  const [aiVolume, setAiVolume] = useState(readStoredAiVolume);
  const aiVolumeRef = useRef(aiVolume);
  const [aiPlaybackRate, setAiPlaybackRate] = useState(AI_DEFAULT_PLAYBACK_RATE);
  const aiPlaybackRateRef = useRef(AI_DEFAULT_PLAYBACK_RATE);
  const [aiPlaying, setAiPlaying] = useState(false);
  const latestStockViewportPositionRef = useRef<{ scrollX: number; scrollY: number } | null>(null);
  const pendingStockViewportPositionRef = useRef<{ scrollX: number; scrollY: number } | null>(null);
  const latestAiViewportPositionRef = useRef<{ scrollX: number; scrollY: number; topicIndex: number } | null>(null);
  const pendingAiViewportPositionRef = useRef<{ scrollX: number; scrollY: number; topicIndex: number } | null>(null);
  const aiViewportByDateRef = useRef(new Map<string, { scrollX: number; scrollY: number; topicIndex: number }>());

  const rememberAiViewportForDateChange = (
    targetDate: string,
    direction?: "newer" | "older",
  ) => {
    if (kind !== "ai" || !selected) return;
    const position = latestAiViewportPositionRef.current;
    if (position) aiViewportByDateRef.current.set(selected.date, position);
    const wraps = Boolean(direction && listing && briefDateNavigationWraps(listing.briefs, selected.date, direction));
    pendingAiViewportPositionRef.current = wraps ? null : aiViewportByDateRef.current.get(targetDate) ?? null;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listBriefs(kind);
      setListing(result);
      setSelected((current) => {
        if (current && result.briefs.some((brief) => brief.date === current.date)) {
          return result.briefs.find((brief) => brief.date === current.date) ?? null;
        }
        return result.briefs[0] ?? null;
      });
    } catch (reason) {
      setError(String(reason));
      setListing(null);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    previewLoadedRef.current = false;
    pendingPlayerCommandRef.current = null;
    setStockCsv(null);
    setPreviewLoading(Boolean(selected?.html_route));
    setError(null);

    if (!selected?.html_route) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      return () => undefined;
    }

    void api
      .fetchBriefHtml(selected.html_route)
      .then(async (blob) => {
        const sourceHtml = await blob.text();
        const html = prepareBriefPreviewHtml(sourceHtml, kind, selected.generated_at, selected.date, isPersistentFullscreen && kind === "ai");
        if (!active) return;
        if (kind === "stock") {
          setStockCsv({ date: selected.date, content: stockPortfolioCsv(sourceHtml, selected.date) });
        }
        objectUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        setPreviewUrl(objectUrl);
      })
      .catch((reason) => {
        if (active) setError(`Could not load HTML preview: ${String(reason)}`);
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isPersistentFullscreen, kind, selected]);

  useEffect(() => {
    if (kind !== "ai" || !previewUrl) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (isBriefPlayerTextEditingTarget(event.target)) return;

      const key = event.code === "Space" ? " " : event.key;
      if (!isBriefPlayerShortcut(key)) return;

      const command =
        key === " " || key === "Spacebar"
          ? "toggle"
          : key === "ArrowLeft"
            ? "previous"
            : key === "ArrowRight"
              ? "next"
              : "first";

      event.preventDefault();
      if (!previewLoadedRef.current) {
        pendingPlayerCommandRef.current = command;
        return;
      }
      previewRef.current?.contentWindow?.postMessage(
        { type: BRIEF_PLAYER_MESSAGE_TYPE, command },
        "*",
      );
      if (previewRef.current) focusBriefPreview(previewRef.current);
    };

    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [kind, previewUrl]);

  useEffect(() => {
    if (kind !== "ai") return;
    const handleAiPlayerState = (event: MessageEvent) => {
      if (event.source !== previewRef.current?.contentWindow) return;
      if (event.data?.type === "hermes-ai-player-state") {
        const playbackRate = Number(event.data.playbackRate);
        if (AI_PLAYBACK_RATES.includes(playbackRate as (typeof AI_PLAYBACK_RATES)[number])) {
          aiPlaybackRateRef.current = playbackRate;
          setAiPlaybackRate(playbackRate);
        }
        setAiPlaying(Boolean(event.data.playing && !event.data.paused));
        return;
      }
      if (event.data?.type !== "hermes-ai-volume-change") return;
      const volume = Number(event.data.volume);
      if (!Number.isFinite(volume) || volume < 0 || volume > 1) return;
      aiVolumeRef.current = volume;
      setAiVolume(volume);
      try { localStorage.setItem(AI_VOLUME_STORAGE_KEY, String(volume)); } catch (_reason) {}
    };
    window.addEventListener("message", handleAiPlayerState);
    return () => window.removeEventListener("message", handleAiPlayerState);
  }, [kind]);

  useEffect(() => {
    if ((kind !== "ai" && kind !== "stock") || !listing || !selected) return;

    const handleStockDateShortcut = (event: KeyboardEvent) => {
      if (isBriefPlayerTextEditingTarget(event.target)) return;
      const direction = stockDateNavigationDirection(event.key);
      if (!direction) return;
      const target = adjacentBriefDate(listing.briefs, selected.date, direction);
      if (!target) return;
      event.preventDefault();
      const targetIndex = listing.briefs.findIndex((brief) => brief.date === target.date);
      setQuery("");
      setDatePage(Math.max(0, Math.floor(targetIndex / BRIEF_DATE_PAGE_SIZE)));
      if (kind === "ai") {
        rememberAiViewportForDateChange(target.date, direction);
      } else {
        pendingStockViewportPositionRef.current = latestStockViewportPositionRef.current;
      }
      setSelected(target);
    };

    window.addEventListener("keydown", handleStockDateShortcut, true);
    return () => window.removeEventListener("keydown", handleStockDateShortcut, true);
  }, [kind, listing, selected]);

  useEffect(() => {
    if (!supportsBriefDateNavigation(kind) || !listing || !selected) return;

    const handleDateNavigation = (event: MessageEvent) => {
      if (event.source !== previewRef.current?.contentWindow) return;
      if (event.data?.type === "hermes-ai-viewport-state") {
        const position = event.data.position;
        if (
          Number.isFinite(position?.scrollX) &&
          Number.isFinite(position?.scrollY) &&
          Number.isInteger(position?.topicIndex)
        ) {
          latestAiViewportPositionRef.current = {
            scrollX: position.scrollX,
            scrollY: position.scrollY,
            topicIndex: position.topicIndex,
          };
          aiViewportByDateRef.current.set(selected.date, latestAiViewportPositionRef.current);
        }
        return;
      }
      if (event.data?.type === "hermes-stock-viewport-state") {
        const position = event.data.position;
        if (
          Number.isFinite(position?.scrollX) &&
          Number.isFinite(position?.scrollY)
        ) {
          latestStockViewportPositionRef.current = {
            scrollX: position.scrollX,
            scrollY: position.scrollY,
          };
        }
        return;
      }
      if (event.data?.type !== BRIEF_DATE_NAV_MESSAGE_TYPE) return;
      if (event.data.direction !== "newer" && event.data.direction !== "older") return;
      const target = adjacentBriefDate(listing.briefs, selected.date, event.data.direction);
      if (!target) return;
      const targetIndex = listing.briefs.findIndex((brief) => brief.date === target.date);
      const position = event.data.position;
      if (kind === "ai" && Number.isInteger(position?.topicIndex)) {
        latestAiViewportPositionRef.current = {
          scrollX: Number.isFinite(position?.scrollX) ? position.scrollX : 0,
          scrollY: Number.isFinite(position?.scrollY) ? position.scrollY : 0,
          topicIndex: position.topicIndex,
        };
        aiViewportByDateRef.current.set(selected.date, position);
        const wraps = briefDateNavigationWraps(listing.briefs, selected.date, event.data.direction);
        pendingAiViewportPositionRef.current = wraps ? null : aiViewportByDateRef.current.get(target.date) ?? null;
      } else if (
        kind === "stock" &&
        Number.isFinite(position?.scrollX) &&
        Number.isFinite(position?.scrollY)
      ) {
        latestStockViewportPositionRef.current = {
          scrollX: position.scrollX,
          scrollY: position.scrollY,
        };
        pendingStockViewportPositionRef.current = latestStockViewportPositionRef.current;
      }
      setQuery("");
      setDatePage(Math.max(0, Math.floor(targetIndex / BRIEF_DATE_PAGE_SIZE)));
      setSelected(target);
    };

    window.addEventListener("message", handleDateNavigation);
    return () => window.removeEventListener("message", handleDateNavigation);
  }, [kind, listing, selected]);

  useEffect(() => {
    setAfterTitle(
      listing ? (
        <Badge tone="outline" className="max-w-[26rem] truncate text-xs" title={listing.root}>
          {listing.count} briefs
        </Badge>
      ) : null,
    );
    setEnd(
      <Button
        ghost
        size="icon"
        type="button"
        onClick={() => void load()}
        disabled={loading}
        aria-label={`Refresh ${title}`}
      >
        {loading ? <Spinner /> : <RefreshCw />}
      </Button>,
    );
    return () => {
      setAfterTitle(null);
      setEnd(null);
    };
  }, [listing, load, loading, setAfterTitle, setEnd, title]);

  const filtered = useMemo(
    () => filterBriefs(listing?.briefs ?? [], query),
    [listing?.briefs, query],
  );
  const datePageCount = Math.max(1, Math.ceil(filtered.length / BRIEF_DATE_PAGE_SIZE));
  const visibleDates = paginateBriefs(filtered, Math.min(datePage, datePageCount - 1));
  const selectedStockCsv = matchingStockPortfolioCsv(stockCsv, selected?.date);
  const aiNewerDate = kind === "ai" && listing && selected
    ? adjacentBriefDate(listing.briefs, selected.date, "newer")
    : null;
  const aiOlderDate = kind === "ai" && listing && selected
    ? adjacentBriefDate(listing.briefs, selected.date, "older")
    : null;
  const stockNewerDate = kind === "stock" && listing && selected
    ? adjacentBriefDate(listing.briefs, selected.date, "newer")
    : null;
  const stockOlderDate = kind === "stock" && listing && selected
    ? adjacentBriefDate(listing.briefs, selected.date, "older")
    : null;

  const sendAiPlayerCommand = (command: "previous" | "toggle" | "next") => {
    if (!previewLoadedRef.current) {
      pendingPlayerCommandRef.current = command;
      return;
    }
    previewRef.current?.contentWindow?.postMessage({ type: BRIEF_PLAYER_MESSAGE_TYPE, command }, "*");
    if (previewRef.current) focusBriefPreview(previewRef.current);
  };

  const updateAiVolume = (volume: number) => {
    const normalized = Math.max(0, Math.min(1, volume));
    aiVolumeRef.current = normalized;
    setAiVolume(normalized);
    try { localStorage.setItem(AI_VOLUME_STORAGE_KEY, String(normalized)); } catch (_reason) {}
    previewRef.current?.contentWindow?.postMessage(
      { type: "hermes-ai-volume-restore", volume: normalized },
      "*",
    );
  };

  const cycleAiPlaybackRate = () => {
    const currentIndex = AI_PLAYBACK_RATES.indexOf(aiPlaybackRateRef.current as (typeof AI_PLAYBACK_RATES)[number]);
    const nextRate = AI_PLAYBACK_RATES[(currentIndex + 1 + AI_PLAYBACK_RATES.length) % AI_PLAYBACK_RATES.length];
    aiPlaybackRateRef.current = nextRate;
    setAiPlaybackRate(nextRate);
    previewRef.current?.contentWindow?.postMessage(
      { type: "hermes-ai-playback-rate-restore", playbackRate: nextRate },
      "*",
    );
  };

  const selectAiAdjacentDate = (direction: "newer" | "older") => {
    if (kind !== "ai" || !listing || !selected) return;
    const target = adjacentBriefDate(listing.briefs, selected.date, direction);
    if (!target) return;
    const targetIndex = listing.briefs.findIndex((brief) => brief.date === target.date);
    rememberAiViewportForDateChange(target.date, direction);
    setQuery("");
    setDatePage(Math.max(0, Math.floor(targetIndex / BRIEF_DATE_PAGE_SIZE)));
    setSelected(target);
  };

  const selectStockAdjacentDate = (direction: "newer" | "older") => {
    if (kind !== "stock" || !listing || !selected) return;
    const target = adjacentBriefDate(listing.briefs, selected.date, direction);
    if (!target) return;
    const targetIndex = listing.briefs.findIndex((brief) => brief.date === target.date);
    setQuery("");
    setDatePage(Math.max(0, Math.floor(targetIndex / BRIEF_DATE_PAGE_SIZE)));
    pendingStockViewportPositionRef.current = latestStockViewportPositionRef.current;
    setSelected(target);
  };

  useEffect(() => {
    setDatePage((current) => Math.min(current, datePageCount - 1));
  }, [datePageCount]);

  const downloadHtml = async () => {
    if (!selected?.html_route) return;
    setDownloadError(null);
    try {
      const sourceHtml = await (await api.fetchBriefHtml(selected.html_route)).text();
      const archiveDates = (listing?.briefs ?? []).map((entry) => entry.date);
      saveBlob(
        new Blob([briefDashboardHtml(sourceHtml, kind, selected.date, archiveDates, selected.generated_at)], { type: "text/html;charset=utf-8" }),
        briefHtmlDownloadName(kind, selected.date),
      );
    } catch (reason) {
      setDownloadError(`HTML download failed: ${String(reason)}`);
    }
  };

  const downloadExport = async () => {
    if (!selected) return;
    setDownloadError(null);
    if (kind !== "stock" || !selectedStockCsv) return;
    saveBlob(
      new Blob(["\uFEFF", selectedStockCsv.content], { type: "text/csv;charset=utf-8" }),
      stockPortfolioCsvName(selectedStockCsv.date),
    );
  };

  const downloadMarkdown = async () => {
    if (!selected?.html_route) return;
    setDownloadError(null);
    try {
      const sourceHtml = await (await api.fetchBriefHtml(selected.html_route)).text();
      saveBlob(new Blob([briefDashboardMarkdown(sourceHtml, kind, selected.generated_at)], { type: "text/markdown;charset=utf-8" }), briefDownloadName(kind, selected.date));
    } catch (reason) {
      setDownloadError(`Markdown download failed: ${String(reason)}`);
    }
  };

  const renderExportButtons = (location: "preview" | "stock-toolbar" | "ai-persistent-toolbar") => (
    <div data-hermes-export-controls={location} className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      <Button
        type="button"
        size="sm"
        outlined
        disabled={!selected?.html_route}
        onClick={() => void downloadHtml()}
        prefix={<Download />}
        className={`${BRIEF_EXPORT_BUTTON_CLASS} uppercase`}
        aria-label="Download HTML"
      >
        HTML
      </Button>
      {kind === "stock" && (
        <Button
          type="button"
          size="sm"
          outlined
          disabled={!selectedStockCsv}
          onClick={() => void downloadExport()}
          prefix={<Download />}
          className={`${BRIEF_EXPORT_BUTTON_CLASS} uppercase`}
          aria-label="Download CSV"
        >
          CSV
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        outlined
        disabled={!selected?.html_route}
        onClick={() => void downloadMarkdown()}
        prefix={<Download />}
        className={`${BRIEF_EXPORT_BUTTON_CLASS} uppercase`}
        aria-label="Download Markdown"
      >
        Markdown
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        isPersistentFullscreen
          ? kind === "ai"
            ? "h-[138.889dvh] w-[138.889%] flex-none origin-top-left scale-[0.72] gap-0 overflow-hidden"
            : "h-[113.636dvh] w-[113.636%] flex-none origin-top-left scale-[0.88] gap-0 overflow-hidden"
          : "gap-4",
      )}
    >
      <div
        data-hermes-brief-route-chrome
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          isPersistentFullscreen && "hidden",
        )}
      >
        <div className="min-w-0">
          <p className="text-sm text-text-secondary">
            Daily {kind === "ai" ? "AI" : "stock"} archive from your existing cron output.
          </p>
          {listing && (
            <p className="mt-1 truncate font-mono text-xs text-text-tertiary" title={listing.root}>
              {listing.root}
            </p>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDatePage(0);
            }}
            placeholder="Filter by date"
            aria-label="Filter briefs by date"
            className="pl-9"
          />
        </div>
      </div>

      {(error || downloadError) && (
        <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? downloadError}
        </div>
      )}

      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", isPersistentFullscreen ? "gap-0" : "gap-3")}>
        <Card
          data-hermes-brief-archive-rail
          className={cn("min-w-0 shrink-0 overflow-hidden", isPersistentFullscreen && "hidden")}
        >
          <CardContent className="flex flex-col p-0">
            <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              {title}
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="text-xs text-text-tertiary">
                {filtered.length === 0 ? "No matching dates" : `${datePage * BRIEF_DATE_PAGE_SIZE + 1}–${Math.min((datePage + 1) * BRIEF_DATE_PAGE_SIZE, filtered.length)} of ${filtered.length} dates`}
              </span>

            </div>
            <div data-hermes-date-rail className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
                  <Spinner /> Loading briefs
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-12 text-center text-sm text-text-secondary">
                  {query ? "No dates match this filter." : emptyMessage}
                </div>
              ) : (
                visibleDates.map((brief) => (
                  <button
                    key={brief.date}
                    type="button"
                    onClick={() => {
                      if (kind === "stock") pendingStockViewportPositionRef.current = latestStockViewportPositionRef.current;
                      if (kind === "ai") rememberAiViewportForDateChange(brief.date);
                      setSelected(brief);
                    }}
                    className={`flex min-h-10 min-w-fit shrink-0 snap-start items-center justify-between gap-2 border px-2.5 py-1.5 text-left transition ${
                      selected?.date === brief.date
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent text-text-secondary hover:border-border hover:bg-background/40"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5 font-mono text-sm">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      {brief.date}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {brief.html_exists && <Badge tone="outline">HTML</Badge>}
                      {kind === "stock"
                        ? brief.html_exists && <Badge tone="outline">CSV</Badge>
                        : brief.markdown_exists && <Badge tone="outline">MD</Badge>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          data-hermes-brief-preview-card
          className={cn(
            "min-w-0 overflow-hidden",
            isPersistentFullscreen ? "h-full min-h-0 rounded-none border-0 shadow-none" : "h-[calc(100dvh-16rem)] min-h-[34rem] sm:min-h-[40rem]",
          )}
        >
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            <div
              data-hermes-brief-preview-toolbar
              className={cn(
                isPersistentFullscreen && "hidden",
                kind === "stock"
                  ? "grid min-h-[5.5rem] min-w-0 grid-cols-1 items-center gap-3 border-b border-border px-3 py-3 sm:px-4 xl:grid-cols-[minmax(12rem,1fr)_auto_minmax(28rem,1fr)]"
                  : "flex min-h-12 min-w-0 flex-col items-start gap-2 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4",
              )}
            >
              <div className="flex min-w-0 items-center gap-2 xl:justify-self-start">
                <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="truncate font-mono text-sm">
                  {selected?.date ?? "Select a brief"}
                </span>
              </div>
              {kind === "stock" && (
                <div
                  data-hermes-stock-date-navigation
                  className="flex min-w-0 items-center justify-center gap-3 text-[#67e8f9] sm:gap-[18px] xl:justify-self-center"
                  role="group"
                  aria-label="Stock brief date navigation"
                >
                  <button
                    type="button"
                    onClick={() => selectStockAdjacentDate("newer")}
                    disabled={!stockNewerDate}
                    className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-[#67e8f9] bg-[#67e8f9]/10 text-[24px] leading-none text-[#67e8f9] transition hover:bg-[#67e8f9] hover:text-[#0b1020] disabled:cursor-not-allowed disabled:opacity-30 sm:h-[42px] sm:w-[42px] sm:text-[26px]"
                    aria-label="Load newer Stock brief date"
                    title="Newer Stock brief date"
                  >
                    ‹
                  </button>
                  <span className="inline-flex min-h-[38px] items-center whitespace-nowrap rounded-full bg-[#67e8f9] px-4 text-[17px] font-extrabold leading-none tracking-[0.02em] text-[#07111f] sm:min-h-[42px]">
                    {formatStockArchiveDate(selected?.date ?? "")}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectStockAdjacentDate("older")}
                    disabled={!stockOlderDate}
                    className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-[#67e8f9] bg-[#67e8f9]/10 text-[24px] leading-none text-[#67e8f9] transition hover:bg-[#67e8f9] hover:text-[#0b1020] disabled:cursor-not-allowed disabled:opacity-30 sm:h-[42px] sm:w-[42px] sm:text-[26px]"
                    aria-label="Load older Stock brief date"
                    title="Older Stock brief date"
                  >
                    ›
                  </button>
                </div>
              )}
              {kind === "stock" && (
                <div className="min-w-0 max-w-full justify-self-end">
                  {renderExportButtons("stock-toolbar")}
                </div>
              )}
            </div>

            {isPersistentFullscreen && kind === "ai" && (
              <div
                data-hermes-ai-persistent-toolbar
                className="grid min-h-[76px] shrink-0 grid-cols-[minmax(28rem,1fr)_auto_minmax(30rem,1fr)] items-center gap-4 border-b border-[#24304a] bg-[#0b1020] px-3 py-2 text-[#67e8f9]"
                role="toolbar"
                aria-label="Persistent AI gold toolbar"
              >
                <div className="flex min-w-0 items-center gap-2 justify-self-start">
                  <button
                    type="button"
                    onClick={() => sendAiPlayerCommand("previous")}
                    className="grid h-[55px] w-[55px] place-items-center border border-[#7d7d7d] bg-[#737373] text-2xl text-white hover:bg-[#858585]"
                    aria-label="Previous AI topic"
                    title="Previous AI topic"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAiPlayerCommand("toggle")}
                    className="grid h-[55px] w-[55px] place-items-center border border-[#8ec5ff] bg-[#737373] text-2xl text-white hover:bg-[#858585]"
                    aria-label={aiPlaying ? "Pause AI narration" : "Play AI narration"}
                    aria-pressed={aiPlaying}
                    title={aiPlaying ? "Pause AI narration" : "Play AI narration"}
                  >
                    {aiPlaying ? "⏸" : "▶"}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAiPlayerCommand("next")}
                    className="grid h-[55px] w-[55px] place-items-center border border-[#7d7d7d] bg-[#737373] text-2xl text-white hover:bg-[#858585]"
                    aria-label="Next AI topic"
                    title="Next AI topic"
                  >
                    →
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={aiVolume}
                    onChange={(event) => updateAiVolume(Number(event.target.value))}
                    className="ml-2 w-[200px] accent-[#8ec5ff]"
                    aria-label="AI narration volume"
                    title={`Volume ${Math.round(aiVolume * 100)}%`}
                  />
                  <button
                    type="button"
                    onClick={cycleAiPlaybackRate}
                    className="ml-2 h-[55px] min-w-[88px] rounded-full border border-[#303646] bg-[#07090f] px-4 text-xl font-bold text-white"
                    aria-label="AI playback speed"
                    title="AI playback speed"
                  >
                    {aiPlaybackRate}x
                  </button>
                </div>

                <div className="flex items-center justify-center gap-[18px] justify-self-center" role="group" aria-label="AI brief date navigation">
                  <button
                    type="button"
                    onClick={() => selectAiAdjacentDate("newer")}
                    disabled={!aiNewerDate}
                    className="grid h-[58px] w-[58px] place-items-center rounded-full border border-[#67e8f9] bg-[#67e8f9]/10 text-[34px] leading-none text-[#67e8f9] hover:bg-[#67e8f9] hover:text-[#07111f] disabled:opacity-30"
                    aria-label="Load newer AI brief date"
                    title="Newer AI brief date"
                  >
                    ‹
                  </button>
                  <span className="inline-flex min-h-[58px] min-w-[220px] items-center justify-center whitespace-nowrap rounded-full bg-[#67e8f9] px-7 text-[25px] font-extrabold text-[#07111f]">
                    {formatArchiveDate(selected?.date ?? "")}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectAiAdjacentDate("older")}
                    disabled={!aiOlderDate}
                    className="grid h-[58px] w-[58px] place-items-center rounded-full border border-[#67e8f9] bg-[#67e8f9]/10 text-[34px] leading-none text-[#67e8f9] hover:bg-[#67e8f9] hover:text-[#07111f] disabled:opacity-30"
                    aria-label="Load older AI brief date"
                    title="Older AI brief date"
                  >
                    ›
                  </button>
                </div>

                <div className="min-w-0 justify-self-end">
                  {renderExportButtons("ai-persistent-toolbar")}
                </div>
              </div>
            )}

            <div className="relative min-h-0 flex-1" style={{ backgroundColor: previewCanvasColor }}>
              {previewUrl && (
                <iframe
                  ref={previewRef}
                  title={`${title} ${selected?.date ?? "preview"}`}
                  src={previewUrl}
                  sandbox={BRIEF_PREVIEW_SANDBOX}
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  onLoad={(event) => {
                    const iframe = event.currentTarget;
                    previewLoadedRef.current = true;
                    focusBriefPreview(iframe);
                    if (kind === "ai") {
                      iframe.contentWindow?.postMessage(
                        { type: "hermes-ai-volume-restore", volume: aiVolumeRef.current },
                        "*",
                      );
                      iframe.contentWindow?.postMessage(
                        { type: "hermes-ai-playback-rate-restore", playbackRate: aiPlaybackRateRef.current },
                        "*",
                      );
                      const position = pendingAiViewportPositionRef.current;
                      pendingAiViewportPositionRef.current = null;
                      if (position) {
                        iframe.contentWindow?.postMessage(
                          { type: "hermes-ai-viewport-restore", position },
                          "*",
                        );
                      }
                    }
                    if (kind === "stock") {
                      const position = pendingStockViewportPositionRef.current;
                      pendingStockViewportPositionRef.current = null;
                      if (position) {
                        iframe.contentWindow?.postMessage(
                          { type: "hermes-stock-viewport-restore", position },
                          "*",
                        );
                      }
                    }
                    const command = pendingPlayerCommandRef.current;
                    pendingPlayerCommandRef.current = null;
                    if (kind === "ai" && command) {
                      iframe.contentWindow?.postMessage({ type: BRIEF_PLAYER_MESSAGE_TYPE, command }, "*");
                    }
                  }}
                  className="h-full min-h-0 w-full border-0"
                  style={{ backgroundColor: previewCanvasColor, colorScheme: kind === "ai" ? "dark" : "light" }}
                />
              )}
              {previewLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background-base/95 text-sm text-text-secondary">
                  <Spinner /> Loading preview
                </div>
              )}
              {!previewLoading && !previewUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-background-base px-6 text-center text-sm text-text-secondary">
                  {selected
                    ? "This date has no HTML preview. Use the Markdown download if available."
                    : "Select a brief to preview it."}
                </div>
              )}
              {kind === "ai" && !previewLoading && previewUrl && selected && (
                <div
                  data-hermes-ai-export-overlay
                  className={cn(
                    "absolute inset-x-2 top-2 z-20 max-w-[calc(100%-1rem)] rounded-md bg-[#0b1020]/95 p-1.5 shadow-xl sm:left-auto sm:right-4 sm:top-3",
                    isPersistentFullscreen && "hidden",
                  )}
                >
                  {renderExportButtons("preview")}
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
