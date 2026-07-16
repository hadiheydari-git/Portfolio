/**
 * Bilingual content for the portfolio.
 * Source: https://jobinja.ir/user/heydarihadi (Hadi Heydari — Product Designer)
 *
 * All textual information from the profile is preserved verbatim in Persian
 * and mirrored in English. Projects not present on the public profile
 * (Mafia Master, Forums Design System) are authored to match the brief while
 * staying consistent with the designer's real experience & skill set.
 */

export type Bi = { fa: string; en: string };

export type ProjectSize = "large" | "small";

export type ToolCategory =
  | "design"
  | "research"
  | "prototyping"
  | "dev"
  | "management";

export type Tool = {
  name: string;
  category: ToolCategory;
};

export type GalleryImage = {
  src: string;
  alt: Bi;
  span: "wide" | "tall" | "square";
  /**
   * Natural aspect ratio (width / height) of the source image.
   * Used to reserve space for the loading skeleton so the grid
   * doesn't shift when images finish loading.
   * Examples: 0.462 for 1080×2340 portrait, 1.75 for 16:9 landscape, 1 for square.
   */
  aspectRatio?: number;
};

export type Project = {
  id: string;
  title: Bi;
  role: Bi;
  year: Bi; // fa = Jalali (شمسی), en = Gregorian (میلادی)
  size: ProjectSize;
  cover: string;
  accent: string; // tailwind gradient classes for the card glow
  tagline: Bi;
  overview: Bi;
  roleDescription: Bi;
  responsibilities: Bi[];
  tools: Tool[];
  gallery: GalleryImage[];
  link?: { label: Bi; href: string };
};

// ---------------------------------------------------------------------------
// PROJECTS — Apple Bento Grid (2 rows: 3 large + 2 small)
// ---------------------------------------------------------------------------

export const projects: Project[] = [
  // 1 — DUTAR DASHBOARD (Large)
  {
    id: "dutar-dashboard",
    title: { fa: "داشبورد دوتر", en: "Dotaar Dashboard" },
    role: { fa: "طراح محصول", en: "Product Designer" },
    year: { fa: "۱۴۰۱ – ۱۴۰۴", en: "2022 – 2025" },
    size: "large",
    cover: "/images/Dotaar Dashboard/Thumbnail.webp",
    accent: "from-amber-200/60 to-rose-200/40 dark:from-amber-500/10 dark:to-rose-500/5",
    tagline: {
      fa: "پنل مدیریت اختصاصی برای رستوران‌ها و کافه‌ها",
      en: "A dedicated management panel for restaurants & cafes",
    },
    overview: {
      fa: "سامانه‌ای برای سفارش‌گیری و فروش فروشگاه‌ها به‌ویژه رستوران‌ها و کافه‌ها که امکان ثبت سفارش حضوری و بیرون‌بر و همچنین مدیریت محصولات و تخفیف‌ها و رزرو میز و گزارش فروش و دیگر امکانات موردنیاز کسب‌وکار را پوشش می‌دهد. در این پروژه تمام مراحل طراحی محصول را به‌تنهایی انجام دادم و هدفم ساده‌سازی فرآیند سفارش‌گیری و افزایش درآمد کسب‌وکارها بود.",
      en: "A platform for ordering and sales management for businesses, especially restaurants and cafes, that covers dine-in and takeout orders, product and discount management, table reservations, sales reports, and other business essentials. I handled the entire product design process solo, aiming to simplify ordering and boost business revenue.",
    },
    roleDescription: {
      fa: "هم‌بنیان‌گذار و تنها طراح محصول پروژه؛ از تحقیق کاربر و تحلیل رقبا تا یوزرفلو، وایرفریم و سیستم طراحی، تمام مسیر طراحی را به‌تنهایی و بدون همکار طراح پیش بردم.",
      en: "Co-founder and sole product designer of the project; from user research and competitor analysis to user flows, wireframes, and the design system, I drove the entire design process alone with no fellow designer.",
    },
    responsibilities: [
      {
        fa: "مدیریت سفارش در سه حالت: پیش‌سفارش، حضوری و بیرون‌بر",
        en: "Order management in three modes: pre-order, dine-in, and takeout",
      },
      {
        fa: "رزرو میز با کنترل ظرفیت و زمان‌بندی",
        en: "Table reservation with capacity control and scheduling",
      },
      {
        fa: "ناحیه‌بندی ارسال بر اساس موقعیت جغرافیایی",
        en: "Delivery zoning based on geographic location",
      },
      {
        fa: "تنظیم ساعات کاری، تخفیف‌ها و دسته‌بندی محصولات",
        en: "Setting working hours, discounts, and product categorization",
      },
    ],
    // tools: [
    //   { name: "Figma & FigJam", category: "design" },
    // ],
    tools: [],
    gallery: [
      {
        src: "/images/Dotaar Dashboard/1-Login & Register.webp",
        alt: { fa: "ورود و ثبت‌نام", en: "Login & Register" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/2-Business Information.webp",
        alt: { fa: "اطلاعات کسب‌وکار", en: "Business Information" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/3-Ordering.webp",
        alt: { fa: "سفارش‌گیری", en: "Ordering" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/4-Operational Hours.webp",
        alt: { fa: "ساعات کاری", en: "Operational Hours" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/5-Categories.webp",
        alt: { fa: "دسته‌بندی‌ها", en: "Categories" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/6-Delivery Zone.webp",
        alt: { fa: "ناحیه ارسال", en: "Delivery Zone" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/7-Business Status.webp",
        alt: { fa: "وضعیت کسب‌وکار", en: "Business Status" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/8-Incoming Orders.webp",
        alt: { fa: "سفارشات ورودی", en: "Incoming Orders" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Dashboard/9-Total Sales.webp",
        alt: { fa: "مجموع فروش", en: "Total Sales" },
        span: "tall",
        aspectRatio: 0.469,
      },
    ],
  },

  // 2 — DUTAR SHOP (Large)
  {
    id: "dutar-shop",
    title: { fa: "فروشگاه دوتر", en: "Dotaar Shop" },
    role: { fa: "طراح محصول", en: "Product Designer" },
    year: { fa: "۱۴۰۱ – ۱۴۰۴", en: "2022 – 2025" },
    size: "large",
    cover: "/images/Dotaar Store/Thumbnail.webp",
    accent: "from-emerald-200/60 to-teal-200/40 dark:from-emerald-500/10 dark:to-teal-500/5",
    tagline: {
      fa: "تجربه سفارش‌گیری آنلاین برای مشتریان",
      en: "The online ordering experience for customers",
    },
    overview: {
      fa: "فضایی برای سفارش آنلاین فروشگاه‌ها که مشتریان می‌توانند در آن محصولات را ببینند و سفارش خود را ثبت کنند و روش دریافت را انتخاب کنند و وضعیت سفارش را پیگیری کنند. در این پروژه تمام مراحل طراحی محصول را به‌تنهایی انجام دادم و هدفم ایجاد فرآیندی ساده برای ثبت سفارش مشتریان بود.",
      en: "An online ordering space for businesses where customers can browse products, place orders, choose a delivery method, and track their order status. I handled the entire product design process solo, aiming to create a simple ordering flow for customers.",
    },
    roleDescription: {
      fa: "طراحی کامل تجربه کاربری سمت مشتری به‌تنهایی، با هماهنگی دقیق با داشبورد مدیریتی که آن را هم خودم طراحی کرده بودم.",
      en: "I designed the entire customer-side user experience alone, in close coordination with the management dashboard that I had also designed myself.",
    },
    responsibilities: [
      {
        fa: "هماهنگی کامل و بلادرنگ با داشبورد مدیریت",
        en: "Full real-time synchronization with the management dashboard",
      },
      {
        fa: "همگام‌سازی آنی منو، موجودی و وضعیت سفارش بین دو سمت",
        en: "Instant sync of menu, inventory, and order status between both sides",
      },
      {
        fa: "مسیر سفارش ساده و بدون نیاز به آموزش برای مشتری نهایی",
        en: "A simple ordering flow that requires no training for the end customer",
      },
    ],
    // tools: [
    //   { name: "Figma & FigJam", category: "design" },
    // ],
    tools: [],
    gallery: [
      {
        src: "/images/Dotaar Store/1-Products.webp",
        alt: { fa: "فهرست محصولات", en: "Products" },
        span: "wide",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/2-Product Details.webp",
        alt: { fa: "جزئیات محصول", en: "Product details" },
        span: "square",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/3-Shopping Cart.webp",
        alt: { fa: "سبد خرید", en: "Shopping cart" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/4-Check Out.webp",
        alt: { fa: "تسویه حساب", en: "Check out" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/5-Order Confirmation.webp",
        alt: { fa: "تأیید سفارش", en: "Order confirmation" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/6-Awaiting Collection Approval.webp",
        alt: { fa: "در انتظار تأیید دریافت", en: "Awaiting collection approval" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/7-Being Prepared.webp",
        alt: { fa: "در حال آماده‌سازی", en: "Being prepared" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/8-Orders.webp",
        alt: { fa: "سفارش‌ها", en: "Orders" },
        span: "tall",
        aspectRatio: 0.469,
      },
      {
        src: "/images/Dotaar Store/9-User Account.webp",
        alt: { fa: "حساب کاربری", en: "User account" },
        span: "tall",
        aspectRatio: 0.469,
      },
    ],
  },

  // 3 — MAFIA MASTER (Large)
  {
    id: "mafia-master",
    title: { fa: "مافیا مستر", en: "Mafia Master" },
    role: { fa: "وایب کدینگ", en: "Vibe Coding" },
    year: { fa: "۱۴۰۴", en: "2025" },
    size: "large",
    cover: "/images/Mafia Master/Thumbnail.webp",
    accent: "from-rose-200/60 to-orange-200/40 dark:from-rose-500/10 dark:to-orange-500/5",
    tagline: {
      fa: "بازی اجتماعی مافیا با تجربه‌ای سینمایی",
      en: "The social Mafia game with a cinematic experience",
    },
    overview: {
      fa: "مافیا مستر دستیار هوشمندی برای راویان بازی مافیاست که با مدیریت بازیکنان و تخصیص نقش‌ها و کنترل مراحل بازی و هدایت سناریوها اجرای بازی را به‌ویژه برای راویان مبتدی ساده‌تر و دقیق‌تر و منظم‌تر می‌کند. این پروژه فرصتی بود تا در قالب یک محصول کاملاً متفاوت توانایی خودم را در جنبه‌های مختلف طراحی محصول بسنجم و تجربه‌ای جدی از برنامه‌نویسی مبتنی بر هوش مصنوعی یا همان وایب کدینگ به دست بیاورم. توسعه پروژه کاملاً انفرادی انجام شد و تمام ایده‌پردازی‌ها و تعریف قابلیت‌ها و طراحی مسیرهای کاربری و منطق و ساختار محصول بر عهده من بود و هوش مصنوعی صرفاً در طراحی رابط کاربری و پیاده‌سازی فنی نقش داشت.",
      en: "Mafia Master is a smart assistant for Mafia game narrators that manages players, assigns roles, controls game phases, and guides scenarios, making the game — especially for beginner narrators — simpler, more precise, and more organized. This project was an opportunity to test my abilities across different aspects of product design through a completely different kind of product and gain serious experience in AI-based programming, aka vibe coding. Development was entirely solo; all ideation, feature definition, user flow design, and product logic and structure were my responsibility, while AI played a role only in UI design and technical implementation.",
    },
    roleDescription: {
      fa: "اینجا برخلاف پروژه‌های قبلی، حتی یک خط طراحی هم نکردم؛ کل پروژه از ایده تا اجرا، دیباگ و بیلد نهایی، تنها توسط من و با ترکیب ابزارهای هوش مصنوعی (Firebase Studio، GitHub Copilot، Cursor و ChatGPT) پیش رفت — بدون هیچ همکار انسانی، چه طراح و چه توسعه‌دهنده.",
      en: "Here, unlike previous projects, I didn't do a single line of design; the entire project — from idea to execution, debugging, and final build — was driven by me alone, combining AI tools (Firebase Studio, GitHub Copilot, Cursor, and ChatGPT), with no human collaborator, designer or developer.",
    },
    responsibilities: [
      {
        fa: "مدیریت تنهای کل چرخه پروژه: ایده، توسعه، دیباگ و بیلد",
        en: "Sole management of the entire project cycle: idea, development, debugging, and build",
      },
      {
        fa: "ساخت کامل یک محصول قابل عرضه صرفاً با ابزارهای AI",
        en: "Building a complete shippable product using only AI tools",
      },
      {
        fa: "ساده‌سازی مسیر کاربر برای کاهش پیچیدگی بازی",
        en: "Simplifying the user journey to reduce game complexity",
      },
      {
        fa: "بهینه‌سازی سرعت و روان بودن تجربه بازی",
        en: "Optimizing speed and smoothness of the gameplay experience",
      },
    ],
    tools: [
      { name: "Firebase Studio", category: "dev" },
      { name: "GitHub Copilot", category: "dev" },
      { name: "Cursor", category: "dev" },
      { name: "ChatGPT", category: "dev" },
    ],
    gallery: [
      {
        src: "/images/Mafia Master/mafia-1.webp",
        alt: { fa: "پوستر بازی مافیا مستر", en: "Mafia Master game poster" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-2.webp",
        alt: { fa: "حالت‌های بازی", en: "Game mode selection" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-3.webp",
        alt: { fa: "توضیح نقش‌های بازی", en: "Game roles explanation" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-4.webp",
        alt: { fa: "تاریخچه بازی‌ها", en: "Game history logs" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-5.webp",
        alt: { fa: "مدیریت شرکت‌کنندگان", en: "Manage participants" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-6.webp",
        alt: { fa: "شروع دور جدید بازی", en: "Start new game round" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-7.webp",
        alt: { fa: "تنظیمات تایمر فازهای بازی", en: "Phase timer settings" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-8.webp",
        alt: { fa: "تأیید انتخاب نقش", en: "Role selection confirm" },
        span: "tall",
        aspectRatio: 0.462,
      },
      {
        src: "/images/Mafia Master/mafia-9.webp",
        alt: { fa: "جشن پیروزی در بازی", en: "Game victory celebration" },
        span: "tall",
        aspectRatio: 0.462,
      },
    ],
  },

  // FORUMS DESIGN SYSTEM removed from portfolio listing as requested

  // 4 — DEV SOLUTIONS (Small)
  {
    id: "dev-solutions",
    title: { fa: "دِو سولوشن", en: "Dev Solutions" },
    role: { fa: "طراح رابط و تجربه کاربری", en: "UI/UX Designer" },
    year: { fa: "۱۴۰۲ – ۱۴۰۳", en: "2023 – 2024" },
    size: "small",
    cover: "/images/Dev Solutions/Thumbnail.webp",
    accent: "from-stone-200/60 to-neutral-200/40 dark:from-stone-500/10 dark:to-neutral-500/5",
    tagline: {
      fa: "وب‌سایت و پنل مدیریت آژانس طراحی",
      en: "Agency website & management panel",
    },
    overview: {
      fa: "آژانسی برای ارائه خدمات طراحی سایت و مدیریت شبکه‌های اجتماعی که در آن علاوه بر هم‌بنیان‌گذاری آژانس مسئول طراحی تجربه و رابط کاربری وب‌سایت و داشبورد هم بودم. تمام ساختار اطلاعات و مسیرهای کاربری و طراحی رابط کاربری توسط من انجام شد.",
      en: "An agency offering web design and social media management services. Beyond co-founding the agency, I was responsible for designing the UX and UI of both the website and the dashboard. All information architecture, user flows, and UI design were done by me.",
    },
    roleDescription: {
      fa: "هم‌بنیان‌گذار و تنها طراح تجربه و رابط کاربری آژانس؛ طراحی لندینگ‌پیج اصلی و داشبورد مدیریتی، بدون هیچ همکار طراح دیگری، تماماً بر عهده من بود.",
      en: "Co-founder and sole UX/UI designer of the agency; the design of the main landing page and management dashboard was entirely on me, with no fellow designer.",
    },
    responsibilities: [
      {
        fa: "لندینگ‌پیج معرفی خدمات با مسیر مشخص برای ارسال درخواست همکاری",
        en: "A services landing page with a clear path for submitting collaboration requests",
      },
      {
        fa: "پنل مدیریت اختصاصی برای مشاهده و پردازش پیام‌های دریافتی کاربران",
        en: "A dedicated admin panel for viewing and processing incoming user messages",
      },
      {
        fa: "ساختار بصری هماهنگ با هویت برند آژانس",
        en: "A visual structure aligned with the agency's brand identity",
      },
    ],
    // tools: [
    //   { name: "Figma & FigJam", category: "design" },
    // ],
    tools: [],
    gallery: [
      {
        // Natural dims: 5760×13820 → ratio 0.417 (very tall portrait).
        // aspectRatio MUST match the real image — the gallery uses it to
        // decide vertical alignment inside the 16:9 cell (object-top when
        // ratio < 1, else object-center). A wrong value here makes the
        // preview crop from the wrong vertical position.
        src: "/images/Dev Solutions/1-DS Index.webp",
        alt: { fa: "نمای اصلی دِو سولوشن", en: "Dev Solutions index" },
        span: "wide",
        aspectRatio: 0.417,
      },
      {
        // Natural dims: 5760×4096 → ratio 1.406 (landscape, near 16:9).
        src: "/images/Dev Solutions/2-Request.webp",
        alt: { fa: "فرم درخواست همکاری", en: "Collaboration request" },
        span: "square",
        aspectRatio: 1.406,
      },
      {
        // Natural dims: 5760×8012 → ratio 0.719 (tall portrait).
        src: "/images/Dev Solutions/3-Blog page.webp",
        alt: { fa: "صفحه بلاگ آموزشی", en: "Blog page" },
        span: "square",
        aspectRatio: 0.719,
      },
      {
        // Natural dims: 6400×2716 → ratio 2.356 (ultra-wide landscape).
        src: "/images/Dev Solutions/4-Login.webp",
        alt: { fa: "صفحه ورود پنل مدیریت", en: "Admin panel login" },
        span: "wide",
        aspectRatio: 2.356,
      },
      {
        // Natural dims: 6432×2748 → ratio 2.341 (ultra-wide landscape).
        src: "/images/Dev Solutions/5-Request.webp",
        alt: { fa: "لیست درخواست‌های دریافتی پنل مدیریت", en: "Admin incoming requests list" },
        span: "wide",
        aspectRatio: 2.341,
      },
      {
        // Natural dims: 6432×2748 → ratio 2.341 (ultra-wide landscape).
        src: "/images/Dev Solutions/6-Request details.webp",
        alt: { fa: "جزئیات درخواست دریافتی در پنل مدیریت", en: "Admin request details" },
        span: "wide",
        aspectRatio: 2.341,
      },
    ],
    link: {
      label: { fa: "مشاهده اینستاگرام", en: "View on Instagram" },
      href: "https://www.instagram.com/devsolutions.agency",
    },
  },
];

// ---------------------------------------------------------------------------
// EXPERIENCE / RESUME
// ---------------------------------------------------------------------------

export type Experience = {
  id: string;
  role: Bi;
  company: Bi;
  period: Bi;
  start: string; // ISO-ish for ordering
  current?: boolean;
  summary: Bi;
  responsibilities: Bi[];
  goal?: Bi;
};

export const experiences: Experience[] = [
  {
    id: "dutar",
    role: { fa: "طراح محصول", en: "Product Designer" },
    company: { fa: "دوتر", en: "Dotaar" },
    period: { fa: "شهریور ۱۴۰۱ – خرداد ۱۴۰۴", en: "Sep 2022 – Jun 2025" },
    start: "2022-09",
    current: false,
    summary: {
      fa: "به‌عنوان هم‌بنیان‌گذار و طراح محصول دوتر، از مرحله ایده‌پردازی تا طراحی تجربه و رابط کاربری و تعریف جزئیات عملکرد را شخصاً بر عهده داشتم و در تعامل با همکار فنی، پیاده‌سازی محصول را پیش بردیم. دوتر پلتفرم آنلاین اشتراکی برای سفارش‌گیری و مدیریت داخلی رستوران‌ و کافه‌ها است؛ که خدمات اختصاصی برای هر فروشگاه ارائه می‌دهد و نیازهای اساسی آنها را پوشش می‌دهد. انگیزه پروژه از تجربه‌ی کار در رستوران نشأت گرفت، جایی که شناخت عمیقی از فرایند سفارش‌گیری، ارسال و مدیریت پیدا کردم.",
      en: "As co-founder and product designer of Dotaar, I personally owned everything from ideation to UX/UI design and defining functional details, driving implementation with the technical co-founder. Dotaar is an online subscription platform for ordering and internal management of restaurants and cafes, offering dedicated services for each venue and covering their essential needs. The project's motivation grew from hands-on experience working in a restaurant, where I gained deep insight into the ordering, delivery, and management process.",
    },
    responsibilities: [
      {
        fa: "تحقیق بر روی کاربران و تحلیل رقبا برای کشف نیازها، تعریف MVP و اولویت‌بندی ویژگی‌ها.",
        en: "User research and competitor analysis to discover needs, define the MVP, and prioritize features.",
      },
      {
        fa: "طراحی یوزر فلوها، وایرفریم‌ها و سیستم طراحی (شامل کامپوننت لایبرری، دیزاین گاید و توکن‌های رنگ).",
        en: "Designed user flows, wireframes, and the design system (component library, design guide, color tokens).",
      },
      {
        fa: "آزمایش نسخه‌های آنلاین و محلی برای ایجاد تجربه کاربری یکپارچه.",
        en: "Tested online and local versions to create a seamless user experience.",
      },
      {
        fa: "تعریف ویژگی‌های اصلی مانند مدیریت سفارش (پیش‌سفارش، حضوری/بیرون‌بر، رزرو میز)، ناحیه‌بندی ارسال، تنظیم ساعات کاری، تخفیف‌ها و دسته‌بندی محصولات، و برخی موارد دیگر.",
        en: "Defined core features such as order management (pre-order, dine-in/takeout, table reservation), delivery zoning, working hours, discounts, and product categorization, among others.",
      },
    ],
    goal: {
      fa: "ایجاد سیستمی سفارشی و کارآمد برای کسب‌وکارهای متوسط و بزرگ، که عملیات روزانه را ساده‌تر کند. این پروژه مهارت‌های من در طراحی محصول را تقویت کرد و مستقیماً از تجربیات عملی‌ام بهره برد.",
      en: "Create a customized, efficient system for medium and large businesses that simplifies daily operations. This project strengthened my product-design skills and drew directly on my hands-on experience.",
    },
  },
  {
    id: "dev-solutions",
    role: { fa: "طراح رابط و تجربه کاربری (UI/UX)", en: "UI/UX Designer" },
    company: { fa: "دِو سولوشن", en: "Dev Solutions" },
    period: { fa: "آذر ۱۴۰۲ – مرداد ۱۴۰۳", en: "Dec 2023 – Aug 2024" },
    start: "2023-12",
    current: false,
    summary: {
      fa: "به‌عنوان هم‌بنیان‌گذار و طراح تجربه و رابط کاربری در آژانس «دِو سولوشن» (Dev Solutions)، نقش کلیدی در تأسیس و هدایت این مجموعه خدمات طراحی سایت و مدیریت شبکه‌های اجتماعی ایفا کردم. این پروژه که پیش از راه‌اندازی نهایی سامانه «دوتر» آغاز شد، سکوی پرتابی برای ورود به چالش‌های پیشرفته‌تر طراحی محصول بود. کار در دِو سولوشن به من دیدی عملی درباره‌ی ساخت نمونه‌های اولیه، سنجش نیاز بازار، و طراحی محصول قابل عرضه داد.",
      en: "As co-founder and UX/UI designer at the “Dev Solutions” agency, I played a key role in founding and leading this web-design and social-media-management service. Starting before Dotaar's final launch, it was a launchpad into more advanced product-design challenges. Working at Dev Solutions gave me a practical view of building prototypes, measuring market needs, and designing marketable products.",
    },
    responsibilities: [
      {
        fa: "طراحی تجربه و رابط کاربری وب‌سایت اصلی دِو سولوشن، از جمله صفحات ارسال درخواست همکاری، وبلاگ آموزشی، و یک پنل مدیریت اختصاصی برای مشاهده و پردازش پیام‌های دریافتی کاربران.",
        en: "Designed the UX/UI of the main Dev Solutions website, including collaboration-request pages, an educational blog, and a dedicated admin panel for viewing and processing incoming user messages.",
      },
      {
        fa: "هدایت پروژه‌های طراحی وب برای مشتریان آژانس، با تمرکز بر طراحی رابط‌هایی کاربرمحور، ساده و اثربخش.",
        en: "Led web-design projects for agency clients, focusing on user-friendly, simple, and effective interfaces.",
      },
      {
        fa: "انجام تحقیقات کاربر و تحلیل رقبا برای تعریف ویژگی‌های کلیدی و ایجاد جریان‌های کاربری یکپارچه و هدفمند.",
        en: "Conducted user research and competitor analysis to define key features and create integrated, purposeful user flows.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// EDUCATION & LANGUAGES
// ---------------------------------------------------------------------------

export type Education = {
  id: string;
  degree: Bi;
  school: Bi;
  period: Bi;
};

export const education: Education[] = [
  {
    id: "graphic",
    degree: { fa: "دیپلم گرافیک رایانه‌ای", en: "Computer Graphics (Diploma)" },
    school: { fa: "نواب صفویی", en: "Navab Safavi" },
    period: { fa: "۱۳۸۹ – ۱۴۰۱", en: "2010 – 2022" },
  },
];

export type LanguageSkill = {
  name: Bi;
  level: Bi;
  percent: number;
};

export const languages: LanguageSkill[] = [
  {
    name: { fa: "انگلیسی", en: "English" },
    level: { fa: "مبتدی", en: "Beginner" },
    percent: 25,
  },
  {
    name: { fa: "فارسی", en: "Persian" },
    level: { fa: "زبان مادری", en: "Native" },
    percent: 100,
  },
];

// ---------------------------------------------------------------------------
// SKILLS (from profile + design tools)
// ---------------------------------------------------------------------------

export type SkillGroup = {
  id: string;
  label: Bi;
  /** A short one-line description of what this category's skills mean. */
  description: Bi;
  items: Bi[];
};

export const skillGroups: SkillGroup[] = [
  {
    id: "design",
    label: { fa: "طراحی", en: "Design" },
    description: {
      fa: "ساخت رابط و تجربه‌ی بصری محصول",
      en: "Crafting the product's visual and interaction layer",
    },
    items: [
      { fa: "سیستم طراحی", en: "Design Systems" },
      { fa: "وایرفریمینگ", en: "Wireframing" },
      { fa: "نمونه‌سازی", en: "Prototyping" },
      { fa: "رابط و تجربه کاربری", en: "UI / UX" },
      { fa: "کپی‌رایتینگ", en: "Copywriting" },
    ],
  },
  {
    id: "process",
    label: { fa: "فرایند", en: "Process" },
    description: {
      fa: "روش‌های کشف نیاز و تعریف راه‌حل",
      en: "Methods to discover needs and define solutions",
    },
    items: [
      { fa: "حل مسئله", en: "Problem-Solving" },
      { fa: "یوزر فلو", en: "User Flow" },
      { fa: "تحقیق کاربر", en: "User Research" },
      { fa: "تحلیل رقبا", en: "Competitor Analysis" },
      { fa: "تعریف MVP", en: "MVP Definition" },
    ],
  },
  {
    id: "tools",
    label: { fa: "ابزارها", en: "Tools" },
    description: {
      fa: "نرم‌افزارهایی که روزانه با آن‌ها کار می‌کنم",
      en: "Software I work with daily",
    },
    items: [
      { fa: "فیگما", en: "Figma" },
      { fa: "فیگ‌جم", en: "FigJam" },
      { fa: "پروتوتایپ", en: "ProtoPie" },
      { fa: "نوشن", en: "Notion" },
      { fa: "فتوشاپ", en: "Photoshop" },
      { fa: "ایلاستریتور", en: "Illustrator" },
    ],
  },
];

// Personal info from the profile
export const profile = {
  name: { fa: "هادی حیدری", en: "Hadi Heydari" },
  role: { fa: "طراح محصول", en: "Product Designer" },
  birthYear: { fa: "۱۳۸۲", en: "2003" },
  gender: { fa: "مرد", en: "Male" },
  maritalStatus: { fa: "مجرد", en: "Single" },
  province: { fa: "خراسان رضوی", en: "Khorasan Razavi" },
  about: {
    fa: "علاقه‌مند به حل مسئله و ساخت راه‌حل‌های نوآورانه‌ام؛ و باور دارم مسیر رشد از یادگیری مستمر، پذیرش بازخورد و اصلاح آگاهانه شکل می‌گیرد.",
    en: "Passionate about problem-solving and building innovative solutions; I believe growth is shaped through continuous learning, embracing feedback, and conscious improvement.",
  },
  // Contact via Jobinja (email/phone are private — routed through Jobinja)
  jobinjaUrl: "https://jobinja.ir/user/heydarihadi",
  resumeCode: "FK-8442866",
  updatedAt: { fa: "۱۴۰۵/۰۲/۰۶", en: "2026-05-27" },
};

// Stats for hero
export const heroStats = [
  { value: "۴", valueEn: "4", label: { fa: "سال تجربه", en: "yrs experience" } },
  { value: "۳", valueEn: "3", label: { fa: "محصول", en: "products" } },
];
