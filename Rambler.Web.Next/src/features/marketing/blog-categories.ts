/**
 * The blog's category taxonomy. Each post carries a `tag` (its de-facto
 * category); this file makes those categories first-class: it gives every one a
 * URL slug, a display name and a short blurb, and exposes helpers to look a
 * category up and list its posts. The accent palette still lives in
 * `blog-chrome` (`tagAccent`); it's re-exported here for convenience so callers
 * can pull colour + taxonomy from one place.
 */

import { POSTS, type BlogPost, type BlogTag } from "@/features/marketing/blog-data";
import { tagAccent } from "@/features/marketing/components/blog-chrome";

export { tagAccent };

/** URL slug for a category page, e.g. "product". */
export type CategorySlug = "product" | "engineering" | "community";

export interface BlogCategory {
  slug: CategorySlug;
  name: string;
  description: string;
  /** The post tag this category maps to. */
  tag: BlogTag;
}

/** One category per post tag. `slug` is the lowercased display name. */
export const CATEGORIES: BlogCategory[] = [
  {
    slug: "product",
    name: "Product",
    description:
      "New features, design decisions and the small touches that make Rambler nicer to chat in.",
    tag: "Product",
  },
  {
    slug: "engineering",
    name: "Engineering",
    description:
      "How Rambler is built - the protocol, the stack and the trade-offs behind self-hosting it.",
    tag: "Engineering",
  },
  {
    slug: "community",
    name: "Community",
    description:
      "Moderation, roles and keeping rooms healthy for the people who run and hang out in them.",
    tag: "Community",
  },
];

/** Look up a category by its URL slug. */
export function getCategory(slug: string): BlogCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Find the category a post belongs to (via its tag). */
export function categoryForTag(tag: BlogTag): BlogCategory | undefined {
  return CATEGORIES.find((c) => c.tag === tag);
}

/** Every post in the given category, in the source (newest-first) order. */
export function postsInCategory(slug: string): BlogPost[] {
  const category = getCategory(slug);
  if (!category) return [];
  return POSTS.filter((p) => p.tag === category.tag);
}
