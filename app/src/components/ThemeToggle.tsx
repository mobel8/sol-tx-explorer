import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES } from "../contexts/ThemeContext";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentTheme = THEMES.find((t) => t.name === theme);

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full text-sm transition-all duration-200"
        style={{
          background: open
            ? "rgba(var(--primary-rgb), 0.12)"
            : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(var(--primary-rgb), 0.2)",
          color: open ? "var(--primary)" : "rgba(255,255,255,0.6)",
        }}
      >
        <Palette className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left font-medium">Theme</span>
        {/* Swatch dot */}
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{
            background: currentTheme?.gradient,
            boxShadow: `0 0 8px ${currentTheme?.primary}88`,
          }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl p-2 z-50"
            style={{
              background: "rgba(5, 5, 15, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest px-2 pt-1 pb-2"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              Color Theme
            </p>
            {THEMES.map((t, i) => {
              const isActive = theme === t.name;
              return (
                <motion.button
                  key={t.name}
                  onClick={() => {
                    setTheme(t.name);
                    setOpen(false);
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl transition-all duration-150"
                  style={{
                    background: isActive
                      ? `rgba(${t.primary.replace("#", "").match(/.{2}/g)?.map(h => parseInt(h, 16)).join(", ")}, 0.12)`
                      : "transparent",
                  }}
                >
                  {/* Gradient swatch */}
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: t.gradient,
                      boxShadow: isActive
                        ? `0 0 16px ${t.primary}55, 0 0 32px ${t.primary}22`
                        : "none",
                      transition: "box-shadow 0.3s ease",
                    }}
                  >
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-4 h-4 text-white drop-shadow-sm" />
                      </motion.div>
                    )}
                  </div>

                  <div className="text-left flex-1">
                    <div
                      className="text-sm font-semibold leading-tight"
                      style={{ color: isActive ? t.primary : "rgba(255,255,255,0.85)" }}
                    >
                      {t.label}
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {t.description}
                    </div>
                  </div>

                  {isActive && (
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: t.primary }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
