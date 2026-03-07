import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import { ToastProvider } from "./components/Toast";

// VALSEA Speech Intelligence Platform
function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  return (
    <ToastProvider>
      {view === "landing" ? (
        <Landing onEnter={() => setView("dashboard")} />
      ) : (
        <Dashboard onBack={() => setView("landing")} />
      )}
    </ToastProvider>
  );
}

export default App;
