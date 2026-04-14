import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import ShoeCard from "../components/ShoeCard";
import { getProductById, getSimilarProducts } from "../services/api";

export default function SimilarPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSimilarProducts() {
      try {
        setLoading(true);
        setError("");

        const [currentProduct, products] = await Promise.all([
          getProductById(id).catch(() => null),
          getSimilarProducts(id),
        ]);

        if (!active) {
          return;
        }

        setProduct(currentProduct);
        setSimilarProducts(Array.isArray(products) ? products : []);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load similar products");
          setSimilarProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSimilarProducts();

    return () => {
      active = false;
    };
  }, [id]);

  const safeProducts = useMemo(
    () => (Array.isArray(similarProducts) ? similarProducts : []),
    [similarProducts]
  );

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Similar Picks"
        title={product?.brand ? `More from ${product.brand}` : "Similar products"}
        description="Explore closely matched alternatives that stay aligned on brand direction, category, and relevant price range."
      />

      {error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-[380px] animate-pulse rounded-[28px] bg-gray-100 dark:bg-zinc-900"
              />
            ))
          : safeProducts.map((shoe) => <ShoeCard key={shoe._id || shoe.id} shoe={shoe} compact />)}
      </section>

      {!loading && safeProducts.length === 0 && !error ? (
        <div className="surface-card p-6 text-sm text-gray-600 dark:text-zinc-400">
          No closely matched products are available right now.
        </div>
      ) : null}
    </PageTransition>
  );
}
