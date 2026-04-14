import { useMemo } from "react";
import { Award, MapPin, Medal, Ruler } from "lucide-react";
import useProducts from "../hooks/useProducts";
import ProfileActivityChart from "../components/charts/ProfileActivityChart";
import PageTransition from "../components/PageTransition";
import SectionHeading from "../components/SectionHeading";
import { profile } from "../data/profile";
import { getRecentProductIds, getWishlistIds } from "../services/storage";

export default function ProfilePage() {
  const { products, loading } = useProducts();
  const safeProducts = Array.isArray(products) ? products : [];
  const wishlistIds = getWishlistIds();
  const recentIds = getRecentProductIds();

  const dynamicNotes = useMemo(() => {
    const recentlyViewed = recentIds
      .map((productId) => safeProducts.find((product) => product.id === productId))
      .filter(Boolean)
      .slice(0, 3)
      .map((product) => `Recently viewed ${product.brand} ${product.name}`);

    if (recentlyViewed.length > 0) {
      return recentlyViewed;
    }

    return ["Browse more products to build a personalized activity trail."];
  }, [safeProducts, recentIds]);

  return (
    <PageTransition className="space-y-8">
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-gray-900 to-brand-700 p-8 text-white shadow-glow sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">
              Member since {profile.memberSince}
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold tracking-tight">
              {profile.name}
            </h1>
            <p className="mt-3 text-lg text-white/75">{profile.title}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <div className="flex items-center gap-2 text-white/70">
                  <Medal size={16} className="text-brand-300" />
                  Style points
                </div>
                <div className="mt-3 text-3xl font-bold">{profile.points}</div>
              </div>
              <div className="metric-card">
                <div className="flex items-center gap-2 text-white/70">
                  <Award size={16} className="text-brand-300" />
                  Saved pairs
                </div>
                <div className="mt-3 text-3xl font-bold">
                  {wishlistIds.length}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur-xl">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-white/10 p-5">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-white/60">
                  <MapPin size={14} />
                  Location
                </div>
                <div className="mt-3 text-xl font-semibold">{profile.location}</div>
              </div>
              <div className="rounded-[24px] bg-white/10 p-5">
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-white/60">
                  <Ruler size={14} />
                  Sizes
                </div>
                <div className="mt-3 text-xl font-semibold">
                  {profile.sizes.us}
                </div>
                <div className="mt-1 text-sm text-white/70">
                  {profile.sizes.eu} / {profile.sizes.uk}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-white/10 p-5">
              <div className="text-sm uppercase tracking-[0.18em] text-white/60">
                Fit profile
              </div>
              <div className="mt-3 text-lg leading-8 text-white/85">
                {profile.fitProfile}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-6">
          <SectionHeading
            eyebrow="Activity"
            title="Recommendation engagement"
            description="A six-month snapshot of how often SoleFinder surfaced strong matches and which ones turned into purchases."
          />
          <div className="mt-8 text-gray-600 dark:text-zinc-400">
            <ProfileActivityChart data={profile.activity} />
          </div>
        </div>

        <div className="surface-card p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
            Notes
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Personal style signals
          </h2>
          <div className="mt-6 space-y-4">
            {(loading ? ["Failed to load data"] : dynamicNotes).map((note) => (
              <div
                key={note}
                className="rounded-[24px] border border-gray-200 bg-gray-50 p-5 text-base leading-7 text-gray-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
