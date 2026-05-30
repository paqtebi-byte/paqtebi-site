import { NAV_ITEMS } from "../config";
import { DATABASE_CONFIG } from "../config/database";
import getSupabaseClient from "./supabaseClient";

export interface NavigationCategory {
  id: string;
  groupId: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface NavigationGroup {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
  links: NavigationCategory[];
}

interface NavigationGroupRow {
  id: string;
  title: string;
  slug: string;
  sort_order: number | null;
}

interface CategoryRow {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  sort_order: number | null;
}

const fallbackNavigation: NavigationGroup[] = NAV_ITEMS.map((item, groupIndex) => ({
  id: `fallback-group-${groupIndex}`,
  title: item.title,
  slug: item.title.toLowerCase().replace(/\s+/g, "-"),
  sortOrder: groupIndex,
  links: item.links.map((name, linkIndex) => ({
    id: `fallback-category-${groupIndex}-${linkIndex}`,
    groupId: `fallback-group-${groupIndex}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    sortOrder: linkIndex,
  })),
}));

export const fetchNavigationItems = async (): Promise<NavigationGroup[]> => {
  const supabase = getSupabaseClient();
  if (DATABASE_CONFIG.USE_LOCAL_STORAGE || !supabase) {
    return fallbackNavigation;
  }

  const [{ data: groups, error: groupsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("navigation_groups")
        .select("id,title,slug,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("categories")
        .select("id,group_id,name,slug,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (groupsError || categoriesError) {
    console.error("Error fetching navigation:", groupsError || categoriesError);
    return fallbackNavigation;
  }

  const categoryRows = (categories || []) as CategoryRow[];
  return ((groups || []) as NavigationGroupRow[]).map((group) => ({
    id: group.id,
    title: group.title,
    slug: group.slug,
    sortOrder: group.sort_order ?? 0,
    links: categoryRows
      .filter((category) => category.group_id === group.id)
      .map((category) => ({
        id: category.id,
        groupId: category.group_id,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sort_order ?? 0,
      })),
  }));
};
