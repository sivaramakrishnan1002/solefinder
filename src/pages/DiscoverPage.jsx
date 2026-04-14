import { Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import ShoeCard from "../components/ShoeCard";
import { filterProducts, getRecommendations } from "../services/api";
import { formatPrice } from "../utils/formatPrice";

const categoryOptions = ["All", "Running", "Casual", "Sneakers", "Sports", "Training", "Other"];
const genderOptions = ["All", "Men", "Women", "Unisex"];
const sortOptions = [
  { value: "ai", label: "AI Recommended" },
  { value: "priceLow", label: "Price: Low to High" },
  { value: "priceHigh", label: "Price: High to Low" },
  { value: "rating", label: "Rating: High to Low" },
  { value: "popularity", label: "Popularity" },
  { value: "discount", label: "Best Discount" },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRating, setSelectedRating] = useState("0");
  const [sortBy, setSortBy] = useState("ai");
  const [maxPrice, setMaxPrice] = useState(0);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [filterMeta, setFilterMeta] = useState({
    brands: [],
    categories: [],
    genders: [],
    maxPrice: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    preferredBrands: [],
    category: "Running",
    maxPrice: 6000,
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const safeProducts = Array.isArray(products) ? products : [];
  const availableBrands = useMemo(
    () => (Array.isArray(filterMeta.brands) ? filterMeta.brands : []),
    [filterMeta.brands]
  );
  const sliderMax = Math.max(Number(filterMeta.maxPrice) || 0, 1000);

  useEffect(() => {
    setPage(1);
  }, [search, selectedBrand, selectedCategory, selectedGender, selectedRating, sortBy, maxPrice]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const results = await filterProducts({
          search,
          brands: selectedBrand !== "All" ? [selectedBrand] : [],
          category: selectedCategory === "All" ? "" : selectedCategory,
          gender: selectedGender === "All" ? "" : selectedGender,
          rating: Number(selectedRating) > 0 ? Number(selectedRating) : undefined,
          maxPrice: maxPrice > 0 ? maxPrice : undefined,
          sort: sortBy,
          page,
          limit: 15,
        });

        if (active) {
          setProducts(Array.isArray(results.products) ? results.products : []);
          setPagination({
            total: Number(results.total) || 0,
            page: Number(results.page) || 1,
            totalPages: Number(results.totalPages) || 1,
          });
          setFilterMeta(
            results.filters || {
              brands: [],
              categories: [],
              genders: [],
              maxPrice: 0,
            }
          );
          setMaxPrice((current) => {
            const datasetMax = Number(results.filters?.maxPrice) || 0;
            if (!current && datasetMax > 0) {
              return datasetMax;
            }
            return datasetMax > 0 ? Math.min(current || datasetMax, datasetMax) : current;
          });
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load products");
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [maxPrice, page, search, selectedBrand, selectedCategory, selectedGender, selectedRating, sortBy]);

  async function handleRecommend(event) {
    event.preventDefault();

    try {
      setRecommendLoading(true);
      setRecommendError("");
      const result = await getRecommendations({
        preferredBrands:
          form.preferredBrands?.length > 0
            ? form.preferredBrands
            : selectedBrand !== "All"
              ? [selectedBrand]
              : [],
        category: form.category,
        maxPrice: Number(form.maxPrice),
      });
      setRecommendations(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setRecommendError(requestError.message || "Unable to fetch recommendations");
    } finally {
      setRecommendLoading(false);
    }
  }

  async function handleViewSimilar(shoe) {
    const targetId = shoe?._id || shoe?.id;
    if (!targetId) return;
    navigate(`/similar/${targetId}`);
  }

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Discover"
        title="Explore a polished catalog of premium recommendations"
        description="Filter by use case, feel, and price to shape a shortlist that still feels editorial rather than overwhelming."
      />

      {recommendations.length > 0 ? (
        <section className="surface-card p-6">
          <div className="mb-5">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
              AI Recommended
            </div>
            <h3 className="mt-2 font-display text-3xl font-bold">
              Shoes ranked for your budget and intent
            </h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((shoe) => (
              <ShoeCard
                key={`rec-${shoe._id || shoe.id}`}
                shoe={shoe}
                compact
                onSimilarClick={handleViewSimilar}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="surface-card h-fit p-6 dark:bg-zinc-900">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <SlidersHorizontal size={18} />
            </div>
            Filters
          </div>

          <div className="mt-8 space-y-6">
            <div className="text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Brand</span>
              <select
                value={selectedBrand}
                onChange={(event) => setSelectedBrand(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="All">All</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Category</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Gender</span>
              <select
                value={selectedGender}
                onChange={(event) => setSelectedGender(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Minimum rating</span>
              <select
                value={selectedRating}
                onChange={(event) => setSelectedRating(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {["0", "3", "4", "4.5"].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating === "0" ? "Any rating" : `${rating}+`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[24px] bg-gray-100 p-4 dark:bg-zinc-950">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-zinc-400">
                <span>Max price</span>
                <span>{formatPrice(maxPrice || sliderMax)}</span>
              </div>
              <input
                type="range"
                min="1000"
                max={sliderMax}
                step="250"
                value={maxPrice || sliderMax}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="mt-4 h-2 w-full cursor-pointer accent-brand-500"
              />
            </div>
          </div>

          <form
            onSubmit={handleRecommend}
            className="mt-10 space-y-4 rounded-[28px] bg-gray-100 p-5 dark:bg-zinc-950"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                <Sparkles size={14} />
                Recommendation
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-zinc-400">
                Ask the AI ranking engine for a shortlist matched to your budget and intent.
              </p>
            </div>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {["Running", "Casual", "Sneakers", "Sports", "Training", "Other"].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block text-gray-600 dark:text-zinc-400">Budget</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.maxPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, maxPrice: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-100"
            >
              {recommendLoading ? "Scoring recommendations..." : "Get recommendations"}
            </button>
          </form>
        </aside>

        <div className="space-y-6">
          <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search shoes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:bg-zinc-950 dark:text-zinc-400">
              {loading ? "Refreshing..." : `${pagination.total} results`}
            </div>
          </div>

          {recommendError ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              {recommendError}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="h-[380px] animate-pulse rounded-[28px] bg-gray-100 dark:bg-zinc-900"
                  />
                ))
              : safeProducts.map((shoe) => (
                  <ShoeCard
                    key={shoe._id || shoe.id}
                    shoe={shoe}
                    compact
                    onSimilarClick={handleViewSimilar}
                  />
                ))}
          </div>
          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-[28px] border border-gray-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm text-gray-600 dark:text-zinc-400">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages || 1, current + 1)
                    )
                  }
                  className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        </div>
      </div>
    </PageTransition>
  );
}
