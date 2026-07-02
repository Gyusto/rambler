import type { Metadata, Viewport } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import "./lobby.css";

export const metadata: Metadata = {
  title: "Rambler",
  description: "A browser-based group chat.",
};

export const viewport: Viewport = {
  themeColor: "#21294F",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
