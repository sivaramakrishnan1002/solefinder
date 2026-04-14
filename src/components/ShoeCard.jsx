import { motion } from "framer-motion";
import { ArrowRight, Heart, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../utils/formatPrice";

function getDisplaySource(source, fallback = "Marketplace") {
  const safeSource = String(source || "").trim();

  if (!safeSource || safeSource.toLowerCase() === "default") {
    return fallback;
  }

  return safeSource;
}

export default function ShoeCard({
  shoe,
  compact = false,
  darkHighlight = false,
  showPriceDrop = false,
  showCart = false,
  onWishlistToggle,
  onSimilarClick,
}) {
  const displayPrice = formatPrice(shoe.bestPrice ?? shoe.price);
  const displayAiScore =
    shoe.aiScore === undefined || shoe.aiScore === null || shoe.aiScore === ""
      ? "N/A"
      : `${shoe.aiScore}/10`;
  const displayRating =
    shoe.rating === undefined || shoe.rating === null || shoe.rating === ""
      ? "N/A"
      : Number(shoe.rating).toFixed(2);
  const priceDropText =
    Number(shoe.priceDrop) > 0 ? formatPrice(shoe.priceDrop) : null;
  const availableSources = Array.isArray(shoe.prices)
    ? [
        ...new Set(
          shoe.prices
            .map((entry) => getDisplaySource(entry?.platform || entry?.source, "Marketplace"))
            .filter(Boolean)
        ),
      ]
    : Array.isArray(shoe.marketplaces)
      ? [
          ...new Set(
            shoe.marketplaces
              .map((entry) => getDisplaySource(entry?.marketplace || entry?.platform, "Marketplace"))
              .filter(Boolean)
          ),
        ]
    : [];

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`group overflow-hidden rounded-[28px] border shadow-md transition duration-300 hover:shadow-xl ${
        darkHighlight
          ? "border-zinc-800 bg-zinc-900 text-white"
          : "border-gray-200 bg-white text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
      }`}
    >
      <div className={`relative ${compact ? "h-52" : "h-64"} overflow-hidden`}>
        <img
          src={shoe.image}
          alt={shoe.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/no-image.png";
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-white/10" />
        <button
          type="button"
          onClick={onWishlistToggle}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25"
        >
          <Heart size={18} />
        </button>
        <div className="absolute bottom-4 right-4 text-white">
          <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-right backdrop-blur-md">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60">
              AI Score
            </div>
            <div className="text-lg font-bold">{displayAiScore}</div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <h3 className="font-display text-2xl font-bold">{shoe.name}</h3>
          <div className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            {shoe.category}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="mt-1 text-2xl font-bold">
              {Array.isArray(shoe.prices) && shoe.prices.length > 1
                ? `From ${displayPrice}`
                : displayPrice}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {availableSources.length > 0
                ? `Available on ${availableSources.join(", ")}`
                : "Available now"}
            </div>
            {(shoe.reviewSummary?.positive || shoe.reviewSummary?.negative) ? (
              <div className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                {shoe.reviewSummary?.positive ?? 0} positive • {shoe.reviewSummary?.negative ?? 0} negative
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-500">
            <Star size={16} className="fill-current" />
            {displayRating}
          </div>
        </div>

        {shoe.drop || shoe.weight ? (
          <div className="grid gap-3 text-sm text-gray-600 dark:text-zinc-400 sm:grid-cols-2">
            {shoe.drop ? (
              <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-zinc-800/80">
                <div className="text-xs uppercase tracking-[0.18em]">Drop</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                  {shoe.drop}
                </div>
              </div>
            ) : null}
            {shoe.weight ? (
              <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-zinc-800/80">
                <div className="text-xs uppercase tracking-[0.18em]">Weight</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white">
                  {shoe.weight}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {showPriceDrop ? (
          <p className="text-sm text-zinc-400">
            Price dropped by {priceDropText || "N/A"} this week
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Link
            to={`/product/${shoe.id}`}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              darkHighlight
                ? "bg-white text-gray-900 hover:bg-zinc-100"
                : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-zinc-100"
            }`}
          >
            View Details
            <ArrowRight size={16} />
          </Link>
          {onSimilarClick ? (
            <button
              type="button"
              onClick={() => onSimilarClick(shoe)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800"
            >
              View Similar
            </button>
          ) : null}
          {showCart ? (
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-black text-white transition hover:bg-zinc-900 dark:bg-zinc-800"
            >
              <ShoppingCart size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

