import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  AppWindow,
  Box,
  BriefcaseBusiness,
  Calendar,
  GitBranch,
  Globe,
  Image,
  Languages,
  Layers,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Mail,
  PenLine,
  PenTool,
  Phone,
  Search,
  Send,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react'

function Magnetic({ children }) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    if (!ref.current) return
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    const x = clientX - (left + width / 2)
    const y = clientY - (top + height / 2)
    setPosition({ x: x * 0.3, y: y * 0.3 })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  )
}

const contactInfo = {
  email: 'hadiheydari.business@gmail.com',
  phoneFa: '۰۹۳۵۲۱۲۶۹۳۴',
  phoneEn: '09352126934',
  birthFa: '۱۳۸۲',
  birthEn: '2003',
}

const content = {
  en: {
    nav: ['Work', 'Contact'],
    dir: 'ltr',
    name: 'Hadi Heydari',
    role: 'Product Designer',
    eyebrow: 'Design systems, product flows, and usable interfaces',
    intro:
      'I am interested in solving problems and building innovative solutions. Entrepreneurship taught me responsibility and resilience, and I believe growth comes from continuous learning, accepting feedback, and conscious improvement.',
    ctaWork: 'View Work',
    ctaContact: 'Contact',
    timelineTitle: 'Work Timeline',
    timelineNote: 'A focused view of my professional product and UI/UX experience.',
    aboutKicker: 'About',
    resumeTitle: 'Work Experience',
    about:
      'I design focused digital products for commerce and operations, turning complex workflows into clear, scalable experiences. I am interested in solving problems and building innovative solutions. Entrepreneurship taught me responsibility and resilience, and I believe growth comes from continuous learning, accepting feedback, and conscious improvement.',
    experienceTitle: 'Work Experience',
    keyTasks: 'Key responsibilities',
    goalLabel: 'Goal',
    skillsTitle: 'Core Skills',
    projectsTitle: 'Selected Work',
    projectsLead:
      'Expanded case previews based on the product content: store systems, ordering flows, operational tools, analytics, and early agency work.',
    orangeGroup: 'Store / E-commerce Systems',
    greenGroup: 'Dashboard / Management Systems',
    modalClose: 'Close preview',
    galleryLabel: 'Screens',
    contactTitle: 'Let’s shape a product that feels clear and useful.',
    contactLead:
      'I can help with product design, UX systems, dashboards, and early product definition; from understanding the real workflow to designing an experience people can use with confidence.',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    birthLabel: 'Birth year',
    social: 'Social links',
    placeholder: 'Preview image will be added later',
    copiedSuccess: 'Copied!',
    clickToCopy: 'Click to copy',
  },
  fa: {
    nav: ['نمونه‌کارها', 'تماس'],
    dir: 'rtl',
    name: 'هادی حیدری',
    role: 'طراح محصول',
    eyebrow: 'سیستم طراحی، جریان محصول و رابط‌های کاربردی',
    intro:
      'علاقه‌مند به حل مسئله و ساخت راه‌حل‌های نوآورانه‌ام؛ تجربه‌ی کارآفرینی به من مسئولیت‌پذیری و تاب‌آوری آموخت، و باور دارم مسیر رشد از یادگیری مستمر، پذیرش بازخورد و اصلاح آگاهانه شکل می‌گیرد.',
    ctaWork: 'مشاهده کارها',
    ctaContact: 'تماس',
    timelineTitle: 'تایم‌لاین کاری',
    timelineNote: 'نمایی خلاصه از تجربه کاری من در طراحی محصول و طراحی رابط و تجربه کاربری.',
    aboutKicker: 'درباره',
    resumeTitle: 'سوابق شغلی',
    about:
      'محصولات دیجیتال متمرکز برای فروش و عملیات طراحی می‌کنم؛ با تبدیل فرایندهای پیچیده به تجربه‌های شفاف، قابل توسعه و دقیق. علاقه‌مند به حل مسئله و ساخت راه‌حل‌های نوآورانه‌ام؛ تجربه کارآفرینی به من مسئولیت‌پذیری و تاب‌آوری آموخت، و باور دارم مسیر رشد از یادگیری مستمر، پذیرش بازخورد و اصلاح آگاهانه شکل می‌گیرد.',
    experienceTitle: 'سوابق شغلی',
    keyTasks: 'وظایف کلیدی',
    goalLabel: 'هدف',
    skillsTitle: 'مهارت‌های اصلی',
    projectsTitle: 'نمونه‌کارهای منتخب',
    projectsLead:
      'پیش‌نمایش کامل‌تر از محتوای محصول‌ها: سیستم فروشگاهی، جریان سفارش‌گیری، ابزارهای مدیریتی، گزارش‌گیری و تجربه آژانسی.',
    orangeGroup: 'سیستم‌های فروشگاهی / سفارش آنلاین',
    greenGroup: 'داشبوردها / سیستم‌های مدیریتی',
    modalClose: 'بستن پیش‌نمایش',
    galleryLabel: 'تصاویر',
    contactTitle: 'بیایید محصولی بسازیم که روشن، کاربردی و قابل اعتماد باشد.',
    contactLead:
      'می‌توانم در طراحی محصول، سیستم‌های UX، داشبوردها و شکل‌دهی محصول‌های اولیه همراهتان باشم؛ از فهم جریان واقعی کار تا طراحی تجربه‌ای که کاربر با اطمینان از آن استفاده کند.',
    emailLabel: 'ایمیل',
    phoneLabel: 'شماره موبایل',
    birthLabel: 'سال تولد',
    social: 'لینک‌ها',
    placeholder: 'تصویر پیش‌نمایش بعدا اضافه می‌شود',
    copiedSuccess: 'کپی شد!',
    clickToCopy: 'کپی ایمیل',
  },
}

const experiences = [
  {
    company: { en: 'Dootar', fa: 'دوتر' },
    role: { en: 'Product Designer / Co-founder', fa: 'طراح محصول / هم‌بنیان‌گذار' },
    date: { en: 'Sep 2022 - Jun 2025', fa: 'از شهریور ۱۴۰۱ تا خرداد ۱۴۰۴' },
    summary: {
      en: 'I owned the product design path from idea to UX/UI, feature definition, and implementation collaboration. Dootar is a subscription-based online platform for restaurant and cafe ordering plus internal management, shaped by direct restaurant experience and a deep understanding of ordering, delivery, and operations.',
      fa: 'از مرحله ایده‌پردازی تا طراحی تجربه و رابط کاربری و تعریف جزئیات عملکرد را شخصا بر عهده داشتم و در تعامل با همکار فنی، پیاده‌سازی محصول را پیش بردیم. دوتر پلتفرم آنلاین اشتراکی برای سفارش‌گیری و مدیریت داخلی رستوران‌ و کافه‌ها است و انگیزه آن از تجربه مستقیم کار در رستوران و شناخت فرایند سفارش‌گیری، ارسال و مدیریت شکل گرفت.',
    },
    tasks: [
      {
        icon: 'search',
        en: 'Researched users and competitors to discover needs, define the MVP, and prioritize features.',
        fa: 'تحقیق روی کاربران و تحلیل رقبا برای کشف نیازها، تعریف MVP و اولویت‌بندی ویژگی‌ها.',
      },
      {
        icon: 'layers',
        en: 'Designed user flows, wireframes, and a design system including component library, design guide, and color tokens.',
        fa: 'طراحی یوزر فلوها، وایرفریم‌ها و سیستم طراحی شامل کامپوننت لایبرری، دیزاین گاید و توکن‌های رنگ.',
      },
      {
        icon: 'smartphone',
        en: 'Tested online and local versions to create a consistent user experience.',
        fa: 'آزمایش نسخه‌های آنلاین و محلی برای ایجاد تجربه کاربری یکپارچه.',
      },
      {
        icon: 'listChecks',
        en: 'Defined core features such as order management, pre-orders, dine-in/takeaway, table reservation, delivery zoning, operating hours, discounts, and product categories.',
        fa: 'تعریف ویژگی‌های اصلی مانند مدیریت سفارش، پیش‌سفارش، حضوری/بیرون‌بر، رزرو میز، ناحیه‌بندی ارسال، تنظیم ساعات کاری، تخفیف‌ها و دسته‌بندی محصولات.',
      },
    ],
    goal: {
      en: 'Create a custom and efficient system for medium and large businesses that simplifies daily operations.',
      fa: 'ایجاد سیستمی سفارشی و کارآمد برای کسب‌وکارهای متوسط و بزرگ که عملیات روزانه را ساده‌تر کند.',
    },
  },
  {
    company: { en: 'Dev Solutions', fa: 'دِو سولوشن' },
    role: { en: 'UI/UX Designer / Co-founder', fa: 'طراح رابط و تجربه کاربری / هم‌بنیان‌گذار' },
    date: { en: 'Dec 2023 - Aug 2024', fa: 'از آذر ۱۴۰۲ تا مرداد ۱۴۰۳' },
    summary: {
      en: 'As co-founder and UI/UX designer, I helped establish a web design and social media management agency. The work became a launchpad for more advanced product challenges and gave me practical experience in prototyping, market need validation, and designing products ready to ship.',
      fa: 'به‌عنوان هم‌بنیان‌گذار و طراح تجربه و رابط کاربری، نقش کلیدی در تأسیس و هدایت مجموعه خدمات طراحی سایت و مدیریت شبکه‌های اجتماعی داشتم. این تجربه سکوی پرتابی برای ورود به چالش‌های پیشرفته‌تر طراحی محصول بود و دید عملی درباره ساخت نمونه‌های اولیه، سنجش نیاز بازار و طراحی محصول قابل عرضه ایجاد کرد.',
    },
    tasks: [
      {
        icon: 'appWindow',
        en: 'Designed the Dev Solutions website, collaboration request pages, educational blog, and a custom admin panel for reviewing user messages.',
        fa: 'طراحی تجربه و رابط کاربری وب‌سایت اصلی دِو سولوشن، صفحات ارسال درخواست همکاری، وبلاگ آموزشی و پنل مدیریت اختصاصی برای مشاهده و پردازش پیام‌های کاربران.',
      },
      {
        icon: 'penTool',
        en: 'Led client web design projects with a focus on simple, effective, user-centered interfaces.',
        fa: 'هدایت پروژه‌های طراحی وب برای مشتریان آژانس با تمرکز بر رابط‌هایی کاربرمحور، ساده و اثربخش.',
      },
      {
        icon: 'globe',
        en: 'Ran user research and competitor analysis to define key features and purposeful user flows.',
        fa: 'انجام تحقیقات کاربر و تحلیل رقبا برای تعریف ویژگی‌های کلیدی و ایجاد جریان‌های کاربری یکپارچه و هدفمند.',
      },
    ],
    goal: {
      en: 'Turn service ideas into clear, market-aware digital experiences for clients and internal operations.',
      fa: 'تبدیل ایده‌های خدماتی به تجربه‌های دیجیتال روشن، بازارمحور و قابل اجرا برای مشتریان و عملیات داخلی.',
    },
  },
]

const skills = [
  { icon: 'layers', en: 'Design Systems', fa: 'سیستم‌های طراحی' },
  { icon: 'lightbulb', en: 'Problem Solving', fa: 'حل مسئله' },
  { icon: 'gitBranch', en: 'User Flow', fa: 'جریان کاربری' },
  { icon: 'penLine', en: 'Copywriting', fa: 'کپی‌رایتینگ' },
  { icon: 'layoutTemplate', en: 'Wireframing', fa: 'وایرفریمینگ' },
  { icon: 'box', en: 'Prototyping', fa: 'پروتوتایپینگ' },
]

const skillIcons = {
  layers: Layers,
  lightbulb: Lightbulb,
  gitBranch: GitBranch,
  penLine: PenLine,
  layoutTemplate: LayoutTemplate,
  box: Box,
}

const projects = [
  {
    id: 'storefront',
    tone: 'orange',
    image: '/projects/seed-products.jpg',
    images: [
      '/projects/seed-products.jpg',
      '/projects/seed-product-details.jpg',
      '/projects/seed-shopping-cart.jpg',
      '/projects/seed-order-confirmation.jpg',
      '/projects/seed-login-register.jpg',
    ],
    title: { en: 'Restaurant Storefront & Ordering', fa: 'فروشگاه و سفارش‌گیری رستوران' },
    category: {
      en: 'Store / E-commerce systems',
      fa: 'سیستم فروشگاهی / سفارش آنلاین',
    },
    description: {
      en: 'A mobile-first storefront for restaurants with product discovery, details, cart flow, confirmation, login, discounts, and bottom navigation.',
      fa: 'فروشگاه موبایل‌محور برای رستوران با کشف محصول، جزئیات، سبد خرید، تایید سفارش، ورود، تخفیف و ناوبری پایین.',
    },
    detail: {
      en: 'This flow covers the customer side of Dootar: browsing categories, reading product details, adding and removing items, entering notes, reviewing final payment, and receiving order confirmation. The design balances quick food ordering with enough context for price, discount, inventory state, and restaurant identity. Small interaction details such as quantity controls, discount labels, disabled states, and confirmation feedback were designed to reduce hesitation and make the ordering path feel predictable.',
      fa: 'این جریان سمت مشتری دوتر را پوشش می‌دهد: مرور دسته‌بندی‌ها، مشاهده جزئیات محصول، افزودن و حذف آیتم‌ها، ثبت توضیحات، بررسی مبلغ نهایی و دریافت تایید سفارش. طراحی تلاش می‌کند سفارش غذا سریع بماند اما اطلاعات مهم مثل قیمت، تخفیف، وضعیت موجودی و هویت رستوران هم واضح باشد. جزئیاتی مثل کنترل تعداد، برچسب تخفیف، وضعیت غیرفعال و بازخورد تایید برای کاهش تردید و قابل پیش‌بینی شدن مسیر سفارش طراحی شده‌اند.',
    },
  },
  {
    id: 'ops-orders',
    tone: 'green',
    image: '/projects/seed-ordering.jpg',
    images: [
      '/projects/seed-ordering.jpg',
      '/projects/seed-awaiting-approval.jpg',
      '/projects/seed-operational-hours.jpg',
      '/projects/seed-delivery.jpg',
    ],
    title: { en: 'Restaurant Operations Console', fa: 'کنسول عملیات رستوران' },
    category: {
      en: 'Dashboard / Management systems',
      fa: 'داشبورد / سیستم مدیریتی',
    },
    description: {
      en: 'An operational surface for live orders, status control, collection approval, delivery zones, operating hours, announcements, and management shortcuts.',
      fa: 'سطح عملیاتی برای سفارش‌های زنده، کنترل وضعیت، تایید مجموعه، محدوده ارسال، ساعات کاری، اعلان‌ها و دسترسی‌های مدیریتی.',
    },
    detail: {
      en: 'The management experience was designed around high-frequency restaurant workflows. Operators need to scan order status quickly, understand revenue, approve or reject incoming orders, configure active hours, and manage delivery boundaries without cognitive overload. The green dashboard language separates operational and management surfaces from the orange customer ordering path, helping staff recognize the task context immediately.',
      fa: 'تجربه مدیریتی بر اساس جریان‌های پرتکرار رستوران طراحی شد. اپراتور باید وضعیت سفارش را سریع اسکن کند، فروش را ببیند، سفارش‌های ورودی را تایید یا رد کند، ساعات فعال را تنظیم کند و محدوده‌های ارسال را بدون فشار شناختی مدیریت کند. زبان سبز داشبورد، سطح مدیریتی و عملیاتی را از مسیر نارنجی سفارش مشتری جدا می‌کند تا زمینه کاری در لحظه قابل تشخیص باشد.',
    },
  },
  {
    id: 'analytics',
    tone: 'green',
    image: '/projects/seed-sales.jpg',
    images: ['/projects/seed-sales.jpg', '/projects/seed-ordering.jpg'],
    title: { en: 'Sales Analytics & Reports', fa: 'گزارش فروش و تحلیل سفارش' },
    category: {
      en: 'Dashboard / Management systems',
      fa: 'داشبورد / سیستم مدیریتی',
    },
    description: {
      en: 'A reporting view with date range selection, chart comparison, total sales, order outcomes, and history access for managers.',
      fa: 'نمای گزارش‌گیری با انتخاب بازه زمانی، مقایسه نموداری، فروش کل، وضعیت سفارش‌ها و دسترسی به تاریخچه برای مدیران.',
    },
    detail: {
      en: 'The reporting screen turns daily operational data into clear decisions. Instead of overwhelming managers with dense analytics, it highlights the most useful questions: how much was sold, what changed across days, and how many orders were delivered, cancelled, rejected, or expired. The visual hierarchy keeps the report readable on mobile while preserving enough detail for business review.',
      fa: 'صفحه گزارش‌گیری داده‌های روزانه را به تصمیم‌های قابل خواندن تبدیل می‌کند. به‌جای شلوغ‌کردن صفحه با تحلیل‌های سنگین، روی سوال‌های مهم مدیر تمرکز دارد: چقدر فروش داشتیم، روند روزها چه تغییری کرده و چند سفارش تحویل، لغو، رد یا منقضی شده است. سلسله‌مراتب بصری در موبایل خوانایی را حفظ می‌کند و همچنان برای بررسی کسب‌وکار جزئیات کافی دارد.',
    },
  },
  {
    id: 'delivery',
    tone: 'orange',
    image: '/projects/seed-delivery.jpg',
    images: ['/projects/seed-delivery.jpg', '/projects/seed-awaiting-approval.jpg'],
    title: { en: 'Delivery Zones & Service Rules', fa: 'محدوده ارسال و قوانین سرویس‌دهی' },
    category: {
      en: 'Store / E-commerce systems',
      fa: 'سیستم فروشگاهی / سفارش آنلاین',
    },
    description: {
      en: 'Map-based configuration for delivery areas, active status, fees, service boundaries, and approval steps.',
      fa: 'تنظیم مبتنی بر نقشه برای محدوده ارسال، وضعیت فعال، هزینه، مرز سرویس‌دهی و مراحل تایید.',
    },
    detail: {
      en: 'Delivery configuration is usually a complex spatial task, so the design makes the boundary visible first and moves secondary details into compact cards. Fee, active state, guide access, and the continuation action are kept close to the map. This helps store owners understand where they deliver and how much the customer will pay before the rule goes live.',
      fa: 'تنظیم ارسال معمولا یک کار مکانی پیچیده است، بنابراین طراحی ابتدا مرز محدوده را قابل مشاهده می‌کند و جزئیات ثانویه را داخل کارت‌های فشرده می‌گذارد. هزینه، وضعیت فعال، راهنما و اقدام ادامه نزدیک نقشه قرار گرفته‌اند تا صاحب فروشگاه پیش از فعال‌سازی قانون بداند کجا سرویس می‌دهد و مشتری چه هزینه‌ای پرداخت می‌کند.',
    },
  },
  {
    id: 'dev-solutions',
    tone: 'green',
    image: null,
    images: [],
    title: { en: 'Dev Solutions Agency Platform', fa: 'پلتفرم آژانس دِو سولوشن' },
    category: {
      en: 'Dashboard / Management systems',
      fa: 'داشبورد / سیستم مدیریتی',
    },
    description: {
      en: 'A placeholder case for the agency website, collaboration request flow, educational blog, and internal message-management panel.',
      fa: 'کیس موقت برای وب‌سایت آژانس، جریان درخواست همکاری، وبلاگ آموزشی و پنل داخلی مدیریت پیام‌ها.',
    },
    detail: {
      en: 'Images for Dev Solutions will be added later. The case is included because it represents a different product context: service discovery, lead capture, content publishing, and an internal admin workflow for reviewing and processing user messages. The work focused on simple interfaces, purposeful flows, and turning a service idea into a usable market-facing product.',
      fa: 'تصاویر دِو سولوشن بعدا اضافه می‌شود. این کیس فعلا اضافه شده چون زمینه محصولی متفاوتی دارد: معرفی سرویس، جذب درخواست همکاری، انتشار محتوا و جریان داخلی برای مشاهده و پردازش پیام‌های کاربران. تمرکز کار روی رابط‌های ساده، فلوهای هدفمند و تبدیل یک ایده خدماتی به محصول قابل عرضه بود.',
    },
  },
]

const projectGroups = [
  { tone: 'orange', labelKey: 'orangeGroup' },
  { tone: 'green', labelKey: 'greenGroup' },
]

const softEase = [0.16, 1, 0.3, 1]

function revealTransition(delay = 0, duration = 1) {
  return { duration, delay, ease: softEase }
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 16, filter: 'blur(12px)' },
    whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
    viewport: { once: true, margin: '-50px' },
    transition: revealTransition(delay),
  }
}

function App() {
  const [lang, setLang] = useState('en')
  const [activeProject, setActiveProject] = useState(null)
  const t = content[lang]
  const isFa = lang === 'fa'

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div dir={t.dir} className="relative min-h-screen overflow-hidden bg-ink text-slate-50">
      <div className="noise pointer-events-none fixed inset-0 opacity-45" />
      <div className="glow-spotlight" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-ink/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#home" className="text-sm font-semibold tracking-wide text-white">
            {t.name}
          </a>
          <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            {t.nav.map((item, index) => (
              <a
                key={item}
                className="transition hover:text-white"
                href={index === 0 ? '#work' : '#contact'}
              >
                {item}
              </a>
            ))}
          </div>
          <Magnetic>
            <button
              type="button"
              onClick={() => setLang(isFa ? 'en' : 'fa')}
              className="glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-neon/50 hover:text-white"
              aria-label="Toggle language"
            >
              <Languages size={15} />
              {isFa ? 'EN' : 'FA'}
            </button>
          </Magnetic>
        </nav>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-px w-full max-w-[44rem] bg-gradient-to-r from-transparent via-neon/40 to-transparent"
          animate={{ opacity: [0.24, 0.72, 0.24] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={lang}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: softEase }}
          className="relative z-10 mx-auto max-w-6xl px-5"
        >
        <section id="home" className="flex min-h-screen items-center pb-20 pt-32">
          <div className="grid w-full gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={revealTransition(0, 1.05)}
              className="max-w-3xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                <Sparkles size={15} className="text-neon" />
                {t.eyebrow}
              </div>
              <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.04] tracking-normal text-white sm:text-7xl lg:text-8xl">
                {t.name}
                <motion.span
                  className="mt-3 block bg-gradient-to-r from-citrus via-neon to-signal bg-clip-text pb-2 text-2xl font-semibold leading-[1.35] text-transparent sm:text-4xl"
                  style={{ backgroundSize: '220% 100%' }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {t.role}
                </motion.span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                {t.intro}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Magnetic>
                  <a
                    href="#work"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-neon"
                  >
                    {t.ctaWork}
                    <ArrowRight size={16} className={isFa ? 'rotate-180' : ''} />
                  </a>
                </Magnetic>
                <Magnetic>
                  <a
                    href="#contact"
                    className="glass inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:border-neon/50"
                  >
                    {t.ctaContact}
                    <Mail size={16} />
                  </a>
                </Magnetic>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={revealTransition(0.15, 1.1)}
              className="glass relative overflow-hidden rounded-[2rem] p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neon">
                    {t.timelineTitle}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{t.timelineNote}</p>
                </div>
              </div>
              <div className="relative mt-7 space-y-6 ltr:pl-6 rtl:pr-6">
                {/* Continuous glowing path line */}
                <div className="absolute top-3 bottom-3 w-[1px] bg-gradient-to-b from-neon via-neon/30 to-transparent ltr:left-[7px] rtl:right-[7px]" />
                
                {experiences.map((experience, index) => (
                  <motion.div
                    key={experience.company.en}
                    onClick={() => {
                      const el = document.getElementById(`exp-${index}`)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }}
                    className="group relative cursor-pointer rounded-2xl border border-white/10 bg-black/25 p-4 transition-all duration-300 hover:border-neon/30 hover:bg-neon/[0.02]"
                    initial={{ opacity: 0, x: isFa ? 12 : -12, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={revealTransition(0.28 + index * 0.12, 0.9)}
                  >
                    {/* Centered dot on the timeline path */}
                    <div className="absolute top-[26px] flex h-5 w-5 items-center justify-center rounded-full border border-neon bg-ink transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_10px_rgba(125,211,252,0.6)] ltr:-left-[27px] rtl:-right-[27px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse-slow" />
                    </div>
                    
                    <div className="flex gap-4">
                      <div>
                        <p className="font-bold text-white group-hover:text-neon transition-colors duration-300">{experience.role[lang]}</p>
                        <p className="mt-1 text-sm font-semibold text-neon">
                          {experience.company[lang]}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {experience.date[lang]}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-white/10 py-24">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <motion.div {...fadeUp()}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neon">
                {t.experienceTitle}
              </p>
              <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
                {t.resumeTitle}
              </h2>
            </motion.div>
            <div className="grid gap-5">
              <div className="grid gap-5">
                {experiences.map((experience, index) => (
                  <motion.div
                    key={experience.company.en}
                    id={`exp-${index}`}
                    className="scroll-mt-24"
                    {...fadeUp(0.1 + index * 0.12)}
                  >
                    <ExperienceCard experience={experience} lang={lang} />
                  </motion.div>
                ))}
              </div>

              <motion.div {...fadeUp(0.1 + experiences.length * 0.12)} className="glass rounded-[1.5rem] p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-white">{t.skillsTitle}</h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {skills.map((skill) => {
                    const Icon = skillIcons[skill.icon]

                    return (
                      <motion.div
                        key={skill.en}
                        whileHover={{ y: -3, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-sm text-slate-300 transition-colors duration-300 hover:border-neon/30 hover:bg-neon/[0.02] hover:text-white cursor-default"
                      >
                        <Icon size={16} className="shrink-0 text-neon" />
                        {skill[lang]}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="work" className="border-t border-white/10 py-24">
          <motion.div {...fadeUp()} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neon">
              {t.nav[0]}
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
              {t.projectsTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-400">{t.projectsLead}</p>
          </motion.div>

          <div className="mt-12 grid gap-12">
            {projectGroups.map((group) => {
              const groupedProjects = projects.filter((project) => project.tone === group.tone)

              return (
                <motion.div key={group.tone} {...fadeUp(group.tone === 'orange' ? 0.08 : 0.2)}>
                  <div className="mb-5 flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        group.tone === 'orange' ? 'bg-citrus shadow-orange' : 'bg-signal shadow-green'
                      }`}
                    />
                    <h3 className="text-xl font-bold text-white">{t[group.labelKey]}</h3>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    {groupedProjects.map((project, index) => (
                      <ProjectCard
                        key={project.id}
                        index={index}
                        lang={lang}
                        placeholder={t.placeholder}
                        project={project}
                        onOpen={() => setActiveProject(project)}
                      />
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        <section id="contact" className="border-t border-white/10 py-24">
          <motion.div
            {...fadeUp()}
            className="glass grid gap-8 rounded-[2rem] p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neon">
                {t.nav[1]}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-bold text-white sm:text-5xl">
                {t.contactTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                {t.contactLead}
              </p>
            </div>
            <div className="grid gap-3">
              <ContactRow
                href={`mailto:${contactInfo.email}`}
                icon={<Mail size={18} className="text-neon" />}
                label={t.emailLabel}
                value={contactInfo.email}
                isEmail={true}
                copySuccessLabel={t.copiedSuccess}
                clickToCopyLabel={t.clickToCopy}
              />
              <ContactRow
                href={`tel:${contactInfo.phoneEn}`}
                icon={<Phone size={18} className="text-neon" />}
                label={t.phoneLabel}
                value={isFa ? contactInfo.phoneFa : contactInfo.phoneEn}
              />
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-sm">
                  <span className="flex items-center gap-3 text-slate-400">
                    <Calendar size={18} className="text-neon" />
                    {t.birthLabel}
                  </span>
                  <p className="mt-2 font-semibold text-white">
                    {isFa ? contactInfo.birthFa : contactInfo.birthEn}
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                <a
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-4 text-sm font-semibold text-slate-300 transition hover:border-neon/50 hover:text-white"
                >
                  <LinkedInLogo />
                  LinkedIn
                </a>
              </div>
            </div>
          </motion.div>
        </section>
        </motion.main>
      </AnimatePresence>

      <ProjectModal
        project={activeProject}
        lang={lang}
        closeLabel={t.modalClose}
        galleryLabel={t.galleryLabel}
        placeholder={t.placeholder}
        onClose={() => setActiveProject(null)}
      />
    </div>
  )
}

const taskIcons = {
  search: Search,
  layers: Layers,
  smartphone: Smartphone,
  listChecks: ListChecks,
  appWindow: AppWindow,
  penTool: PenTool,
  globe: Globe,
}

function ExperienceCard({ experience, lang }) {
  const t = content[lang]

  return (
    <div className="glass rounded-[1.5rem] p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-neon">{experience.company[lang]}</p>
          <h4 className="mt-2 text-xl font-bold text-white">{experience.role[lang]}</h4>
        </div>
        <p className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-400">
          {experience.date[lang]}
        </p>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-300">{experience.summary[lang]}</p>
      <p className="mt-6 text-sm font-bold text-white">{t.keyTasks}</p>
      <div className="mt-3 grid gap-3">
        {experience.tasks.map((task) => {
          const Icon = taskIcons[task.icon]

          return (
            <div key={task.en} className="flex gap-3 text-sm leading-7 text-slate-400">
              <Icon size={16} className="mt-1 shrink-0 text-neon" />
              <span>{task[lang]}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-6 rounded-2xl border border-neon/20 bg-neon/5 p-4 text-sm leading-7 text-slate-300">
        <span className="font-bold text-neon">{t.goalLabel}: </span>
        {experience.goal[lang]}
      </div>
    </div>
  )
}

function ContactRow({ href, icon, label, value, isEmail = false, copySuccessLabel = '', clickToCopyLabel = '' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    if (isEmail) {
      e.preventDefault()
      navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      onClick={handleCopy}
      className={`group relative flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-5 py-4 text-sm font-semibold text-white transition hover:border-neon/50 ${
        isEmail ? 'cursor-pointer select-none' : ''
      }`}
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        {icon}
        <span className="min-w-0">
          <span className="block text-xs font-medium text-slate-400">{label}</span>
          <span className="block break-all">{value}</span>
        </span>
      </span>
      {isEmail ? (
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-xs text-signal font-bold"
              >
                {copySuccessLabel}
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-500 font-normal group-hover:text-neon"
              >
                {clickToCopyLabel}
              </motion.span>
            )}
          </AnimatePresence>
          <a
            href={href}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
            title="Send Email"
          >
            <Send size={16} />
          </a>
        </div>
      ) : (
        <a href={href} className="flex items-center">
          <Send size={16} className="shrink-0 transition group-hover:translate-x-1" />
        </a>
      )}
    </div>
  )
}

function LinkedInLogo() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded bg-neon text-[11px] font-extrabold leading-none text-ink">
      in
    </span>
  )
}

function ProjectCard({ project, lang, index, placeholder, onOpen }) {
  const isGreen = project.tone === 'green'
  const glow = isGreen ? 'hover:shadow-green' : 'hover:shadow-orange'
  const color = isGreen ? 'text-signal border-signal/25 bg-signal/10' : 'text-citrus border-citrus/25 bg-citrus/10'

  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Smooth 3D tilt calculations (capped at max 6 degrees)
    const rX = ((y - centerY) / centerY) * -5
    const rY = ((x - centerX) / centerX) * 5
    
    setRotateX(rX)
    setRotateY(rY)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...fadeUp(index * 0.1)}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className={`group glass overflow-hidden rounded-[1.5rem] text-start transition duration-300 hover:border-white/20 ${glow}`}
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full"
      >
        <div className="aspect-[16/11] overflow-hidden bg-white/[0.03]" style={{ transform: 'translateZ(30px)' }}>
          {project.image ? (
            <img
              src={project.image}
              alt=""
              className="h-full w-full object-cover object-top opacity-90 transition duration-500 group-hover:scale-[1.035] group-hover:opacity-100"
            />
          ) : (
            <PlaceholderPreview label={placeholder} />
          )}
        </div>
        <div className="p-5 sm:p-6" style={{ transform: 'translateZ(20px)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${color}`}>
              {project.category[lang]}
            </span>
            {project.images.length > 0 && (
              <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
                {project.images.length} {content[lang].galleryLabel}
              </span>
            )}
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">{project.title[lang]}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {project.description[lang]}
              </p>
            </div>
            <BriefcaseBusiness className="mt-1 shrink-0 text-slate-500 transition group-hover:text-neon" size={21} />
          </div>
        </div>
      </motion.div>
    </motion.button>
  )
}

function ProjectModal({ project, lang, closeLabel, galleryLabel, placeholder, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [project?.id])

  if (!project) return null

  const images = project.images.length > 0 ? project.images : [null]
  const safeIndex = Math.min(selectedIndex, images.length - 1)
  const activeImage = images[safeIndex] ?? null
  const scrollClass = project.tone === 'orange' ? 'scrollbar-orange' : 'scrollbar-green'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={revealTransition(0, 0.5)}
        onClick={onClose}
      >
        <motion.div
          dir={content[lang].dir}
          initial={{ opacity: 0, y: 20, scale: 0.97, filter: 'blur(14px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 16, scale: 0.98, filter: 'blur(8px)' }}
          transition={revealTransition(0, 0.65)}
          onClick={(event) => event.stopPropagation()}
          className="glass max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[1.75rem]"
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <p className="text-sm font-semibold text-slate-300">{project.category[lang]}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-neon/50 hover:text-white"
              aria-label={closeLabel}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className={`max-h-[74vh] overflow-auto bg-black/30 p-4 ${scrollClass}`}>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] aspect-[16/11]">
                <AnimatePresence mode="wait">
                  {activeImage ? (
                    <motion.img
                      key={activeImage}
                      src={activeImage}
                      alt=""
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.03 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 h-full w-full"
                    >
                      <PlaceholderPreview label={placeholder} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image ?? project.id}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`aspect-[4/5] overflow-hidden rounded-xl border bg-white/[0.03] transition ${
                      safeIndex === index ? 'border-neon/70' : 'border-white/10 hover:border-white/30'
                    }`}
                    aria-label={`${galleryLabel} ${index + 1}`}
                  >
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover object-top" />
                    ) : (
                      <PlaceholderPreview label="" small />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className={`overflow-auto p-6 sm:p-8 ${scrollClass}`}>
              <p className="text-sm font-semibold text-neon">{galleryLabel}</p>
              <h3 className="mt-3 text-3xl font-bold text-white">{project.title[lang]}</h3>
              <p className="mt-5 text-lg leading-8 text-slate-300">{project.detail[lang]}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function PlaceholderPreview({ label, small = false }) {
  return (
    <div className="grid h-full min-h-52 place-items-center bg-gradient-to-br from-white/[0.08] via-neon/[0.08] to-signal/[0.08] p-6 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-black/20 text-neon">
          <Image size={small ? 20 : 26} />
        </div>
        {label && <p className="mt-4 text-sm font-semibold text-slate-300">{label}</p>}
      </div>
    </div>
  )
}

export default App
