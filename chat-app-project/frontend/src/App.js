import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { useState, useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "light";
    } catch (e) {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="flex h-screen dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="ml-4">
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
          </div>

          <Routes>
            <Route path="/" element={<ChatWindow />} />
            <Route path="/chat/:sessionId" element={<ChatWindow />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
