import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPostDate, type BlogPost } from "@/features/marketing/blog-data";
import { categoryForTag, tagAccent } from "@/features/marketing/blog-categories";

/**
 * A single post preview. The whole card links through to the article (via a
 * stretched overlay on the title link), while the category chip is its own link
 * to that category's page - so we avoid nesting one anchor inside another.
 */
export function BlogCard({
  post,
  commentCount,
  hidden = false,
}: {
  post: BlogPost;
  /** Optional comment count shown as a small "💬 N" chip. */
  commentCount?: number;
  /** When true (moderator view of a removed post), show a muted "Hidden" badge. */
  hidden?: boolean;
}) {
  const category = categoryForTag(post.tag);

  return (
    <div className="group relative flex h-full flex-col rounded-3xl border border-white/10 bg-[#211b33] p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#2a2340]">
      <div className="flex items-center gap-2">
        {category ? (
          <Link
            href={`/blog/category/${category.slug}`}
            className={cn(
              "relative z-10 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset transition-opacity hover:opacity-80",
              tagAccent[post.tag],
            )}
          >
            {post.tag}
          </Link>
        ) : (
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
              tagAccent[post.tag],
            )}
          >
            {post.tag}
          </span>
        )}
        {hidden && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/40 ring-1 ring-inset ring-white/10">
            <i className="fa-solid fa-eye-slash text-[10px]" />
            Hidden
          </span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-white">
        <Link
          href={`/blog/${post.slug}`}
          className="after:absolute after:inset-0 after:rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rambler-turquoise/40"
        >
          {post.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{post.excerpt}</p>

      <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
        <span>{formatPostDate(post.date)}</span>
        <span aria-hidden>·</span>
        <span>{post.readMins} min read</span>
        {commentCount !== undefined && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <i className="fa-regular fa-comment text-[10px]" />
              {commentCount}
            </span>
          </>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-rambler-turquoise/80 transition-transform group-hover:translate-x-0.5">
          Read <i className="fa-solid fa-arrow-right text-[10px]" />
        </span>
      </div>
    </div>
  );
}
