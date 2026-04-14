import { useEffect, useMemo, useState } from "react";
import useProducts from "../hooks/useProducts";
import ComparePreview from "../components/sections/ComparePreview";
import HeroSection from "../components/sections/HeroSection";
import InsightStrip from "../components/sections/InsightStrip";
import RecommendationGrid from "../components/sections/RecommendationGrid";
import PageTransition from "../components/PageTransition";

export default function HomePage() {
  const { products, loading, error } = useProducts();
  const safeProducts = useMemo(
    () => (Array.isArray(products) ? products : []),
    [products]
  );
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    if (safeProducts.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % safeProducts.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [safeProducts]);

  const featuredProduct = safeProducts[featuredIndex] || safeProducts[0] || null;

  return (
    <PageTransition className="space-y-8 lg:space-y-10">
      <HeroSection featured={featuredProduct} />
      <InsightStrip />
      <RecommendationGrid products={safeProducts} loading={loading} error={error} />
      <ComparePreview products={safeProducts} loading={loading} />
    </PageTransition>
  );
}
