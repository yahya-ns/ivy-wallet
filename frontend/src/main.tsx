import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { installOfflineFetchInterceptor } from "./lib/offlineInterceptor";
import { initSyncEngine } from "./lib/syncEngine";

// Initialize Offline-First Interceptor and Auto-Sync Engine
installOfflineFetchInterceptor();
initSyncEngine();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
