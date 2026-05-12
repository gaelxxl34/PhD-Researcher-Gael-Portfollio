import type { Metadata, Viewport } from 'next';
import { SITE } from '@/lib/data';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: '%s | Ongoriko Bindu Gael',
  },
  description: SITE.description,
  keywords: SITE.keywords,
  authors: [{ name: SITE.fullName, url: SITE.url }],
  creator: SITE.fullName,
  publisher: SITE.fullName,
  alternates: { canonical: SITE.url },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: SITE.ogImage,
    shortcut: SITE.ogImage,
    apple: SITE.ogImage,
  },
  openGraph: {
    type: 'profile',
    title: SITE.name,
    description: SITE.shortDescription,
    url: SITE.url,
    siteName: SITE.name,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1080,
        height: 1080,
        alt: `${SITE.fullName}, PhD Researcher at UT Dallas`,
      },
    ],
    firstName: 'Ongoriko Bindu',
    lastName: 'Gael',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.shortDescription,
    images: [
      {
        url: '/og-image.png',
        alt: `${SITE.fullName}, PhD Researcher`,
      },
    ],
  },
  other: {
    citation_author: SITE.fullName,
    citation_author_institution: 'University of Texas at Dallas',
    'DC.creator': SITE.fullName,
    'DC.subject':
      'Multi-Agent Systems; Intelligent Simulation; Autonomous Agents; Computer Science; Interactive Computing',
    'DC.description':
      'PhD researcher at UT Dallas working on large-scale multi-agent simulation systems and autonomous agent coordination.',
    'DC.type': 'PersonalPage',
    'DC.language': 'en',
  },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE.url}/#person`,
      name: SITE.fullName,
      alternateName: ['Gael Ongoriko', 'Ongoriko Gael', 'OBG'],
      url: SITE.url,
      image: `${SITE.url}${SITE.ogImage}`,
      email: SITE.email,
      telephone: SITE.phoneTel,
      jobTitle: 'PhD Researcher in Computer Science',
      description:
        'PhD researcher at the University of Texas at Dallas specializing in multi-agent simulation, autonomous agent systems, and intelligent computing. Founder of Nyota Innovations and GAIME AI Innovation Award winner.',
      alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: 'International University of East Africa',
        address: { '@type': 'PostalAddress', addressCountry: 'UG' },
      },
      memberOf: [
        {
          '@type': 'Organization',
          name: 'Multi-Agent and Visualization Systems Lab (MAVS Lab)',
          url: 'https://utdallas.edu',
        },
        {
          '@type': 'CollegeOrUniversity',
          name: 'University of Texas at Dallas',
          url: 'https://utdallas.edu',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Richardson',
            addressRegion: 'TX',
            addressCountry: 'US',
          },
        },
      ],
      worksFor: [
        {
          '@type': 'Organization',
          name: 'Nyota Innovations',
          foundingDate: '2024',
          founder: { '@type': 'Person', name: SITE.fullName },
        },
      ],
      award: [
        'GAIME Startup Battlefield Winner 2025, $75,000',
        'AI Innovation Award, $10,000',
        'First Title in Legal Technology, Uganda',
        'VR Technology Pioneer Award',
        'Google Developer Student Club Demo Days Winner',
      ],
      knowsAbout: [
        'Multi-Agent Systems',
        'Agent-Based Simulation',
        'Autonomous Agents',
        'Reinforcement Learning',
        'Artificial Intelligence',
        'Virtual Reality',
        'Smart Cities',
        'Intelligent Transportation Systems',
        'Machine Learning',
        'Natural Language Processing',
        'Interactive Computing',
        'Distributed Systems',
      ],
      sameAs: [SITE.linkedin, SITE.github],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: SITE.url,
      name: `${SITE.fullName}, PhD Researcher`,
      description:
        'Personal research website of Ongoriko Bindu Gael, PhD researcher in multi-agent systems and AI simulation at UT Dallas.',
      publisher: { '@id': `${SITE.url}/#person` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE.url}/#research`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${SITE.url}/#profilepage`,
      url: SITE.url,
      name: `${SITE.fullName}, PhD Researcher in Multi-Agent Systems`,
      about: { '@id': `${SITE.url}/#person` },
      mainEntity: { '@id': `${SITE.url}/#person` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" prefix="og: https://ogp.me/ns#">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Outfit:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var n=function(){};['log','info','debug'].forEach(function(k){try{console[k]=n;}catch(e){}});})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
