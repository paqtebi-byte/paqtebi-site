import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchNavigationItems, NavigationGroup } from "../services/categoryService";

export const useNavigation = () => {
  const [navigationItems, setNavigationItems] = useState<NavigationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNavigation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNavigationItems(await fetchNavigationItems());
    } catch (err) {
      console.error("Error loading navigation:", err);
      setError("Navigation could not be loaded");
      setNavigationItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNavigation();
  }, [loadNavigation]);

  const feedCategories = useMemo(() => {
    const names = navigationItems.flatMap((item) => item.links.map((link) => link.name));
    return ["ყველა", ...Array.from(new Set(names))];
  }, [navigationItems]);

  return {
    navigationItems,
    feedCategories,
    loading,
    error,
    refreshNavigation: loadNavigation,
  };
};
