import { getImageUrl } from "./image";
import { portableTextToPlainText } from "./portableText";
import type {
  SanityPost,
  SanityTeamMember,
  SanityLegalPage,
  Post,
  TeamMember,
  LegalPage,
} from "./types";

/**
 * Transform Sanity post to UI-friendly shape
 * Matches the original Astro content collection structure
 */
export function transformPost(post: SanityPost): Post {
  return {
    slug: post.slug,
    data: {
      title: post.title,
      description: post.description,
      pubDate: new Date(post.pubDate),
      tags: post.tags || [],
      image: {
        url: getImageUrl(post.image?.asset),
        alt: post.image?.alt || post.title || "",
      },
    },
    // Body is plain text (from pt::text) for reading time calculation
    body: typeof post.body === "string" ? post.body : "",
  };
}

/**
 * Transform Sanity team member to UI-friendly shape
 */
export function transformTeamMember(member: SanityTeamMember): TeamMember {
  return {
    slug: member.slug,
    data: {
      name: member.name,
      role: member.role,
      // Convert bio to plain text for display in layout
      bio: member.bio ? portableTextToPlainText(member.bio) : "",
      image: {
        url: getImageUrl(member.image?.asset),
        alt: member.image?.alt || member.name || "",
      },
      socials: member.socials,
    },
    body: member.body,
  };
}

/**
 * Transform Sanity legal page to UI-friendly shape
 */
export function transformLegalPage(page: SanityLegalPage): LegalPage {
  return {
    slug: page.slug,
    data: {
      page: page.page,
      pubDate: new Date(page.pubDate),
    },
    body: page.body,
  };
}
