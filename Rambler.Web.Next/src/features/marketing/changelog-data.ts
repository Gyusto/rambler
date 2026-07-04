/**
 * Static release notes for the Changelog page. Newest release first; append a
 * new entry at the top of RELEASES when you ship. Dates are plain ISO strings.
 */

export type ChangeType = "new" | "improved" | "fixed";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface Release {
  version: string;
  date: string; // ISO
  summary?: string;
  changes: ChangeItem[];
}

/** Chip styling + icon per change type, matching the site palette. */
export const changeTypeMeta: Record<
  ChangeType,
  { label: string; accent: string; icon: string }
> = {
  new: {
    label: "New",
    accent: "bg-rambler-turquoise/15 text-rambler-turquoise ring-rambler-turquoise/25",
    icon: "fa-plus",
  },
  improved: {
    label: "Improved",
    accent: "bg-rambler-violet/20 text-rambler-violet ring-rambler-violet/25",
    icon: "fa-arrow-up",
  },
  fixed: {
    label: "Fixed",
    accent: "bg-rambler-pink/20 text-rambler-pink ring-rambler-pink/25",
    icon: "fa-wrench",
  },
};

export const RELEASES: Release[] = [
  {
    version: "1.5",
    date: "2026-07-04",
    summary: "The blog grows up: editing, real pagination, and a proper category system.",
    changes: [
      { type: "new", text: "Edit your own comments, with an 'edited' marker." },
      { type: "new", text: "Category taxonomy with dedicated /blog/category pages." },
      { type: "improved", text: "Comments now use real cursor pagination with 'Load older'." },
      { type: "improved", text: "One shared header and footer across every public page." },
    ],
  },
  {
    version: "1.4",
    date: "2026-07-03",
    summary: "Comments come to the blog, and the sign-in screens get a fresh look.",
    changes: [
      { type: "new", text: "Blog comments and replies — guests can join in, not just members." },
      { type: "new", text: "Moderators can disable comments, remove a post, or delete a comment." },
      { type: "new", text: "Redesigned login and register pages with a live chat preview." },
      { type: "fixed", text: "Comment timestamps now show the correct relative time." },
    ],
  },
  {
    version: "1.3",
    date: "2026-06-28",
    summary: "Say more than words.",
    changes: [
      { type: "new", text: "React to messages with emoji, and reply by quoting." },
      { type: "new", text: "Share images and documents, with captions and a full-size lightbox." },
      { type: "improved", text: "Send several files at once with staged previews." },
    ],
  },
  {
    version: "1.2",
    date: "2026-06-20",
    summary: "Make it yours.",
    changes: [
      { type: "new", text: "Six themes, including a true-black default." },
      { type: "improved", text: "A toggle for the channels sidebar on mobile." },
      { type: "fixed", text: "Smoother scrolling around multi-image posts." },
    ],
  },
  {
    version: "1.1",
    date: "2026-06-12",
    summary: "Your name, your server.",
    changes: [
      { type: "new", text: "Change your nickname live — guests and members alike." },
      { type: "new", text: "Self-host the whole stack with Docker and MinIO." },
      { type: "improved", text: "An .env switch to allow cross-origin access for local development." },
      { type: "fixed", text: "Guests keep the nickname they picked." },
    ],
  },
];

/** Format an ISO date like "2026-07-04" as "July 4, 2026". */
export function formatReleaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
