# Hadi Heydari Portfolio

Modern single-page portfolio built with React, Tailwind CSS, and Framer Motion.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Structure

- `src/App.jsx` contains the single-page layout, bilingual copy, project data, language toggle, animations, and project modal.
- `src/index.css` contains Tailwind v4 imports, theme tokens, global background, and glass/noise utilities.
- `public/projects` contains replaceable project preview images.
- `tailwind.config.js` documents the design tokens for editors and future Tailwind tooling.

## Updating Content

Project cards are defined in the `projects` array in `src/App.jsx`. Replace image paths with files placed in `public/projects`, then update each bilingual `title`, `category`, `description`, and `detail` field.

Contact links are in the Contact section of `src/App.jsx`.
