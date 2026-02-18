import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
} from "lucide-react";
import { LogEntry, LogLevel, useLog } from "../contexts/LogContext";

// ── Default dimensions (px) ───────────────────────────────────────────────────
const DEFAULT_W     = 560;
const DEFAULT_H     = 300;
const TITLEBAR_H    = 36;
const MIN_W         = 300;
const MIN_H         = 120;

// Kept for potential external consumers
export const TERMINAL_OPEN_H   = DEFAULT_H;
export const TERMINAL_CLOSED_H = TITLEBAR_H;

// ── Level styling ─────────────────────────────────────────────────────────────
const LEVEL_BADGE: Record<LogLevel, string> = {
  INFO:    "text-sky-400",
  SUCCESS: "text-emerald-400",
  WARNING: "text-amber-400",
  ERROR:   "text-red-400",
};

const LEVEL_TEXT: Record<LogLevel, string> = {
  INFO:    "text-slate-300",
  SUCCESS: "text-emerald-200/80",
  WARNING: "text-amber-200/80",
  ERROR:   "text-red-200/80",
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  INFO:    "INFO",
  SUCCESS: "SUCC",
  WARNING: "WARN",
  ERROR:   "ERR ",
};

// ── Timestamp formatter (HH:MM:SS.mmm) ───────────────────────────────────────
const _timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTs(ts: number): string {
  const d  = new Date(ts);
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${_timeFmt.format(d)}.${ms}`;
}

// ── Drag state ────────────────────────────────────────────────────────────────
type DragKind = "move" | "resize-left" | "resize-top" | "resize-corner";

interface DragState {
  kind:        DragKind;
  startX:      number;
  startY:      number;
  startW:      number;
  startH:      number;
  startPX:     number;   // panel left
  startPY:     number;   // panel top
  wasDetached: boolean;
}

// ── Terminal component ────────────────────────────────────────────────────────
export const Terminal: React.FC = () => {
  const { logs, clearLogs, isTerminalOpen, setTerminalOpen } = useLog();
  const bodyRef  = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // React state — only updated on mouseup (commit) to avoid re-render lag
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [pos,  setPos ] = useState<{ x: number; y: number } | null>(null);
  const isDetached = pos !== null;

  // Live values used during drag (always in sync with DOM, not React state)
  const live = useRef({ w: DEFAULT_W, h: DEFAULT_H, x: 0, y: 0 });

  const dragRef = useRef<DragState | null>(null);

  // Auto-scroll to bottom on new log entry
  useEffect(() => {
    if (isTerminalOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, isTerminalOpen]);

  // ── Direct DOM manipulation (zero React re-renders during drag) ──────────
  const applyToDom = useCallback((w: number, h: number, x: number, y: number, detached: boolean) => {
    const el = panelRef.current;
    if (!el) return;
    el.style.width  = `${w}px`;
    el.style.height = `${h}px`;
    if (detached) {
      el.style.left   = `${x}px`;
      el.style.top    = `${y}px`;
      el.style.right  = "";
      el.style.bottom = "";
    }
  }, []);

  // ── Global mouse handlers ────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    let { w, h, x, y } = live.current;

    if (d.kind === "move") {
      x = d.startPX + dx;
      y = d.startPY + dy;
    }

    if (d.kind === "resize-left" || d.kind === "resize-corner") {
      const newW = Math.max(MIN_W, d.startW - dx);
      w = newW;
      if (d.wasDetached) x = d.startPX + d.startW - newW;  // keep right edge fixed
    }

    if (d.kind === "resize-top" || d.kind === "resize-corner") {
      const newH = Math.max(MIN_H, d.startH - dy);
      h = newH;
      if (d.wasDetached) y = d.startPY + d.startH - newH;  // keep bottom edge fixed
    }

    live.current = { w, h, x, y };
    applyToDom(w, h, x, y, d.wasDetached);
  }, [applyToDom]);

  // Commit live values to React state on mouseup (single re-render)
  const onMouseUp = useCallback(() => {
    const d = dragRef.current;
    if (d) {
      const { w, h, x, y } = live.current;
      setSize({ w, h });
      if (d.wasDetached) setPos({ x, y });
    }
    dragRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // ── Drag starters ────────────────────────────────────────────────────────
  const startDrag = (kind: DragKind, e: React.MouseEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    live.current = { w: size.w, h: size.h, x: rect?.left ?? 0, y: rect?.top ?? 0 };
    dragRef.current = {
      kind,
      startX:      e.clientX,
      startY:      e.clientY,
      startW:      size.w,
      startH:      size.h,
      startPX:     rect?.left  ?? 0,
      startPY:     rect?.top   ?? 0,
      wasDetached: isDetached,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      kind === "move"        ? "grabbing"   :
      kind === "resize-left" ? "ew-resize"  :
      kind === "resize-top"  ? "ns-resize"  :
      "nwse-resize";
  };

  // ── Detach / Pin ─────────────────────────────────────────────────────────
  const detach = () => {
    const actualH = isTerminalOpen ? size.h : TITLEBAR_H;
    const x = window.innerWidth  - size.w  - 8;
    const y = window.innerHeight - actualH - 8;
    live.current = { ...live.current, x, y };
    setPos({ x, y });
  };

  const pin = () => {
    // Reset inline left/top so CSS right:0 bottom:0 takes over
    if (panelRef.current) {
      panelRef.current.style.left   = "";
      panelRef.current.style.top    = "";
      panelRef.current.style.right  = "";
      panelRef.current.style.bottom = "";
    }
    setPos(null);
  };

  // ── Panel style (initial / committed values only) ────────────────────────
  const panelStyle: React.CSSProperties = isDetached
    ? {
        position: "fixed",
        left:     pos!.x,
        top:      pos!.y,
        width:    size.w,
        height:   isTerminalOpen ? size.h : TITLEBAR_H,
        zIndex:   50,
      }
    : {
        position: "fixed",
        right:    0,
        bottom:   0,
        width:    size.w,
        height:   isTerminalOpen ? size.h : TITLEBAR_H,
        zIndex:   30,
        transition: "height 0.15s ease-in-out",
      };

  return (
    <div
      ref={panelRef}
      className="flex flex-col border border-slate-700/50 rounded-tl-xl overflow-hidden shadow-2xl"
      style={panelStyle}
    >
      {/* ── Resize: top edge ── */}
      {isTerminalOpen && (
        <div
          onMouseDown={e => startDrag("resize-top", e)}
          className="absolute top-0 left-4 right-4 h-1 cursor-ns-resize z-10 group"
        >
          <div className="h-full rounded-full opacity-0 group-hover:opacity-100 bg-slate-600/50 transition-opacity" />
        </div>
      )}

      {/* ── Resize: left edge ── */}
      <div
        onMouseDown={e => startDrag("resize-left", e)}
        className="absolute left-0 top-4 bottom-4 w-1 cursor-ew-resize z-10 group"
      >
        <div className="w-full h-full rounded-full opacity-0 group-hover:opacity-100 bg-slate-600/50 transition-opacity" />
      </div>

      {/* ── Resize: top-left corner ── */}
      {isTerminalOpen && (
        <div
          onMouseDown={e => startDrag("resize-corner", e)}
          className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20"
        />
      )}

      {/* ── Title bar ── */}
      <div
        className="flex-none flex items-center gap-3 px-3 bg-slate-900/96 backdrop-blur-sm select-none"
        style={{ height: TITLEBAR_H }}
      >
        {/* macOS-style traffic lights */}
        <div className="flex items-center gap-1.5 flex-none">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>

        {/* Title — click to toggle, drag to move when detached */}
        <button
          onClick={() => setTerminalOpen(!isTerminalOpen)}
          onMouseDown={isDetached ? e => startDrag("move", e) : undefined}
          className={`flex-1 flex items-center gap-2 text-left ${isDetached ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <TerminalIcon className="w-3 h-3 text-slate-500 flex-none" />
          <span className="text-[11px] font-mono font-semibold text-slate-400 tracking-widest uppercase">
            Infrastructure Terminal
          </span>
          <span className="ml-1 px-1.5 py-px rounded bg-slate-800 text-slate-600 text-[10px] font-mono tabular-nums">
            {logs.length}
          </span>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-0.5 flex-none">
          <button
            onClick={clearLogs}
            title="Clear terminal"
            className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {/* Detach / Pin toggle */}
          {isDetached ? (
            <button
              onClick={pin}
              title="Pin to corner"
              className="p-1 rounded text-amber-500/70 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            >
              <Pin className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={detach}
              title="Detach terminal"
              className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <PinOff className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setTerminalOpen(!isTerminalOpen)}
            title={isTerminalOpen ? "Collapse" : "Expand"}
            className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {isTerminalOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* ── Log body ── */}
      {isTerminalOpen && (
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto bg-slate-950 px-3 py-1.5"
          style={{ overscrollBehavior: "contain" }}
        >
          {logs.length === 0 ? (
            <p className="text-slate-700 text-[11px] font-mono pt-2 pl-1 italic">
              — Awaiting events —
            </p>
          ) : (
            logs.map((entry) => <LogLine key={entry.id} entry={entry} />)
          )}
        </div>
      )}
    </div>
  );
};

// ── Log line (memoized to avoid re-rendering the entire list) ─────────────────
const LogLine: React.FC<{ entry: LogEntry }> = React.memo(({ entry }) => (
  <div className="flex items-start gap-2 py-px font-mono text-[11px] leading-[1.65]">
    {/* Timestamp */}
    <span className="flex-none text-slate-600 tabular-nums select-none w-[82px]">
      {formatTs(entry.ts)}
    </span>

    {/* Level badge */}
    <span className={`flex-none font-bold tabular-nums w-[28px] ${LEVEL_BADGE[entry.level]}`}>
      {LEVEL_LABEL[entry.level]}
    </span>

    {/* Pipe separator */}
    <span className="flex-none text-slate-700 select-none">│</span>

    {/* Message + optional data */}
    <span className={`${LEVEL_TEXT[entry.level]} break-all min-w-0`}>
      {entry.message}
      {entry.data !== undefined && (
        <span className="text-slate-500 ml-2 font-normal">{entry.data}</span>
      )}
    </span>
  </div>
));

LogLine.displayName = "LogLine";
