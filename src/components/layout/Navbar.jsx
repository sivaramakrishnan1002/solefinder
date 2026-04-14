import { motion } from "framer-motion";
import {
  Heart,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "../ThemeToggle";

const links = [
  { to: "/", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/analyze", label: "AI Analyze" },
  { to: "/compare", label: "Compare" },
  { to: "/wishlist", label: "Wishlist" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-gray-200/70 bg-gray-50/75 backdrop-blur-2xl transition-colors duration-500 dark:border-zinc-900 dark:bg-black/65"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-900/20 dark:bg-white dark:text-gray-900">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-tight">
              SoleFinder
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-500">
              <Sparkles size={12} className="text-brand-500" />
              Curated recommendations that feel bespoke
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-full border border-gray-200/80 bg-white/70 p-1.5 shadow-lg shadow-gray-900/5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${isActive ? "nav-link nav-link-active" : "nav-link"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NavLink to="/wishlist" className="icon-button">
            <Heart size={18} />
          </NavLink>
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
