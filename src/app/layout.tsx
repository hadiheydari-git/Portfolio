import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";

const SITE_URL = "https://hadiheydari.ir";
const SITE_TITLE = "هادی حیدری | طراح محصول";
const SITE_DESCRIPTION =
  "من هادی حیدری، طراح محصول هستم؛ علاقه‌مند به حل مسئله و ساخت راه‌حل‌های نوآورانه‌ام و باور دارم مسیر رشد از یادگیری مستمر، پذیرش بازخورد و اصلاح آگاهانه شکل می‌گیرد.";
const SITE_DESCRIPTION_EN =
  "I’m Hadi Heydari, a Product Designer. I’m passionate about solving problems and building innovative solutions, and I believe growth comes from continuous learning, embracing feedback, and intentional iteration.";

const themeScript = `
(function () {
  try {
    const storageKey = "theme";
    const root = document.documentElement;
    const stored = window.localStorage.getItem(storageKey);
    const theme = stored === "light" || stored === "dark" ? stored : "dark";
    const resolvedTheme = theme === "dark" ? "dark" : "light";
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.classList.toggle("light", resolvedTheme === "light");
    root.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Default SSR title = Persian (the default language). Updates
  // dynamically to English when the user switches language (see
  // LanguageProvider's document.title sync on locale change).
  title: {
    default: SITE_TITLE,
    template: "%s | Hadi Heydari",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Product Designer",
    "طراح محصول",
    "UX/UI",
    "Design System",
    "Portfolio",
    "Hadi Heydari",
    "هادی حیدری",
  ],
  authors: [{ name: "Hadi Heydari" }],
  // Browser-tab favicon + Apple/Android home-screen icons.
  // Uses the same header-avatar.png that appears in the site header
  // so the brand identity is consistent everywhere.
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Hadi Heydari | Product Designer",
    description: SITE_DESCRIPTION_EN,
    type: "website",
    url: SITE_URL,
    siteName: "Hadi Heydari",
    locale: "en_US",
    alternateLocale: ["fa_IR"],
    images: [{ url: "/hadi-heydari-profile.webp", width: 1200, height: 630, alt: "Hadi Heydari, Product Designer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hadi Heydari | Product Designer",
    description: SITE_DESCRIPTION_EN,
    images: ["/hadi-heydari-profile.webp"],
  },
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Hadi Heydari",
      alternateName: "هادی حیدری",
      jobTitle: "Product Designer",
      url: SITE_URL,
      image: `${SITE_URL}/hadi-heydari-headshot.webp`,
      sameAs: [
        "https://www.linkedin.com/in/hadiheydari-productdesigner/",
        "https://t.me/Hadiheydari_contact",
        "https://jobinja.ir/user/heydarihadi",
      ],
    },
    {
      "@type": "WebSite",
      name: "Hadi Heydari | Product Designer",
      alternateName: "هادی حیدری | طراح محصول",
      url: SITE_URL,
      inLanguage: ["fa", "en"],
      publisher: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Critical images — preloaded before JS hydrates for fastest LCP */}
        {/* Lighthouse LCP: only the above-the-fold hero portrait is preloaded. */}
        <link rel="preload" as="image" href="/hadi-heydari-headshot.webp" />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
