import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const [sessions, setSessions] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toggleHidden, setToggleHidden] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    refreshSessions();
  }, []);

  const refreshSessions = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/sessions");
      const data = await res.json();
      setSessions(data || []);
    } catch (e) {
      setSessions([]);
    }
  };

  const createNew = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("http://localhost:5000/api/new-chat", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Server returned ${res.status}`);
      }

      const data = await res.json();
      await refreshSessions();
      navigate(`/chat/${data.sessionId}`);
    } catch (e) {
      console.error("Failed to create new chat", e);
      alert(
        "Failed to create new chat. Check that the backend is running (http://localhost:5000) and try again."
      );
    }
  };

  const handleRename = async (id, currentTitle) => {
    const newTitle = window.prompt("Rename session", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      const res = await fetch(`http://localhost:5000/api/session/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Rename failed");
      await refreshSessions();
    } catch (e) {
      console.error(e);
      alert("Failed to rename session");
    }
  };

  const handleDelete = async (id) => {
    // Optimistically update UI so deletion appears immediate.
    const optimistic = sessions
      .filter((s) => s.id !== id)
      .map((s, i) => ({ id: `session-${i}`, title: s.title }));

    setSessions(optimistic);

    // Navigate to last session or home immediately so UI reflects deletion.
    if (optimistic.length > 0) {
      navigate(`/chat/${optimistic[optimistic.length - 1].id}`);
    } else {
      navigate("/");
    }
    setMobileOpen(false);

    try {
      const res = await fetch(`http://localhost:5000/api/session/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Failed to delete session on server", await res.text());
        // Roll back: refresh from server to restore accurate state
        await refreshSessions();
      } else {
        // sync with server canonical list (server may re-index IDs)
        await refreshSessions();
      }
    } catch (e) {
      console.error(e);
      // Roll back on network error
      await refreshSessions();
    }
  };

  // Toggle sidebar visibility: on small screens toggle mobile overlay, on desktop toggle collapse
  const toggleSidebarVisibility = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((c) => !c);
    }
    // hide the hamburger after clicking
    setToggleHidden(true);
  };

  // Ensure sidebar is visible (used when clicking the app logo)
  const showSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(true);
    }
    setCollapsed(false);
    // reveal the hamburger when showing sidebar via logo
    setToggleHidden(false);
  };

  return (
    <>
      {/* Mobile hamburger - shown on small screens */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white dark:bg-gray-900 rounded shadow"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        ☰
      </button>

      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } bg-gray-100 dark:bg-gray-800 p-2 border-r transition-all duration-200 flex flex-col ${
          mobileOpen ? "fixed left-0 top-0 h-full z-40 shadow-lg" : "relative"
        }`}
        style={{
          display: mobileOpen || window.innerWidth >= 768 ? undefined : "none",
        }}
      >
        {mobileOpen && (
          <div className="flex items-center justify-end mb-2">
            <button
              className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top bar: app logo/title on left, hamburger toggle on right */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div
            className="flex items-center gap-2 ml-1 cursor-pointer"
            onClick={() => {
              navigate("/");
              showSidebar();
            }}
          >
            {/* Inline SVG app logo (chat bubble) placed on the left of the header */}
            <div className="w-10 h-10 rounded-md bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                width="20"
                height="20"
                aria-hidden
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
                  fill="white"
                  opacity="0.95"
                />
              </svg>
            </div>

            {!collapsed && (
              <div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  ChatApp
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Conversational Assistant
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              className={`${
                toggleHidden ? "hidden " : ""
              }p-2 rounded bg-gray-200 dark:bg-gray-700 text-sm`}
              onClick={toggleSidebarVisibility}
              aria-label="Toggle sidebar"
            >
              {/* slide-bar / hamburger icon on the right */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="3"
                  y="16"
                  width="18"
                  height="2"
                  rx="1"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          className="w-full bg-blue-600 text-white p-2 rounded mb-3"
          onClick={createNew}
        >
          {collapsed ? "+" : "+ New Chat"}
        </button>

        {!collapsed && (
          <>
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
              History
            </h3>

            <ul className="flex-1 overflow-y-auto">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-between"
                >
                  <div
                    onClick={() => {
                      navigate(`/chat/${s.id}`);
                      setMobileOpen(false);
                    }}
                    className="flex-1 cursor-pointer"
                  >
                    {s.title}
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <button
                      title="Rename"
                      onClick={() => handleRename(s.id, s.title)}
                      className="p-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      ✏️
                    </button>
                    <button
                      title="Delete"
                      onClick={() => handleDelete(s.id)}
                      className="p-1 text-sm rounded hover:bg-red-100 dark:hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer: user profile moved to bottom */}
            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center gap-2 p-2">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center">
                  {/* professional user icon (SVG) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                  >
                    <path
                      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                      fill="#3b82f6"
                    />
                    <path
                      d="M4 20a8 8 0 0 1 16 0"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {!collapsed && (
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      User Name
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      user@example.com
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
