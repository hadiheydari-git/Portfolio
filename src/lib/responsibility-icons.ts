import {
  Check,
  Search,
  PenTool,
  FlaskConical,
  Layout,
  Users,
  Settings2,
  Zap,
  TrendingUp,
  ShoppingBag,
  CalendarClock,
  MapPin,
  RefreshCw,
  Route,
  Gauge,
  Palette,
  Bot,
  ListChecks,
  Layers,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

/**
 * Picks a topical icon for a responsibility paragraph based on keywords
 * in its text (matched against both fa + en). Falls back to a generic
 * check-style icon when no rule matches.
 *
 * Order matters: rules are evaluated top-to-bottom; the FIRST matching
 * rule wins. Specific concepts are placed BEFORE generic ones so a
 * paragraph about "user research that defines features" matches Search
 * (the primary topic), not ListChecks (the secondary verb).
 */
const RESPONSIBILITY_ICONS: { keywords: string[]; icon: LucideIcon }[] = [
  // 1. Research / competitor analysis / discovering needs
  {
    keywords: ["تحقیق", "research", "تحلیل رقبا", "competitor analy", "کشف نیاز", "discover need"],
    icon: Search,
  },

  // 2. Defining a list of features (e.g. "defined core features such as...")
  {
    keywords: ["تعریف ویژگی", "define feature", "defining feature", "defined core feature"],
    icon: ListChecks,
  },

  // 3. Reservation / scheduling / table booking
  {
    keywords: ["رزرو میز", "table reserv", "زمان‌بندی", "schedul", "ظرفیت", "capacity"],
    icon: CalendarClock,
  },

  // 4. Delivery zoning / geographic location
  {
    keywords: ["ناحیه‌بندی", "delivery zon", "موقعیت جغرافی", "geographic", "geograph"],
    icon: MapPin,
  },

  // 5. Sync / real-time / instant updates (use "هماهنگ‌سازی" not "هماهنگ" — too generic)
  {
    keywords: ["هماهنگ‌سازی", "همگام‌سازی", "sync", "بلادرنگ", "real-time", "آنی", "instant"],
    icon: RefreshCw,
  },

  // 6. Brand identity / visual structure
  {
    keywords: ["هویت برند", "brand identity", "ساختار بصری", "visual structure", "هویت بصری"],
    icon: Palette,
  },

  // 7. AI tools / vibe coding (specific tool names — "bot" alone is too broad)
  {
    keywords: ["ابزارهای هوش", "AI tools", "ابزارهای AI", "vibe cod", "copilot", "cursor", "chatgpt", "firebase studio", "هوش مصنوعی"],
    icon: Bot,
  },

  // 8. Speed / performance / smoothness optimization
  {
    keywords: ["بهینه‌سازی", "optim", "سرعت", "speed", "روان بودن", "smoothness", "performance"],
    icon: Gauge,
  },

  // 9. User journey / flow simplification (NOT "user flow" alone — that's a design artifact)
  {
    keywords: ["ساده‌سازی مسیر", "simplify", "کاهش پیچیدگی", "reduce complex", "مسیر کاربر", "user journey", "مسیر سفارش", "ordering flow"],
    icon: Route,
  },

  // 10. Collaboration / leading / clients / co-founder / agency
  //     NOTE: avoid bare "همکار" — it matches "همکاری" (collaboration) too.
  //     Use "همکاران" (teammates) or "همکار طراح" (fellow designer) instead.
  {
    keywords: ["همکاران", "teammate", "همکار طراح", "fellow designer", "مشتری", "client", "هم‌بنیان", "co-found", "تأسیس", "found", "آژانس", "agency", "هدایت پروژه", "led project"],
    icon: Users,
  },

  // 11. Design / wireframe / UI / UX / design system / user flows (design artifact)
  {
    keywords: ["طراحی", "design", "وایرفریم", "wireframe", "رابط", "interface", "سیستم طراحی", "design system", "کامپوننت", "component", "توکن", "token", "یوزر فلو", "user flow", "دیزاین گاید", "design guide"],
    icon: PenTool,
  },

  // 12. Testing / experiments / versions (NOT "experience" — too generic)
  {
    keywords: ["آزمایش", "test", "نسخه‌های", "versions", "تجربه کاربری یکپارچه", "seamless"],
    icon: FlaskConical,
  },

  // 13. Pages / panels / landing / dashboard
  {
    keywords: ["صفحه", "page", "پنل", "panel", "لندینگ", "landing", "داشبورد", "dashboard"],
    icon: Layout,
  },

  // 14. Order management / ordering modes
  {
    keywords: ["سفارش", "order", "پیش‌سفارش", "pre-order", "حضوری", "dine-in", "بیرون‌بر", "takeout"],
    icon: ShoppingBag,
  },

  // 15. Settings / config / working hours / discounts
  {
    keywords: ["تنظیم", "config", "ساعت کاری", "working hour", "تخفیف", "discount", "دسته‌بندی محصولات", "product categor"],
    icon: Settings2,
  },

  // 16. Sole project ownership / solo cycle
  {
    keywords: ["تنها", "sole", "تک‌نفره", "solo", "چرخه پروژه", "project cycle", "بدون همکار"],
    icon: Briefcase,
  },

  // 17. Build / debug / execution / idea → development
  {
    keywords: ["ایده", "idea", "توسعه", "develop", "دیباگ", "debug", "بیلد", "build", "اجرا", "execution"],
    icon: Layers,
  },

  // 18. Rapid prototyping / iteration speed
  {
    keywords: ["سریع", "fast", "تکرار", "iterat", "نمونه اولیه", "prototyp"],
    icon: Zap,
  },

  // 19. Growth / MVP / market / shippable
  {
    keywords: ["رشد", "growth", "MVP", "اولویت", "priorit", "بازار", "market", "قابل عرضه", "shippable"],
    icon: TrendingUp,
  },
];

export function getResponsibilityIcon(fa: string, en: string): LucideIcon {
  const text = (fa + " " + en).toLowerCase();
  for (const rule of RESPONSIBILITY_ICONS) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return rule.icon;
    }
  }
  return Check as unknown as LucideIcon;
}
