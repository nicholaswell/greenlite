import React from "react";
import { Link, useLocation } from "react-router-dom";
import useTheme from "../hooks/usetheme";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme, ambient, toggleAmbient } = useTheme();

  const navItems = [
    { to: "/",          label: "Overview" },
    { to: "/calendar",  label: "Calendar" },
    { to: "/journal",   label: "Journal" },
    { to: "/jobs",      label: "Jobs" },
    { to: "/goals",     label: "Goals" },
    { to: "/notes",     label: "Notes" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>GREENLITE</h1>
        <p>Personal Dashboard</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={"nav-link" + (pathname === item.to ? " active" : "")}
            aria-current={pathname === item.to ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-controls">
        <div className="control-row">
          <span>Theme</span>
          <button className="pill" onClick={toggleTheme}>
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
        <div className="control-row">
          <span>Ambient</span>
          <button className="pill" onClick={toggleAmbient}>
            {ambient ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="sidebar-footer">v0.1 • personal</div>
    </aside>
  );
}
