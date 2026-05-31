import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Workspace",
  description: "A spreadsheet-style frontend over Jira (mock-backed today).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
