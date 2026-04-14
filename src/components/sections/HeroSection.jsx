import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroSection({ featured }) {
  if (!featured) {
    return (
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-gray-950 via-gray-900 to-brand-700 text-white shadow-glow">
        <div className="absolute inset-0 bg-hero-grid" />
        <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
              <Sparkles size={16} className="text-brand-300" />
              AI-curated fit intelligence for premium sneaker shopping
            </div>
            <div className="h-14 w-4/5 rounded-2xl bg-white/10" />
            <div className="h-6 w-3/5 rounded-2xl bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="metric-card h-24 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <div className="h-[340px] rounded-[28px] bg-white/10 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-gray-950 via-gray-900 to-brand-700 text-white shadow-glow">
      <div className="absolute inset-0 bg-hero-grid" />
      <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
            <Sparkles size={16} className="text-brand-300" />
            AI-curated fit intelligence for premium sneaker shopping
          </div>

          <div className="max-w-2xl">
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              {featured?.name || "Find the pair that feels made for you."}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
              {featured?.story ||
                "SoleFinder blends editorial curation, performance insights, and smart matching so every recommendation feels personal and high-end."}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-semibold text-gray-900 transition hover:bg-zinc-100"
            >
              Start Discovering
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              Compare Top Picks
            </Link>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-semibold text-white backdrop-blur-md transition-all duration-700 ease-in-out hover:bg-white/15"
            >
              AI Analyze
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Recommendation Accuracy", value: "98%" },
              { label: "Premium Brands Curated", value: "45+" },
              { label: "Pairs Tracked Weekly", value: "1.2k" },
            ].map((item) => (
              <div key={item.label} className="metric-card">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                  {item.label}
                </div>
                <div className="mt-2 text-3xl font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          className="relative transition-all duration-700 ease-in-out"
        >
          <div className="absolute inset-0 rounded-[32px] bg-white/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-white/60">
                  Editor's pick
                </div>
                <div className="mt-2 text-3xl font-bold">{featured.name}</div>
              </div>
              <div className="rounded-2xl bg-brand-400/20 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-brand-100/70">
                  Match score
                </div>
                <div className="text-3xl font-bold">{featured.aiScore || featured.score || "N/A"}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-white/5">
              <img
                src={featured.image}
                alt={featured.name}
                className="h-[340px] w-full object-cover"
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <div className="flex items-center gap-2 text-white/70">
                  <TrendingUp size={16} className="text-brand-300" />
                  Momentum
                </div>
                <div className="mt-3 text-sm leading-7 text-white/80">
                  {featured?.priceInsight || "Tracking this pair for momentum and marketplace value."}
                </div>
              </div>
              <div className="metric-card">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                  Why it fits
                </div>
                <div className="mt-3 text-sm leading-7 text-white/80">
                  {Array.isArray(featured?.explanation) && featured.explanation.length > 0
                    ? featured.explanation.slice(0, 2).join(", ")
                    : "Responsive ride, polished silhouette, and an effortless transition from run to city wear."}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
