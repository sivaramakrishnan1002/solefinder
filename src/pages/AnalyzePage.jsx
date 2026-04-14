import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import { analyzeProductUrl } from "../services/api";
import { formatPrice } from "../utils/formatPrice";

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();
    const trimmedUrl = String(url || "").trim();
    const normalizedUrl = trimmedUrl.toLowerCase();

    if (!trimmedUrl) {
      setError("Please paste a valid product URL");
      setResult(null);
      return;
    }

    if (
      !normalizedUrl.includes("amazon") &&
      !normalizedUrl.includes("amzn.in") &&
      !normalizedUrl.includes("myntra") &&
      !normalizedUrl.includes("flipkart") &&
      !normalizedUrl.includes("ajio")
    ) {
      setError("Only Amazon, Myntra, Flipkart, and Ajio links are supported");
      setResult(null);
      return;
    }

    if (normalizedUrl.includes("flipkart") && !normalizedUrl.includes("flipkart.com/")) {
      setError("Please enter a valid Flipkart product link");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await analyzeProductUrl(trimmedUrl);
      setResult(response);
    } catch (requestError) {
      setError(
        requestError.message?.includes("Flipkart")
          ? "We couldn't analyze that Flipkart product right now. Please try another product link."
          : requestError.message || "Unable to analyze this URL"
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="AI Analyze"
        title="Analyze a marketplace product before you buy"
        description="Currently supports Amazon, Myntra, Flipkart, and Ajio product links."
      />

      <section className="surface-card p-6 sm:p-8">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-gray-600 dark:text-zinc-400">
              Paste product link
            </span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.amazon.in/... or https://amzn.in/... or https://www.myntra.com/... or https://www.flipkart.com/..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {error}
          </div>
        ) : null}
      </section>

      {result ? (
        <section className="surface-card overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[28px] border border-gray-200 dark:border-zinc-800">
              <img
                src={result.image || "/no-image.png"}
                alt={result.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/no-image.png";
                }}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-5">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                  {result.brand}
                </div>
                <h2 className="mt-2 font-display text-4xl font-bold">
                  {result.name}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] bg-gray-100 p-4 dark:bg-zinc-950">
                  <div className="text-sm text-gray-500 dark:text-zinc-500">Price</div>
                  <div className="mt-2 text-2xl font-bold">
                    {formatPrice(result.bestPrice ?? result.price)}
                  </div>
                </div>
                <div className="rounded-[24px] bg-gray-100 p-4 dark:bg-zinc-950">
                  <div className="text-sm text-gray-500 dark:text-zinc-500">AI Score</div>
                  <div className="mt-2 text-2xl font-bold">{result.aiScore || "N/A"}</div>
                </div>
                <div className="rounded-[24px] bg-gray-100 p-4 dark:bg-zinc-950">
                  <div className="text-sm text-gray-500 dark:text-zinc-500">Rating</div>
                  <div className="mt-2 text-lg font-semibold">
                    {result.rating ? Number(result.rating).toFixed(2) : "N/A"}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] bg-gray-100 p-4 dark:bg-zinc-950">
                <div className="text-sm text-gray-500 dark:text-zinc-500">Verdict</div>
                <div className="mt-2 text-lg font-semibold">
                  {result.verdict || result.recommendation}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                    Why this product stands out
                  </div>
                  <div className="mt-4 space-y-3">
                    {(Array.isArray(result.explanation) ? result.explanation : []).length > 0 ? (
                      result.explanation.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-zinc-900"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 dark:bg-zinc-900 dark:text-zinc-400">
                        No explanation available yet.
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                    Review summary
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-zinc-900">
                      Positive: {result.reviewSummary?.positive ?? 0}
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-zinc-900">
                      Negative: {result.reviewSummary?.negative ?? 0}
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-zinc-900">
                      {result.priceInsight || "No trend available"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-sm uppercase tracking-[0.18em] text-gray-500 dark:text-zinc-500">
                  Available Prices
                </div>
                <div className="mt-4 space-y-3">
                  {(
                    Array.isArray(result.marketplaces) && result.marketplaces.length > 0
                      ? result.marketplaces.map((entry) => ({
                          ...entry,
                          platform: entry.marketplace || entry.platform || entry.source,
                          source: entry.marketplace || entry.platform || entry.source,
                          price: entry.currentPrice ?? entry.price,
                          link: entry.buyLink || entry.productUrl || "",
                        }))
                      : Array.isArray(result.prices)
                        ? result.prices
                        : []
                  ).map((priceEntry, index) => (
                    <div
                      key={`${priceEntry.source || "Unknown"}-${priceEntry.price}-${index}`}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 dark:bg-zinc-900"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                           {priceEntry.platform ||
                           (priceEntry.source && String(priceEntry.source).toLowerCase() !== "default"
                             ? priceEntry.source
                             : "Marketplace")}
                        </span>
                        {priceEntry.link && String(priceEntry.link).startsWith("http") ? (
                          <a
                            href={priceEntry.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 transition hover:underline"
                          >
                            Buy Now {"->"}
                          </a>
                        ) : null}
                      </div>
                      <span className="font-semibold">
                        {formatPrice(priceEntry.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {result.buyLink && String(result.buyLink).startsWith("http") ? (
                <a
                  href={result.buyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600"
                >
                  Open Buy Link
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}
