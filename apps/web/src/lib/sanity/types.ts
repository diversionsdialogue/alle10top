import type { PortableTextBlock } from "@portabletext/types";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

// =============================================================================
// IMAGE TYPES
// =============================================================================

export interface SanityImage {
  asset: SanityImageSource;
  alt?: string;
}

// =============================================================================
// POST TYPES
// =============================================================================

/**
 * Post data as returned from Sanity queries
 */
export interface SanityPost {
  _id: string;
  title: string;
  slug: string;
  description: string;
  pubDate: string;
  tags: string[];
  image: SanityImage;
  body: PortableTextBlock[] | string; // string when using pt::text() for plain text
}

/**
 * Post shape expected by UI components (mirrors original Astro content collection shape)
 */
export interface Post {
  slug: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    image: {
      url: string;
      alt: string;
    };
  };
  body: string; // Plain text for reading time calculation
}

// =============================================================================
// TEAM MEMBER TYPES
// =============================================================================

export interface SanityTeamMember {
  _id: string;
  name: string;
  slug: string;
  role?: string;
  bio?: PortableTextBlock[];
  image: SanityImage;
  socials?: Array<{
    label: string;
    href: string;
  }>;
  body?: PortableTextBlock[];
}

/**
 * Team member shape expected by UI components
 */
export interface TeamMember {
  slug: string;
  data: {
    name: string;
    role?: string;
    bio?: string;
    image: {
      url: string;
      alt: string;
    };
    socials?: Array<{
      label: string;
      href: string;
    }>;
  };
  body?: PortableTextBlock[];
}

// =============================================================================
// LEGAL PAGE TYPES
// =============================================================================

export interface SanityLegalPage {
  _id: string;
  page: string;
  slug: string;
  pubDate: string;
  body?: PortableTextBlock[];
}

/**
 * Legal page shape expected by UI components
 */
export interface LegalPage {
  slug: string;
  data: {
    page: string;
    pubDate: Date;
  };
  body?: PortableTextBlock[];
}

// =============================================================================
// SITE SETTINGS TYPES
// =============================================================================

export interface SiteSettings {
  title?: string;
  description?: string;
  navigation?: Array<{
    label: string;
    href: string;
  }>;
  footer?: {
    text?: string;
    links?: Array<{
      label: string;
      href: string;
    }>;
  };
  socials?: Array<{
    platform: string;
    url: string;
  }>;
}
