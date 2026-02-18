import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react({
      // Babel transform with optimized settings
      babel: {
        plugins: [],
      },
    }),
    nodePolyfills({
      include: ["buffer"],
      globals: { Buffer: true },
    }),
  ],

  define: {
    "process.env": {},
    global: "globalThis",
  },

  build: {
    // Raise warning limit — we're aware and splitting
    chunkSizeWarningLimit: 600,

    // Enable CSS code splitting
    cssCodeSplit: true,

    // Source maps off in production
    sourcemap: false,

    // Terser minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
      },
    },

    rollupOptions: {
      output: {
        // Split heavy libraries into separate cached chunks
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // Animation library — medium size, loaded early
          if (id.includes("framer-motion")) return "vendor-framer";

          // Jupiter DEX API
          if (id.includes("@jup-ag")) return "vendor-jup";

          // Anchor framework
          if (id.includes("@coral-xyz")) return "vendor-anchor";

          // All Solana + wallet adapter in one chunk to avoid circular refs
          if (
            id.includes("@solana/") ||
            id.includes("wallet-adapter") ||
            id.includes("solana")
          ) {
            return "vendor-solana";
          }

          // UI utilities
          if (id.includes("lucide") || id.includes("recharts")) {
            return "vendor-ui";
          }

          // React + router — baseline chunk
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }
        },

        // Deterministic chunk names with hash
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },

  // Pre-bundle heavy dependencies for faster dev server startup
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "@solana/web3.js",
    ],
  },
});
