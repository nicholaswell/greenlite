import { useEffect, useState } from "react";

const STORAGE_KEY = "gl-theme";   // "light" | "dark"
const AMBIENT_KEY = "gl-ambient"; // "true" | "false"

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export default function useTheme() {
  const [theme, setTheme] = useState(
    localStorage.getItem(STORAGE_KEY) || (systemPrefersDark() ? "dark" : "light")
  );
  const [ambient, setAmbient] = useState(
    localStorage.getItem(AMBIENT_KEY) === "true" // default off unless saved true
  );

  // Keep exactly one theme class on body
  useEffect(() => {
    const body = document.body;
    body.classList.remove("light", "dark");
    body.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Toggle a separate .ambient class
  useEffect(() => {
    const body = document.body;
    body.classList.toggle("ambient", ambient);
    // optional: adjust strength here if you want to override from JS
    // document.documentElement.style.setProperty('--ambient-opacity', ambient ? '.45' : '0');
    localStorage.setItem(AMBIENT_KEY, String(ambient));
  }, [ambient]);

  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme(t => (t === "dark" ? "light" : "dark")),
    ambient,
    setAmbient,
    toggleAmbient: () => setAmbient(a => !a),
  };
}
