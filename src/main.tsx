import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./components";
import "./index.css";

if (!document.documentElement.classList.contains("dark")) {
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
