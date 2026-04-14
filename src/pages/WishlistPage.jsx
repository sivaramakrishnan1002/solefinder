import useProducts from "../hooks/useProducts";
import { useEffect, useMemo, useState } from "react";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import ShoeCard from "../components/ShoeCard";
import { getWishlistIds, toggleWishlistId } from "../services/storage";

export default function WishlistPage() {
  const { products, loading, error } = useProducts();
  const safeProducts = Array.isArray(products) ? products : [];
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());

  useEffect(() => {
    setWishlistIds(getWishlistIds());
  }, []);

  const wishlist = useMemo(
    () =>
      safeProducts
        .filter((shoe) => wishlistIds.includes(shoe.id))
        .map((shoe) => ({
          ...shoe,
          priceDrop: 10,
        })),
    [safeProducts, wishlistIds]
  );

  function handleRemove(productId) {
    setWishlistIds(toggleWishlistId(productId));
  }

  return (
    <PageTransition className="space-y-8">
      <section className="rounded-[36px] border border-zinc-800 bg-black p-6 text-white shadow-[0_32px_80px_-36px_rgba(0,0,0,0.88)] sm:p-8">
        <SectionHeading
          eyebrow="Wishlist"
          title="Saved pairs, tracked beautifully"
          description="A focused dark-mode destination for favorites, price movement, and fast next steps."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {loading
            ? [1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[420px] animate-pulse rounded-[28px] border border-zinc-800 bg-zinc-900"
                />
              ))
            : wishlist.map((shoe) => (
                <ShoeCard
                  key={shoe.id}
                  shoe={shoe}
                  darkHighlight
                  showPriceDrop
                  showCart
                  onWishlistToggle={() => handleRemove(shoe.id)}
                />
              ))}
        </div>
        {!loading && wishlist.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            Your wishlist is empty. Save a pair from the product page to see it here.
          </p>
        ) : null}
      </section>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="More picks"
          title="You might also like"
          description="A few neighboring silhouettes that align with your saved preferences."
        />

        <div className="flex gap-5 overflow-x-auto pb-2">
          {(wishlist.length > 0 ? wishlist : safeProducts.slice(0, 3)).map((shoe) => (
            <div key={`${shoe.id}-scroll`} className="min-w-[320px] max-w-[320px]">
              <ShoeCard shoe={shoe} darkHighlight compact />
            </div>
          ))}
        </div>
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </section>
    </PageTransition>
  );
}
