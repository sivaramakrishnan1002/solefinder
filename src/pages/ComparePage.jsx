import { useEffect, useMemo, useState } from "react";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import useProducts from "../hooks/useProducts";
import { compareProducts } from "../services/api";
import { getCompareIds, setCompareIds } from "../services/storage";
import { formatPrice } from "../utils/formatPrice";

const comparisonRows = [
  { label: "Best Price", render: (shoe) => formatPrice(shoe.bestPrice ?? shoe.price) },
  { label: "Rating", render: (shoe) => `${Number(shoe.rating || 0).toFixed(2)} / 5` },
  { label: "AI Score", render: (shoe) => `${Number(shoe.aiScore || 0).toFixed(2)} / 10` },
  { label: "Confidence", render: (shoe) => shoe.confidenceLevel || "Medium" },
  { label: "Category", render: (shoe) => shoe.category || "Other" },
  {
    label: "Feature match",
    render: (shoe) =>
      Array.isArray(shoe.features) && shoe.features.length > 0
        ? shoe.features.slice(0, 3).join(", ")
        : "N/A",
  },
];

export default function ComparePage() {
  const { products, loading, error } = useProducts({ limit: 100 });
  const safeProducts = Array.isArray(products) ? products : [];
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState({ products: [], winner: null, metrics: {} });
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    if (safeProducts.length === 0) return;
    const defaults = safeProducts.slice(0, 3).map((shoe) => String(shoe._id || shoe.id));
    setSelectedIds(getCompareIds(defaults));
  }, [safeProducts]);

  useEffect(() => {
    let active = true;

    async function loadComparison() {
      const ids = selectedIds.filter(Boolean);
      if (ids.length < 2) {
        return;
      }

      try {
        setCompareLoading(true);
        setCompareError("");
        const result = await compareProducts(ids);
        if (active) {
          setComparison(result);
        }
      } catch (loadError) {
        if (active) {
          setCompareError(loadError.message || "Failed to compare products");
        }
      } finally {
        if (active) {
          setCompareLoading(false);
        }
      }
    }

    loadComparison();
    return () => {
      active = false;
    };
  }, [selectedIds]);

  const compareShoes = useMemo(
    () => (Array.isArray(comparison.products) ? comparison.products : []),
    [comparison.products]
  );

  function handleSelectionChange(index, value) {
    const next = [...selectedIds];
    next[index] = value;
    setSelectedIds(next);
    setCompareIds(next);
  }

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Compare"
        title="A cleaner way to evaluate your finalists"
        description="Every contender is measured side by side so the decision feels confident, not cluttered."
      />

      {!loading ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <label key={slot} className="surface-card p-5">
              <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                Product {slot + 1}
              </span>
              <select
                value={selectedIds[slot] || ""}
                onChange={(event) => handleSelectionChange(slot, event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {safeProducts.map((shoe) => {
                  const value = String(shoe._id || shoe.id);
                  return (
                    <option key={value} value={value}>
                      {shoe.brand} {shoe.name}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </section>
      ) : null}

      <section className="surface-card overflow-hidden">
        {loading || compareLoading ? (
          <div className="p-6">
            <div className="h-80 animate-pulse rounded-[28px] bg-gray-100 dark:bg-zinc-900" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-100/70 dark:bg-zinc-900">
                <tr>
                  <th className="px-6 py-5 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                    Metric
                  </th>
                  {compareShoes.map((shoe) => (
                    <th
                      key={shoe._id || shoe.id}
                      className="border-l border-gray-200 px-6 py-5 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={shoe.image || "/no-image.png"}
                          alt={shoe.name}
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/no-image.png";
                          }}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                        <div>
                          <div className="text-sm text-gray-500 dark:text-zinc-500">{shoe.brand}</div>
                          <div className="mt-2 font-display text-2xl font-bold">{shoe.name}</div>
                          <div className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                            {formatPrice(shoe.bestPrice ?? shoe.price)} · {Number(shoe.rating || 0).toFixed(2)} / 5
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.label}
                    className={
                      rowIndex % 2 === 0
                        ? "bg-white dark:bg-zinc-950"
                        : "bg-gray-50/80 dark:bg-zinc-900"
                    }
                  >
                    <td className="px-6 py-5 font-semibold text-gray-500 dark:text-zinc-400">{row.label}</td>
                    {compareShoes.map((shoe) => (
                      <td
                        key={`${shoe._id || shoe.id}-${row.label}`}
                        className="border-l border-gray-200 px-6 py-5 text-lg font-medium dark:border-zinc-800"
                      >
                        {row.render(shoe)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error || compareError ? <p className="text-sm text-rose-500">{error || compareError}</p> : null}

      {comparison.winner ? (
        <section className="surface-card p-6">
          <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
            Comparison winner
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <h2 className="font-display text-3xl font-bold">
              {comparison.winner.brand} {comparison.winner.name}
            </h2>
            <div className="rounded-full bg-brand-500/10 px-3 py-1.5 text-sm font-semibold text-brand-500">
              {Number(comparison.winner.aiScore || 0).toFixed(2)} / 10
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(Array.isArray(comparison.winner.reasons) ? comparison.winner.reasons : []).map((reason) => (
              <div
                key={reason}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              >
                {reason}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}


