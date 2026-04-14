import { useEffect, useState } from "react";
import { getProducts } from "../services/api";

export default function useProducts(params = {}) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const queryKey = JSON.stringify(params);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const result = await getProducts(params);
        const safeData = Array.isArray(result)
          ? result
          : Array.isArray(result?.products)
            ? result.products
            : Array.isArray(result?.data)
              ? result.data
              : [];

        if (active) {
          setProducts(safeData);
          setPagination({
            total: Number(result?.total) || safeData.length,
            page: Number(result?.page) || 1,
            totalPages: Number(result?.totalPages) || 1,
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load data");
          setProducts([]);
          setPagination({ total: 0, page: 1, totalPages: 1 });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [queryKey]);

  return { products, pagination, loading, error };
}
