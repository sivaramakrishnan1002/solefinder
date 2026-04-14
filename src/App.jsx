import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ComparePage from "./pages/ComparePage";
import DiscoverPage from "./pages/DiscoverPage";
import HomePage from "./pages/HomePage";
import AnalyzePage from "./pages/AnalyzePage";
import ProductPage from "./pages/ProductPage";
import ProfilePage from "./pages/ProfilePage";
import SimilarPage from "./pages/SimilarPage";
import WishlistPage from "./pages/WishlistPage";

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/similar/:id" element={<SimilarPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AnimatePresence>
      </AppLayout>
    </div>
  );
}
