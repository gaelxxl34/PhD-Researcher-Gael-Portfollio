import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE.url}/#about`, lastModified: now, priority: 0.8 },
    { url: `${SITE.url}/#research`, lastModified: now, priority: 0.9 },
    { url: `${SITE.url}/#experience`, lastModified: now, priority: 0.7 },
    { url: `${SITE.url}/#awards`, lastModified: now, priority: 0.6 },
    { url: `${SITE.url}/#skills`, lastModified: now, priority: 0.6 },
    { url: `${SITE.url}/#contact`, lastModified: now, priority: 0.7 },
  ];
}
