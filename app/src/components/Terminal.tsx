import React, { useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { LogEntry, LogLevel, useLog } from "../contexts/LogContext";

// ── Layout constants (px) — read by App.tsx for content padding ──────────────
export const TERMINAL_OPEN_H = 224;
export const TERMINAL_CLOSED_H = 36;

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
  const d = new Date(ts);
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${_timeFmt.format(d)}.${ms}`;
}

// ── Terminal component ────────────────────────────────────────────────────────
export const Terminal: React.FC = () => {
  const { logs, clearLogs, isTerminalOpen, setTerminalOpen } = useLog();
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log entry
  useEffect(() => {
    if (isTerminalOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, isTerminalOpen]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col border-t border-slate-700/50"
      style={{
        height: isTerminalOpen ? TERMINAL_OPEN_H : TERMINAL_CLOSED_H,
        transition: "height 0.18s ease-in-out",
      }}
    >
      {/* ── Title bar ── */}
      <div
        className="flex-none flex items-center gap-3 px-3 bg-slate-900/96 backdrop-blur-sm select-none"
        style={{ height: TERMINAL_CLOSED_H }}
      >
        {/* macOS-style traffic lights */}
        <div className="flex items-center gap-1.5 flex-none">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>

        {/* Title — click to toggle */}
        <button
          onClick={() => setTerminalOpen(!isTerminalOpen)}
          className="flex-1 flex items-center gap-2 text-left"
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
