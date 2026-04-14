import { motion } from "framer-motion";
import { Activity, ArrowUpRight, ShieldCheck, Waves } from "lucide-react";

const items = [
  {
    icon: Activity,
    title: "Fit intelligence",
    copy: "Recommendations tuned for stride, cushioning preference, and style intent.",
  },
  {
    icon: ShieldCheck,
    title: "Premium curation",
    copy: "Only high-signal releases and best-in-class evergreen models make the cut.",
  },
  {
    icon: Waves,
    title: "Smooth experience",
    copy: "Designed to feel refined across mobile, tablet, and large-screen browsing.",
  },
];

export default function InsightStrip() {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className="surface-card p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon size={24} />
              </div>
              <ArrowUpRight className="text-gray-300 dark:text-zinc-700" />
            </div>
            <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">
              {item.title}
            </h3>
            <p className="mt-3 text-base leading-7 text-gray-600 dark:text-zinc-400">
              {item.copy}
            </p>
          </motion.article>
        );
      })}
    </section>
  );
}
