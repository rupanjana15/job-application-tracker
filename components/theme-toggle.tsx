"use client";

import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem("jobtrack-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = storedTheme ? storedTheme === "dark" : prefersDark;

    document.documentElement.classList.toggle("dark-theme", nextIsDark);
  }, []);

  function toggleTheme() {
    const nextIsDark = !document.documentElement.classList.contains("dark-theme");

    document.documentElement.classList.toggle("dark-theme", nextIsDark);
    window.localStorage.setItem("jobtrack-theme", nextIsDark ? "dark" : "light");
  }

  return (
    <button className="icon-button theme-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
      <span className="theme-sun" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className="theme-moon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img">
          <path d="M20 14.6A7.8 7.8 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6Z" />
        </svg>
      </span>
    </button>
  );
}
