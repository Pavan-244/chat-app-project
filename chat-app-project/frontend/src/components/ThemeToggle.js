export default function ThemeToggle({ theme, setTheme }) {
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      // ignore
    }
  };

  return (
    <button
      className="mb-4 bg-gray-300 dark:bg-gray-700 text-black dark:text-white px-4 py-1 rounded"
      onClick={toggle}
    >
      {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );
}
