import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  title:
    "StudentHub - Transform Your Study Experience | Free Study Groups Platform",
  description:
    "Join StudentHub, the ultimate platform for students to connect, share resources, and study together. Create or join study groups, access shared materials, and improve your academic performance.",
  keywords:
    "study groups, student platform, academic resources, online learning, student collaboration, study materials, education technology",
  authors: [{ name: "StudentHub Team" }],
  creator: "StudentHub",
  publisher: "StudentHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://studenthub.andreipau.me"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StudentHub - Transform Your Study Experience",
    description:
      "Join StudentHub, the ultimate platform for students to connect, share resources, and study together.",
    url: "https://studenthub.andreipau.me",
    siteName: "StudentHub",
    images: [
      {
        url: "/study_group.svg",
        width: 1200,
        height: 630,
        alt: "StudentHub Platform Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudentHub - Transform Your Study Experience",
    description:
      "Join StudentHub, the ultimate platform for students to connect, share resources, and study together.",
    images: ["/study_group.svg"],
    creator: "@StudentHub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification",
    yandex: "your-yandex-verification",
    yahoo: "your-yahoo-verification",
  },
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
            {children}
      </body>
    </html>
  );
}
