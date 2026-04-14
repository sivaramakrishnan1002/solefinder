import { Link } from "react-router-dom";
import SectionHeading from "../SectionHeading";
import ShoeCard from "../ShoeCard";

export default function RecommendationGrid({ products = [], loading = false, error = "" }) {
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="For you"
        title="Refined recommendations built around how you move"
        description="A premium shortlist spanning daily trainers, all-day luxury silhouettes, and versatile performance picks."
        action={
          <Link
            to="/discover"
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
          >
            View full catalog
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? [1, 2, 3].map((item) => (
              <div
                key={item}
                className="surface-card h-[420px] animate-pulse bg-gray-100 dark:bg-zinc-900"
              />
            ))
          : safeProducts.slice(0, 3).map((shoe) => <ShoeCard key={shoe.id} shoe={shoe} />)}
      </div>
      {!loading && error ? (
        <p className="text-sm text-rose-500">{error}</p>
      ) : null}
    </section>
  );
}
