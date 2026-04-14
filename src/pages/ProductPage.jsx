import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useParams } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import ShoeCard from "../components/ShoeCard";
import {
  getPriceTrend,
  getProductById,
  getProducts,
  trackProductEvent,
} from "../services/api";
import {
  getWishlistIds,
  pushRecentProductId,
  toggleWishlistId,
} from "../services/storage";
import { formatPrice } from "../utils/formatPrice";

export default function ProductPage() {
  const { id } = useParams();
  const [shoe, setShoe] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());
  const [activeImage, setActiveImage] = useState("");
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const [product, allProducts] = await Promise.all([
          getProductById(id),
          getProducts(),
        ]);

        if (!active) {
          return;
        }

        setShoe(product);
        setActiveImage(
          Array.isArray(product?.images) && product.images.length > 0
            ? product.images[0]
            : product?.image || "/no-image.png"
        );
        pushRecentProductId(product.id);
        trackProductEvent(product?._id || product?.id || id, "view", {
          source: "product-page",
        }).catch(() => {});
        const safeProducts = Array.isArray(allProducts)
          ? allProducts
          : Array.isArray(allProducts?.products)
            ? allProducts.products
            : [];
        setRelatedProducts(
          safeProducts.filter((item) => item.id !== product.id).slice(0, 3)
        );

        setTrendLoading(true);
        try {
          const trend = await getPriceTrend(product?._id || product?.id || id);
          if (active) {
            setTrendData(Array.isArray(trend) ? trend : []);
          }
        } catch {
          if (active) {
            setTrendData([]);
          }
        } finally {
          if (active) {
            setTrendLoading(false);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  const related = useMemo(() => relatedProducts, [relatedProducts]);
  const isSaved = shoe ? wishlistIds.includes(shoe.id) : false;
  const galleryImages = useMemo(() => {
    if (!shoe) {
      return [];
    }

    const images = Array.isArray(shoe.images) ? shoe.images : [];
    const fallbackImages = [shoe.image].filter(Boolean);
    return [...new Set([...images, ...fallbackImages])].filter(Boolean);
  }, [shoe]);
  const detailTags = useMemo(
    () =>
      [
        shoe?.category ? `Category: ${shoe.category}` : "",
        shoe?.weight ? `Weight: ${shoe.weight}` : "",
        shoe?.drop ? `Drop: ${shoe.drop}` : "",
      ].filter(Boolean),
    [shoe]
  );
  const priceComparison = useMemo(() => {
    const rawPrices = Array.isArray(shoe?.marketplaces) && shoe.marketplaces.length > 0
      ? shoe.marketplaces.map((entry) => ({
          source: entry.marketplace || entry.platform || entry.source,
          platform: entry.marketplace || entry.platform || entry.source,
          price: entry.currentPrice ?? entry.price,
          link: entry.buyLink || entry.productUrl || "",
          buyLink: entry.buyLink || entry.productUrl || "",
        }))
      : Array.isArray(shoe?.marketplacePrices) && shoe.marketplacePrices.length > 0
        ? shoe.marketplacePrices
        : Array.isArray(shoe?.prices)
          ? shoe.prices
          : [];

    if (!Array.isArray(rawPrices)) {
      return [];
    }

    return [...rawPrices]
      .filter((entry) => Number(entry?.price) > 0)
      .map((entry) => ({
        ...entry,
        link: entry?.buyLink || entry?.link || "",
        source:
          !entry?.platform && (!entry?.source || String(entry.source).toLowerCase() === "default")
            ? "Marketplace"
            : entry.platform || entry.source || "Marketplace",
      }))
      .sort((left, right) => left.price - right.price);
  }, [shoe]);
  const primaryOfferLink =
    priceComparison.find(
      (entry) => Number(entry?.price) === Number(shoe?.bestPrice ?? shoe?.price)
    )?.link ||
    shoe?.productUrl ||
    shoe?.buyLink ||
    priceComparison[0]?.link ||
    shoe?.url ||
    "";
  const safePrimaryOfferLink =
    primaryOfferLink && String(primaryOfferLink).startsWith("http")
      ? primaryOfferLink
      : "";
  const trendSummary = useMemo(() => {
    const safeTrend = Array.isArray(trendData) ? trendData : [];
    if (safeTrend.length === 0) {
      return {
        lowest: null,
        highest: null,
        current: shoe?.bestPrice ?? shoe?.price ?? null,
      };
    }

    const prices = safeTrend.map((entry) => Number(entry?.price) || 0).filter((value) => value > 0);
    return {
      lowest: prices.length > 0 ? Math.min(...prices) : null,
      highest: prices.length > 0 ? Math.max(...prices) : null,
      current: prices.length > 0 ? prices[prices.length - 1] : shoe?.bestPrice ?? shoe?.price ?? null,
    };
  }, [shoe, trendData]);
  const reviewCards = useMemo(
    () =>
      (Array.isArray(shoe?.topReviews) && shoe.topReviews.length > 0
        ? shoe.topReviews
        : Array.isArray(shoe?.reviews)
          ? shoe.reviews
          : Array.isArray(shoe?.reviewHighlights)
            ? shoe.reviewHighlights.map((text) => ({ text, rating: shoe?.rating || 4 }))
            : []
      ).slice(0, 6),
    [shoe]
  );
  const productSpecs = useMemo(
    () =>
      [
        shoe?.material ? { label: "Material", value: shoe.material } : null,
        shoe?.soleType ? { label: "Sole", value: shoe.soleType } : null,
        shoe?.weight ? { label: "Weight", value: shoe.weight } : null,
        shoe?.drop ? { label: "Drop", value: shoe.drop } : null,
      ].filter(Boolean),
    [shoe]
  );

  function handleWishlistToggle() {
    if (!shoe) return;
    const next = toggleWishlistId(shoe.id);
    setWishlistIds(next);
    trackProductEvent(shoe._id || shoe.id, "wishlist", {
      saved: next.includes(shoe.id),
    }).catch(() => {});
  }

  function openExternalLink(url) {
    if (!url || !String(url).startsWith("http")) {
      return;
    }

    trackProductEvent(shoe?._id || shoe?.id, "click", {
      destination: url,
    }).catch(() => {});
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <PageTransition className="space-y-8">
        <div className="h-[520px] animate-pulse rounded-[34px] bg-zinc-900" />
        <div className="h-72 animate-pulse rounded-[28px] bg-gray-100 dark:bg-zinc-900" />
      </PageTransition>
    );
  }

  if (error || !shoe) {
    return (
      <PageTransition className="space-y-6">
        <div className="surface-card p-8">
          <h1 className="font-display text-3xl font-bold">Product unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-zinc-400">
            {error || "We couldn't load this product right now."}
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[0.7fr_0.95fr_0.75fr]">
        <div className="surface-card p-5">
          <div className="overflow-hidden rounded-[28px] border border-gray-200 dark:border-zinc-800">
            <img
              src={activeImage || shoe.image}
              alt={shoe.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/no-image.png";
              }}
              className="h-[420px] w-full object-cover"
            />
          </div>
          {galleryImages.length > 1 ? (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {galleryImages.slice(0, 8).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`overflow-hidden rounded-2xl border ${
                    activeImage === image
                      ? "border-brand-500"
                      : "border-gray-200 dark:border-zinc-800"
                  } bg-gray-50 transition hover:-translate-y-0.5 dark:bg-zinc-950`}
                >
                  <img
                    src={image}
                    alt={`${shoe.name} view ${index + 1}`}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          {Array.isArray(shoe.colorsAvailable) && shoe.colorsAvailable.length > 0 ? (
            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                Available Colors
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {shoe.colorsAvailable.map((color) => (
                  <span
                    key={color}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm transition hover:border-brand-400 dark:border-zinc-800"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {Array.isArray(shoe.sizesAvailable) && shoe.sizesAvailable.length > 0 ? (
            <div className="mt-6">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                Sizes
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {shoe.sizesAvailable.map((size) => (
                  <span
                    key={size}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm transition hover:border-brand-400 dark:border-zinc-800"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-[34px] border border-zinc-800 bg-zinc-950">
          <div className={`h-full bg-gradient-to-br ${shoe.accent} p-[1px]`}>
            <div className="rounded-[33px] bg-zinc-950">
              <div className="p-6 sm:p-8">
                <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-md">
                  {shoe.brand} premium recommendation
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {shoe.brand} {shoe.modelName || shoe.name}
                </h1>

                <div className="mt-8 space-y-3">
                  {detailTags.map((tag) => (
                    <div
                      key={tag}
                      className="rounded-[24px] border border-zinc-800 bg-zinc-900 p-4 text-lg font-semibold text-white"
                    >
                      {tag}
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                    Best suited for
                  </div>
                  <div className="mt-4 space-y-3">
                    {(Array.isArray(shoe.explanation) ? shoe.explanation : []).length > 0 ? (
                      shoe.explanation.map((reason) => (
                        <div
                          key={reason}
                          className="rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200"
                        >
                          {reason}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                        No explanation available yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 rounded-[24px] border border-zinc-800 bg-zinc-900 p-5">
                  <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                    AI Score
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold text-white">
                        {Number(shoe.aiScore || 0).toFixed(2)} / 10
                      </div>
                      <div className="mt-2 text-sm text-zinc-400">
                        Confidence: {shoe.confidenceLevel || "Medium"}
                      </div>
                    </div>
                    <div className="h-3 w-32 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-brand-500 to-cyan-400"
                        style={{ width: `${Math.max(8, Math.min(100, (Number(shoe.aiScore || 0) / 10) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                    Description
                  </div>
                  <p className="mt-4 max-w-xl text-base leading-8 text-zinc-400">
                    {shoe.description || shoe.story || "No description available yet."}
                  </p>
                </div>

                {productSpecs.length > 0 ? (
                  <div className="mt-8">
                    <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                      Specifications
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {productSpecs.map((spec) => (
                        <div
                          key={spec.label}
                          className="rounded-[24px] border border-zinc-800 bg-zinc-900 px-5 py-4"
                        >
                          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            {spec.label}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-white">{spec.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-8">
                  <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                    Why SoleFinder recommends this
                  </div>
                  <div className="mt-4 space-y-3">
                    {(Array.isArray(shoe.reasons) && shoe.reasons.length > 0 ? shoe.reasons : Array.isArray(shoe.explanation) ? shoe.explanation : ["Strong overall fit for this category"]).map((reason) => (
                      <div
                        key={reason}
                        className="rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {(Array.isArray(shoe.features) ? shoe.features : []).map((feature) => (
                    <div
                      key={feature}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300"
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                  Purchase options
                </div>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  Ready to shortlist
                </h2>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-500">
                <Star size={16} className="fill-current" />
                {Number(shoe.rating || 0).toFixed(2)}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                  Rating Highlight
                </div>
                <div className="mt-2 text-2xl font-bold">{Number(shoe.rating || 0).toFixed(2)}/5</div>
              </div>
              <button
                onClick={handleWishlistToggle}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-4 font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-900"
              >
                <Heart size={18} />
                {isSaved ? "Saved to wishlist" : "Save to wishlist"}
              </button>
              {safePrimaryOfferLink ? (
                <button
                  type="button"
                  onClick={() => openExternalLink(safePrimaryOfferLink)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-4 font-semibold text-white transition hover:bg-brand-600"
                >
                  Buy now
                </button>
              ) : null}
              {priceComparison.slice(0, 3).map((entry) =>
                entry.link && String(entry.link).startsWith("http") ? (
                  <button
                    type="button"
                    key={`${entry.source}-${entry.price}-buy`}
                    onClick={() => openExternalLink(entry.link)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-4 font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-900"
                  >
                    Buy on {entry.source}
                  </button>
                ) : null
              )}
            </div>

          </div>

          <div className="surface-card p-6">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                Available Prices
              </div>
              <div className="mt-2 font-display text-2xl font-bold">
                Best Price: {formatPrice(shoe.bestPrice ?? shoe.price)}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {priceComparison.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  No marketplace prices are available right now.
                </div>
              ) : (
                priceComparison.map((entry) => (
                  <div
                    key={`${entry.source}-${entry.price}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.source || "Marketplace"}
                        {Number(entry.price) === Number(shoe.bestPrice ?? shoe.price) ? (
                          <span className="ml-2 text-xs text-emerald-400">Best Deal</span>
                        ) : null}
                      </span>
                      {entry.link && String(entry.link).startsWith("http") ? (
                        <a
                          href={entry.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 transition hover:underline"
                        >
                          Buy Now {"->"}
                        </a>
                      ) : null}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatPrice(entry.price)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {shoe.priceInsight || "No trend available"}
            </div>
          </div>

        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card p-6 sm:p-8">
          <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
            Review highlights
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">
            {shoe.totalReviews ? `${shoe.totalReviews}+ review signals` : "Live customer snippets"}
          </h2>
          <div className="mt-6 grid gap-4">
            {reviewCards.map((review, index) => (
              <div
                key={`${review.text}-${index}`}
                className="rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="text-sm leading-7 text-gray-700 dark:text-zinc-300">
                  {review.text}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-500">
                  {review.rating ? `${Number(review.rating).toFixed(2)} / 5` : "Review insight"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
            Product intelligence
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">
            Technical snapshot
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {productSpecs.length > 0 ? (
              productSpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                    {spec.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold">{spec.value}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                No specification signals available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="surface-card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
              Price trend
            </div>
            <div className="mt-2 font-display text-3xl font-bold">
              {shoe.priceInsight || "No trend available"}
            </div>
            <p className="mt-4 max-w-xl text-base leading-8 text-gray-600 dark:text-zinc-400">
              Track how the best marketplace price has been moving so the next purchase feels informed, not impulsive.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Lowest", value: trendSummary.lowest },
              { label: "Highest", value: trendSummary.highest },
              { label: "Current", value: trendSummary.current },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -4 }}
                className="rounded-[24px] border border-gray-200 bg-gray-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                  {item.label}
                </div>
                <div className="mt-4 text-2xl font-bold">
                  {item.value ? formatPrice(item.value) : "N/A"}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-8 h-72 rounded-[28px] border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          {trendLoading ? (
            <div className="h-full animate-pulse rounded-[24px] bg-gray-100 dark:bg-zinc-900" />
          ) : trendData.length <= 1 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-zinc-400">
              Stable price trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.2)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  stroke="#71717a"
                />
                <YAxis stroke="#71717a" tickFormatter={(value) => formatPrice(value)} />
                <Tooltip
                  formatter={(value) => formatPrice(value)}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
            Related picks
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
            You might also like
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {related.map((item) => (
            <ShoeCard key={item.id} shoe={item} compact />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}

