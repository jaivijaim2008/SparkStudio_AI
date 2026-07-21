import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SparkStudio AI | One Prompt. Complete Content Production.",
  description: "A multi-agent AI copilot that converts a single user idea into a complete creator package.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-gray-50 dark:bg-[#0a0a0f] text-gray-900 dark:text-gray-100 min-h-screen selection:bg-purple-500/30`}
      >
        <ThemeProvider defaultTheme="dark">
          <ReactQueryProvider>
            {children}
            <Toaster position="bottom-right" theme="dark" />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
