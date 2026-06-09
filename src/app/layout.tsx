import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goatsana",
  description: "Goatsana — a friendly, Monday/Asana-style project workspace on top of Jira.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
