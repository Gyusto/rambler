/**
 * Static content for the marketing blog. Posts live here as plain data so the
 * blog index and article pages can prebuild without a backend. `body` holds an
 * array of paragraphs; a leading "## " marks a subheading.
 */

export type BlogTag = "Product" | "Engineering" | "Community";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  date: string; // ISO date
  tag: BlogTag;
  author: string;
  readMins: number;
}

export const POSTS: BlogPost[] = [
  {
    slug: "reactions-replies-and-file-sharing",
    title: "Reactions, replies & file sharing land in Rambler",
    excerpt:
      "React with an emoji, quote a message to reply, and drop images or documents right into the conversation.",
    date: "2026-06-28",
    tag: "Product",
    author: "The Rambler team",
    readMins: 4,
    body: [
      "Conversations are more than lines of text, so we taught Rambler a few new tricks. You can now react to any message with an emoji, reply by quoting the message you're answering, and share files without leaving the room.",
      "## React without interrupting",
      "Hover a message and the quick reactions appear - a thumbs up, a heart, a laugh - or open the picker for anything else. Reactions are toggles: tap again to take yours back. Everyone sees the count update live, and it's all persisted, so the room looks the same when you log back in.",
      "## Replies that keep their thread",
      "Pick \"reply\" on a message and your response carries a small quote of the original. It keeps fast-moving rooms readable: you can answer a question from five messages ago and nobody loses the plot.",
      "## Images and documents",
      "Drag in a screenshot, a PDF, or a plain text file and it uploads straight to storage. Images show as tidy thumbnails that open into a full-size lightbox; documents show as a card you can click to download. You can attach several files at once and add a caption before you send.",
      "It's the kind of thing that sounds small until you use it - and then you can't go back to a chat without it.",
    ],
  },
  {
    slug: "six-themes-and-why-black-is-default",
    title: "Six themes, and why black is the default",
    excerpt:
      "From Twilight to Daylight - pick a look that sticks to your browser. Here's how we think about the palette.",
    date: "2026-06-20",
    tag: "Product",
    author: "The Rambler team",
    readMins: 3,
    body: [
      "Rambler ships with six themes, and switching between them is instant - your choice is remembered in your browser, no account required.",
      "## Black by default",
      "We made a true-black theme the default. Chat is something people leave open all day, often late at night, and a deep dark surface is easier on the eyes and on OLED batteries. It also lets the accent colors - turquoise, violet, pink - actually pop.",
      "## Light when you want it",
      "Not everyone wants the dark. Daylight and the softer gray themes are there for bright rooms and daytime desks. The whole interface is driven by CSS variables, so a theme is really just a small set of colors swapped at the root - fast to switch and easy to extend.",
      "If you self-host, adding your own theme is a matter of dropping in one more palette. We kept the system deliberately small so it stays that way.",
    ],
  },
  {
    slug: "self-hosting-with-docker-and-minio",
    title: "Self-hosting Rambler with Docker and MinIO",
    excerpt:
      "One compose file brings up the server, the database, and object storage for uploads. Here's the tour.",
    date: "2026-06-12",
    tag: "Engineering",
    author: "The Rambler team",
    readMins: 6,
    body: [
      "Rambler is meant to be run by the people who use it. The whole stack comes up from a single Docker Compose file, so you can host it on a spare box or a small VPS in minutes.",
      "## What's in the box",
      "Compose brings up four things: the .NET server that speaks the WebSocket protocol, a PostgreSQL database for users and message history, MinIO for file uploads, and the Next.js web front end. The server runs its database migrations automatically on startup, so there's no manual step to get the schema in place.",
      "## Storage for uploads",
      "Uploaded images and documents go to MinIO, an S3-compatible object store. Because it speaks the S3 API, the same code path works whether you point it at MinIO locally or a cloud bucket in production. The bucket gets a public-read policy for shared media, and everything is addressed by a stable URL.",
      "## Configuration",
      "Almost everything is driven by environment variables in a single .env file: database credentials, the storage endpoint and public URL, and a switch to allow cross-origin access when you're developing against the server locally. Sensible defaults mean the happy path is short.",
      "The goal is that standing up your own instance is boring - in the best possible way.",
    ],
  },
  {
    slug: "how-the-websocket-protocol-works",
    title: "How Rambler's WebSocket protocol works",
    excerpt:
      "A tiny framed protocol keeps the client and server in sync. A look at the frames behind every message.",
    date: "2026-06-04",
    tag: "Engineering",
    author: "The Rambler team",
    readMins: 5,
    body: [
      "Everything you see in a Rambler room - a new message, someone joining, a reaction, a typing indicator - travels over a single WebSocket connection using a small, predictable protocol.",
      "## Outbound: key then payload",
      "When the client wants to do something, it sends a frame that's a short key followed by a JSON payload - for example a join request or a chat message. The key tells the server which handler should pick it up. It's compact and trivial to read on the wire when you're debugging.",
      "## Inbound: one envelope for everything",
      "Everything the server sends back shares one envelope shape: a type, an optional id, the subscription it belongs to, a timestamp, and the data. Because the shape is uniform, the client can route any message with a single switch - a chat message, a roster change, a ban, a rename - and the id doubles as the post identifier that reactions and replies target.",
      "## Handlers by reflection",
      "On the server, request and response processors are discovered automatically at startup. Adding a new message type is mostly a matter of writing its contract and its handler; the wiring finds them. That keeps the protocol easy to grow without a central registry to keep in sync.",
      "Small protocols age well. This one has room to grow while staying easy to reason about.",
    ],
  },
  {
    slug: "moderation-tools-for-healthy-channels",
    title: "Moderation tools for healthy channels",
    excerpt:
      "Bans, mutes, warnings and a three-strikes policy give owners and mods what they need to keep rooms good.",
    date: "2026-05-27",
    tag: "Community",
    author: "The Rambler team",
    readMins: 4,
    body: [
      "A chat room is only as good as its worst five minutes. Rambler gives the people who run rooms the tools to handle those five minutes quickly and fairly.",
      "## Roles that make sense",
      "Rooms have owners and moderators, each with a clear level of authority. Mods can act in the moment; owners set the tone and manage their mods. The permission model is explicit, so it's always clear who can do what.",
      "## Bans, mutes, warnings",
      "Moderators can mute someone who's getting heated, warn them with a reason, or ban them outright with an expiry. Warnings feed a built-in three-strikes policy, so repeated problems escalate on their own instead of relying on someone's memory.",
      "## Secret and keyed rooms",
      "Sometimes the best moderation is the door. Unlisted rooms don't show up in the directory, and password-protected channels keep the conversation to the people you invite. Together they give private crews a quiet corner.",
      "Good moderation is mostly about being able to act fast and consistently. That's what we optimized for.",
    ],
  },
  {
    slug: "guests-accounts-and-changing-your-nick",
    title: "Guests, accounts, and changing your nick",
    excerpt:
      "Jump in with a name and no signup, or make an account to keep it. Either way you can change your nick anytime.",
    date: "2026-05-18",
    tag: "Product",
    author: "The Rambler team",
    readMins: 3,
    body: [
      "The fastest way into a conversation is not to fill out a form. Rambler lets you pick a name and start chatting as a guest immediately - no email, no password.",
      "## Guests, done right",
      "Choose the nickname you want and it's the one people see - no random numbers bolted on. If the name's taken you'll be told, and you can try another. It's the low-friction path for dropping into a room to say one thing.",
      "## Keep your name with an account",
      "When you want your identity to stick - across devices, across sessions - create an account. Your history and your name come with you, and you get the extras that come with being a known user.",
      "## Change your nick anytime",
      "Guest or registered, you can change your nickname on the fly. When you do, the room shows a quiet \"X changed their name to Y\" instead of making it look like someone left and someone new arrived. Your identity stays continuous; only the label changes.",
      "Low friction to start, room to grow if you stay. That's the balance we're after.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Format an ISO date like "2026-06-28" as "June 28, 2026". */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
