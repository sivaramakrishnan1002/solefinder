import { ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../utils/formatPrice";

export default function ComparePreview({ products = [], loading = false }) {
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <section className="surface-card overflow-hidden p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
            Compare
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            See how your top contenders stack up before you commit
          </h2>
          <p className="mt-3 text-base leading-7 text-gray-600 dark:text-zinc-400">
            Midsole feel, energy return, style score, and price all in one premium comparison layer.
          </p>
        </div>
        <Link
          to="/compare"
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-100"
        >
          <ArrowRightLeft size={16} />
          Open comparison
        </Link>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {(loading ? [] : safeProducts.slice(0, 3)).map((shoe) => (
          <div
            key={shoe.id}
            className="rounded-[26px] border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className={`h-2 rounded-full bg-gradient-to-r ${shoe.accent}`} />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-zinc-500">
                  {shoe.brand}
                </div>
                <div className="mt-1 font-display text-2xl font-bold">
                  {shoe.name}
                </div>
              </div>
              <div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-sm font-semibold text-brand-600 dark:text-brand-400">
                {shoe.aiScore || shoe.score || "0.00"}
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-zinc-400">
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900">
                <span>Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPrice(shoe.bestPrice ?? shoe.price)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900">
                <span>Category</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {shoe.category}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900">
                <span>Drop</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {shoe.drop}
                </span>
              </div>
            </div>
          </div>
        ))}
        {loading
          ? [1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-[26px] border border-gray-200 bg-gray-50 p-4 animate-pulse dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="h-2 rounded-full bg-gray-200 dark:bg-zinc-800" />
                <div className="mt-4 h-24 rounded-2xl bg-gray-200 dark:bg-zinc-800" />
              </div>
            ))
          : null}
      </div>
    </section>
  );
}
