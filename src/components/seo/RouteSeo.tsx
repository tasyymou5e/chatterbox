import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://chatterbox.life';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface RouteMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

/**
 * Per-route metadata for public pages.
 * Titles stay under 60 characters, descriptions between 50-160.
 */
const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'Chatterbox — Autism Support for Children & Families',
    description:
      'Chatterbox empowers children with autism through educational games, communication tools, and progress tracking for the whole family.',
  },
  '/about': {
    title: 'About Chatterbox — Our Mission and Approach',
    description:
      'Learn who builds Chatterbox, the clinical thinking behind our activities, and how we support autistic children and their families.',
  },
  '/auth': {
    title: 'Sign In or Create a Chatterbox Account',
    description:
      'Sign in to Chatterbox or create a family account to access the kids portal, progress reports, and parent tools.',
    noindex: true,
  },
  '/games': {
    title: 'Educational Games Catalog for Autistic Children',
    description:
      'Browse the Chatterbox catalog of autism-friendly games covering memory, phonics, matching, emotions, and everyday life skills.',
  },
  '/assessment': {
    title: 'Autism Skills Assessment for Parents | Chatterbox',
    description:
      'Complete a guided skills assessment to understand your child\u2019s strengths and get a personalized daily activity plan.',
  },
  '/features/educational-games': {
    title: 'Educational Games for Children with Autism',
    description:
      'Interactive learning games built for autistic children: memory, phonics, patterns, and speech practice with adaptive difficulty.',
  },
  '/features/communication-support': {
    title: 'AAC & Communication Support | Chatterbox',
    description:
      'Communication tools and AAC boards that help non-speaking and emerging-speech children express needs, choices, and feelings.',
  },
  '/features/progress-tracking': {
    title: 'Progress Tracking for Autism Skill Development',
    description:
      'Track skill growth across communication, cognition, and daily living with clear charts and shareable clinical reports.',
  },
  '/features/family-management': {
    title: 'Family Management Tools for Parents | Chatterbox',
    description:
      'Manage children, chores, routines, and rewards in one family workspace designed around autism support at home.',
  },
  '/support/help-center': {
    title: 'Chatterbox Help Center — Guides and Answers',
    description:
      'Find setup guides, troubleshooting steps, and answers to common questions about using Chatterbox with your family.',
  },
  '/support/contact': {
    title: 'Contact the Chatterbox Team',
    description:
      'Get in touch with the Chatterbox team for support, feedback, partnership questions, or help with your family account.',
  },
  '/support/privacy-policy': {
    title: 'Privacy Policy | Chatterbox',
    description:
      'How Chatterbox collects, protects, and uses family and child data, including your rights and our security commitments.',
  },
  '/support/terms': {
    title: 'Terms of Service | Chatterbox',
    description:
      'The terms that govern your use of Chatterbox, including account responsibilities, acceptable use, and service limitations.',
  },
  '/connect/community-forum': {
    title: 'Autism Parent Community Forum | Chatterbox',
    description:
      'Connect with other parents and caregivers raising autistic children to share strategies, wins, and everyday practical advice.',
  },
  '/connect/parent-resources': {
    title: 'Parent Resources for Autism Support | Chatterbox',
    description:
      'Guides, videos, and printable resources that help parents support communication, routines, and skill building at home.',
  },
  '/connect/therapist-tools': {
    title: 'Therapist Tools for Autism Practices | Chatterbox',
    description:
      'Session-ready tools, progress data, and reporting that help therapists collaborate with families between appointments.',
  },
  '/connect/research-studies': {
    title: 'Autism Research & Studies | Chatterbox',
    description:
      'Explore the research and evidence base behind Chatterbox activities, plus studies families can learn from or join.',
  },
};

const FALLBACK: RouteMeta = {
  title: 'Chatterbox — Autism Support for Children & Families',
  description:
    'Chatterbox empowers children with autism through educational games, communication tools, and progress tracking for the whole family.',
};

const PRIVATE_PREFIXES = ['/parent', '/kids', '/admin', '/reports', '/children'];

/**
 * Sets per-route title, description, canonical, and social tags.
 * Rendered once inside the router so every route gets unique metadata.
 */
export const RouteSeo = () => {
  const { pathname } = useLocation();
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const meta = ROUTE_META[normalized];
  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
  const resolved = meta ?? FALLBACK;
  const noindex = meta?.noindex ?? (isPrivate || !meta);
  const url = `${SITE_URL}${normalized === '/' ? '/' : normalized}`;

  return (
    <Helmet>
      <title>{resolved.title}</title>
      <meta name="title" content={resolved.title} />
      <meta name="description" content={resolved.description} />
      {noindex ? <meta name="robots" content="noindex,follow" /> : null}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={resolved.title} />
      <meta property="og:description" content={resolved.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:title" content={resolved.title} />
      <meta property="twitter:description" content={resolved.description} />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:image" content={DEFAULT_OG_IMAGE} />
    </Helmet>
  );
};

export default RouteSeo;
