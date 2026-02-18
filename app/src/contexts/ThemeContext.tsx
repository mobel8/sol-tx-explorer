import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeName = "solana" | "cyberpunk" | "ocean" | "aurora" | "midnight";

export interface ThemeConfig {
  name: ThemeName;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  gradient: string;
}

export const THEMES: ThemeConfig[] = [
  {
    name: "solana",
    label: "Solana",
    description: "Purple & Green",
    primary: "#9945FF",
    secondary: "#14F195",
    gradient: "linear-gradient(135deg, #9945FF, #14F195)",
  },
  {
    name: "cyberpunk",
    label: "Cyberpunk",
    description: "Magenta & Cyan",
    primary: "#FF2D78",
    secondary: "#00F5FF",
    gradient: "linear-gradient(135deg, #FF2D78, #00F5FF)",
  },
  {
    name: "ocean",
    label: "Ocean",
    description: "Sky & Teal",
    primary: "#38BDF8",
    secondary: "#2DD4BF",
    gradient: "linear-gradient(135deg, #38BDF8, #2DD4BF)",
  },
  {
    name: "aurora",
    label: "Aurora",
    description: "Lime & Violet",
    primary: "#00FF88",
    secondary: "#A855F7",
    gradient: "linear-gradient(135deg, #00FF88, #A855F7)",
  },
  {
    name: "midnight",
    label: "Midnight",
    description: "Lavender & Rose",
    primary: "#818CF8",
    secondary: "#F472B6",
    gradient: "linear-gradient(135deg, #818CF8, #F472B6)",
  },
];

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "solana",
  setTheme: () => {},
  themeConfig: THEMES[0],
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("soltx-theme") as ThemeName) || "solana";
  });

  const themeConfig = THEMES.find((t) => t.name === theme) ?? THEMES[0];

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("soltx-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Apply stored theme immediately on mount
  useEffect(() => {
    const stored = localStorage.getItem("soltx-theme") || "solana";
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
};
