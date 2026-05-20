import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Leen-Co AI", template: "%s | Leen-Co AI" },
  description: "AI assistants trained on your business data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
