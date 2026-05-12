# Gael Ongoriko — Portfolio (Next.js)

Personal portfolio site for Gael Ongoriko, PhD Researcher at UT Dallas.

## Stack
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- Plain CSS (no framework — same design as the original HTML)

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Production build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Next.js — just click **Deploy**.
4. After deploy, update `SITE.url` in [lib/data.ts](lib/data.ts) with your real URL so social link previews work, then redeploy.

## Project structure

```
app/
  layout.tsx       # Root layout, metadata (OG tags)
  page.tsx         # Home page — composes all sections
  globals.css      # All styles
components/
  Nav.tsx
  Hero.tsx
  About.tsx
  Research.tsx
  Experience.tsx
  Awards.tsx
  Skills.tsx
  Contact.tsx
  Footer.tsx
lib/
  data.ts          # All content (skills, experience, awards, etc.)
public/
  gael.jpg         # Profile photo (also used for social previews)
```

## Adding a blog later

1. `npm install @next/mdx @mdx-js/loader @mdx-js/react`
2. Create `app/blog/page.tsx` (index) and `app/blog/[slug]/page.tsx` (post).
3. Drop `.mdx` files in `content/blog/` and read them with `fs` + `gray-matter`.
