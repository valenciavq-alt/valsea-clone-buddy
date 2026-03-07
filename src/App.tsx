import Dashboard from "./pages/Dashboard";
import { ToastProvider } from "./components/Toast";

// VALSEA Speech Intelligence Platform
function App() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

export default App;
