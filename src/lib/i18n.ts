/**
 * Bilingual UI string dictionary (Persian + English).
 * Content-heavy data (projects, experience, skills) lives in `src/lib/content.ts`.
 */

export type Locale = "fa" | "en";

export const dict = {
  fa: {
    // Brand / name
    name: "هادی حیدری",
    role: "طراح محصول",
    // Nav
    nav: {
      about: "درباره من",
      work: "نمونه‌کارها",
      experience: "سوابق",
      skills: "مهارت‌ها",
      contact: "تماس",
    },
    // Hero
    hero: {
      availability: "آماده برای همکاری",
      greeting: "سلام، من هادی هستم",
      title: "طراح محصول",
      level: "میان‌سطح",
      badgeDesignSystems: "میان سطح",
      badgeProductDesign: "طراحی محصول",
      tagline:
        "علاقه‌مند به حل مسئله و ساخت راه‌حل‌های نوآورانه‌ام؛ و باور دارم مسیر رشد از یادگیری مستمر، پذیرش بازخورد و اصلاح آگاهانه شکل می‌گیرد.",
      ctaWork: "دیدن نمونه‌کارها",
      ctaContact: "تماس با من",
      scroll: "اسکرول کنید",
      // About integrated into hero
      aboutLabel: "درباره من",
      aboutTitle: "کمی بیشتر درباره‌ام",
      stats: {
        experience: "سال تجربه",
        projects: "پروژه",
        cofounded: "هم‌بنیان‌گذار",
      },
    },
    // Portfolio
    portfolio: {
      label: "نمونه‌کارها",
      title: "پروژه‌های منتخب",
      subtitle:
        "مجموعه‌ای از پروژه‌هایی که در آن‌ها نقش کلیدی در طراحی محصول، تجربه کاربری و ساخت سیستم‌های طراحی داشتم.",
      viewProject: "مشاهده",
      // Modal
      modal: {
        overview: "معرفی پروژه",
        myRole: "نقش من",
        tools: "ابزارهای استفاده‌شده",
        gallery: "تصاویر نمونه‌کار",
        close: "بستن",
        slideOf: "از",
        scrollHint: "اسکرول کنید",
        resetHint: "دو ضربه برای زوم/ریست",
        category: {
          design: "طراحی",
          research: "تحقیق",
          prototyping: "نمونه‌سازی",
          dev: "توسعه",
          management: "مدیریت",
        },
      },
    },
    // Experience
    experience: {
      label: "سوابق شغلی",
      title: "مسیر حرفه‌ای",
      subtitle:
        "تجربه‌هایی که در آن‌ها از ایده‌پردازی تا پیاده‌سازی محصول، نقش محوری داشتم.",
      present: "تاکنون",
      keyResponsibilities: "وظایف کلیدی",
      goal: "هدف",
    },
    // Skills
    skills: {
      label: "مهارت‌ها",
      title: "ابزارها و توانمندی‌ها",
      subtitle:
        "ترکیبی از مهارت‌های نرم و تخصصی که در طراحی محصول به کار می‌گیرم.",
      categories: {
        design: "طراحی",
        process: "فرایند",
        tools: "ابزارها",
      },
    },
    // Contact
    contact: {
      label: "تماس",
      title: "بیایید گفتگو را شروع کنیم",
      subtitle:
        "فرصت‌های جدید، تیم‌های پویا و چالش‌های تازه همیشه برام ارزشمندن",
      emailMe: "ارسال ایمیل",
      jobinja: "مشاهده رزومه در جابینجا",
      locationLabel: "موقعیت",
      location: "خراسان رضوی، ایران",
      birthYearLabel: "سال تولد",
      availabilityLabel: "وضعیت",
      availability: "آماده برای همکاری",
      responseTime: "پاسخ معمولاً زیر ۲۴ ساعت",
      phoneLabel: "شماره تماس",
      phone: "+989352126934",
      callMe: "تماس با من",
    },
    // Footer
    footer: {
      rights: "تمامی حقوق محفوظ است.",
      builtWith: "ساخته‌شده با عشق به طراحی",
      backToTop: "بازگشت به بالا",
    },
    // Common
    common: {
      language: "زبان",
      theme: "پوسته",
      light: "روشن",
      dark: "تیره",
    },
  },
  en: {
    name: "Hadi Heydari",
    role: "Product Designer",
    nav: {
      about: "About",
      work: "Work",
      experience: "Experience",
      skills: "Skills",
      contact: "Contact",
    },
    hero: {
      availability: "Available for work",
      greeting: "Hi, I'm Hadi",
      title: "Product Designer",
      level: "Mid-Level",
      badgeDesignSystems: "Mid-Level",
      badgeProductDesign: "Product Design",
      tagline:
        "Passionate about problem-solving and building innovative solutions; I believe growth is shaped through continuous learning, embracing feedback, and conscious improvement.",
      ctaWork: "View my work",
      ctaContact: "Get in touch",
      scroll: "Scroll",
      aboutLabel: "About me",
      aboutTitle: "A bit more about me",
      stats: {
        experience: "yrs experience",
        projects: "projects",
        cofounded: "co-founded",
      },
    },
    portfolio: {
      label: "Work",
      title: "Selected projects",
      subtitle:
        "A collection of projects where I played a key role in product design, user experience, and building design systems.",
      viewProject: "View",
      modal: {
        overview: "Project overview",
        myRole: "My role",
        tools: "Tools used",
        gallery: "Portfolio images",
        close: "Close",
        slideOf: "of",
        scrollHint: "Scroll",
        resetHint: "Double-tap to zoom / reset",
        category: {
          design: "Design",
          research: "Research",
          prototyping: "Prototyping",
          dev: "Development",
          management: "Management",
        },
      },
    },
    experience: {
      label: "Experience",
      title: "Career path",
      subtitle:
        "Roles where I owned the journey from ideation to product implementation.",
      present: "Present",
      keyResponsibilities: "Key responsibilities",
      goal: "Goal",
    },
    skills: {
      label: "Skills",
      title: "Tools & capabilities",
      subtitle:
        "A blend of soft and specialized skills I bring to product design.",
      categories: {
        design: "Design",
        process: "Process",
        tools: "Tools",
      },
    },
    contact: {
      label: "Contact",
      title: "Let's start a conversation",
      subtitle:
        "New opportunities, dynamic teams, and fresh challenges are always valuable to me",
      emailMe: "Email me",
      jobinja: "View resume on Jobinja",
      locationLabel: "Location",
      location: "Khorasan Razavi, Iran",
      birthYearLabel: "Birth year",
      availabilityLabel: "Status",
      availability: "Available for work",
      responseTime: "Usually replies within 24h",
      phoneLabel: "Phone",
      phone: "+989352126934",
      callMe: "Contact me",
    },
    footer: {
      rights: "All rights reserved.",
      builtWith: "Crafted with love for design",
      backToTop: "Back to top",
    },
    common: {
      language: "Language",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
    },
  },
} as const;

/** Resolve a dotted key path from the dictionary, e.g. t("nav.about"). */
export function resolveKey(locale: Locale, key: string): string {
  const parts = key.split(".");
  let cur: unknown = dict[locale];
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key; // fallback: return the key itself
    }
  }
  return typeof cur === "string" ? cur : key;
}
