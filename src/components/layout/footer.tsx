"use client";

import { Mail } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { profile } from "@/lib/content";

const EMAIL = "hadiheydari.business@gmail.com";
const LINKEDIN_URL = "https://www.linkedin.com/in/hadiheydari-productdesigner/";
const TELEGRAM_USERNAME = "Hadiheydari_contact";
const TELEGRAM_URL = `https://t.me/${TELEGRAM_USERNAME}`;

// Brand SVG icons — real logos.
// Both brand logos are rendered from inline SVG paths so the footer does not
// load a complete icon registry for two small icons.
// Both use currentColor so they pick up the footer text color and hover state.
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function Footer() {
  const { t, locale } = useLanguage();
  const now = new Date();
  const year = now.getFullYear();
  // Persian (Jalali) year via Intl; falls back to Gregorian if unavailable
  const persianYear = (() => {
    try {
      return now.toLocaleDateString("fa-IR", { year: "numeric" });
    } catch {
      return String(year);
    }
  })();

  // Contact link buttons — order: LinkedIn → Telegram → Email
  // (per user request). DOM order is preserved across languages; only
  // the visual direction reverses via flex-row-reverse on LTR so the
  // English layout mirrors the Persian one.
  // fa (RTL): flex-row → visual right→left is LinkedIn, Telegram, Email
  // en (LTR): flex-row-reverse → visual left→right is Email, Telegram, LinkedIn
  const contactLinks = (
    <>
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
        title="LinkedIn"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-background/40 text-muted-foreground transition-all duration-300 hover:border-black/20 hover:bg-secondary hover:text-foreground dark:border-white/10 dark:hover:border-white/20"
      >
        <LinkedInIcon className="h-4 w-4" />
      </a>
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Telegram @${TELEGRAM_USERNAME}`}
        title={`Telegram @${TELEGRAM_USERNAME}`}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-background/40 text-muted-foreground transition-all duration-300 hover:border-black/20 hover:bg-secondary hover:text-foreground dark:border-white/10 dark:hover:border-white/20"
      >
        <TelegramIcon className="h-4 w-4" />
      </a>
      <a
        href={`mailto:${EMAIL}`}
        aria-label={EMAIL}
        title={EMAIL}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-background/40 text-muted-foreground transition-all duration-300 hover:border-black/20 hover:bg-secondary hover:text-foreground dark:border-white/10 dark:hover:border-white/20"
      >
        <Mail className="h-4 w-4" />
      </a>
    </>
  );

  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/10">
      {/* py-4 → reduced vertical padding for a more compact footer */}
      <div className="container-edge flex flex-col items-center justify-between gap-3 py-4 sm:flex-row sm:gap-6">
        {/* Right side (RTL) / Left side (LTR) — copyright */}
        <p className="text-center text-xs text-muted-foreground sm:text-start order-2 sm:order-1">
          © {locale === "fa" ? persianYear : year} {profile.name[locale]} — {t("footer.rights")}
        </p>

        {/* Left side (RTL) / Right side (LTR) — contact link buttons.
            Priority order: LinkedIn → Telegram → Email (always first in DOM).
            - Mobile: social shown FIRST (top), copyright SECOND (bottom)
            - Desktop: copyright on start side, social on end side
            - Persian (RTL): flex-row-reverse → visual right→left is Email, Telegram, LinkedIn
            - English (LTR): flex-row → visual left→right is LinkedIn, Telegram, Email
            The DOM order is always LinkedIn → Telegram → Email. */}
        <div
          className={
            "flex items-center gap-2 order-1 sm:order-2 " +
            (locale === "fa" ? "flex-row-reverse" : "flex-row")
          }
        >
          {contactLinks}
        </div>
      </div>
    </footer>
  );
}
