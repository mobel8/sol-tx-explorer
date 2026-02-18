import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { SolanaProvider } from "./components/SolanaProvider";
import { ThemeProvider } from "./contexts/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
