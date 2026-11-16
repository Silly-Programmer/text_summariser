import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const font = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "Turn your PDFs into easy notes and quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${font.variable} font-sans`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
