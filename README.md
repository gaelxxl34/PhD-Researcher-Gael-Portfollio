# Gael Ongoriko Portfolio

Personal site for **Ongoriko Bindu Gael**, PhD Researcher in Multi-Agent Systems at UT Dallas.

Live: [gaelongoriko.com](https://gaelongoriko.com)

## Tech

- Next.js 15 (App Router)
- React 19 + TypeScript
- Plain CSS

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Edit content

All text content lives in [`lib/data.ts`](lib/data.ts): site info, experience, awards, skills, research cards. Update there and the site reflects the changes.

## Structure

```
app/
  layout.tsx        SEO metadata + JSON-LD
  page.tsx          Composes all sections
  globals.css
  robots.ts         /robots.txt
  sitemap.ts        /sitemap.xml
components/         One file per section
lib/data.ts         All content
public/gael.jpg     Profile photo
```

## Deploy

Push to GitHub, import the repo on [vercel.com/new](https://vercel.com/new), click **Deploy**.

