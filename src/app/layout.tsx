import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "To-do",
  description: "A simple to-do list with AI-suggested steps",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
