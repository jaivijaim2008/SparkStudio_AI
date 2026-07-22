import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToaster } from "@/components/providers/toaster-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen selection:bg-purple-500/30`}
      >
        <ThemeProvider defaultTheme="dark">
          <ReactQueryProvider>
            {children}
            <ThemeToaster />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
