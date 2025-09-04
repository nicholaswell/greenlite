import React from "react";
import { Link, useLocation } from "react-router-dom";
import useTheme from "../hooks/usetheme";
import {
  Home,
  Calendar,
  NotebookText,
  BriefcaseBusiness,
  Target,
  StickyNote
} from "lucide-react";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: "/", label: "Home", Icon: Home },
    { to: "/calendar", label: "Calendar", Icon: Calendar },
    { to: "/journal", label: "Journal", Icon: NotebookText },
    { to: "/jobs", label: "Jobs", Icon: BriefcaseBusiness },
    { to: "/goals", label: "Goals", Icon: Target },
    { to: "/notes", label: "Notes", Icon: StickyNote },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>GREENLITE</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={"nav-link" + (pathname === to ? " active" : "")}
            aria-current={pathname === to ? "page" : undefined}
          >
            {/* icon only visible on mobile */}
            <Icon className="icon-mobile" />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-controls">
        <div className="control-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <span>Theme</span>
          <button className="pill" onClick={toggleTheme} style={{ marginTop: 6 }}>
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      <div className="sidebar-footer">v0.1 • personal</div>
    </aside>
  );
}
