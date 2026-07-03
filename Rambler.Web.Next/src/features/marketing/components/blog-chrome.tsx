import type { BlogTag } from "@/features/marketing/blog-data";

/** Accent classes for a post's tag chip, matching the landing palette. */
export const tagAccent: Record<BlogTag, string> = {
  Product: "bg-rambler-turquoise/15 text-rambler-turquoise ring-rambler-turquoise/20",
  Engineering: "bg-rambler-violet/20 text-rambler-violet ring-rambler-violet/25",
  Community: "bg-rambler-pink/20 text-rambler-pink ring-rambler-pink/25",
};
