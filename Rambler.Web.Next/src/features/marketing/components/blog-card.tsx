import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPostDate, type BlogPost } from "@/features/marketing/blog-data";
import { tagAccent } from "@/features/marketing/components/blog-chrome";

/** A single post preview linking through to the full article. */
export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-3xl border border-white/10 bg-[#211b33] p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#2a2340]"
    >
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
          tagAccent[post.tag],
        )}
      >
        {post.tag}
      </span>

      <h3 className="mt-4 text-lg font-semibold leading-snug text-white">{post.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{post.excerpt}</p>

      <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
        <span>{formatPostDate(post.date)}</span>
        <span aria-hidden>·</span>
        <span>{post.readMins} min read</span>
        <span className="ml-auto inline-flex items-center gap-1 text-rambler-turquoise/80 transition-transform group-hover:translate-x-0.5">
          Read <i className="fa-solid fa-arrow-right text-[10px]" />
        </span>
      </div>
    </Link>
  );
}
