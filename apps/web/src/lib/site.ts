import { getCollection, type CollectionEntry } from "astro:content";
import { sanityFetch } from "./sanity/fetch";
import {
  portableTextToHtml,
  portableTextToPlainText,
} from "./sanity/portableText";

/**
 * Contentbron-schakelaar: false (default) = markdown Content Collections,
 * true = Sanity. Zet USE_SANITY=true in apps/web/.env nadat het
 * Sanity-project is aangemaakt en scripts/migrate-alle10top.ts is gedraaid.
 */
export const USE_SANITY = import.meta.env.USE_SANITY === "true";

export const SITE = {
  name: "Alle10top",
  url: "https://www.alle10top.nl",
  title: "Alle10top.nl — Slimme lijstjes voor een vliegende start",
  description:
    "Slimme top 10-lijstjes om een snelle start te maken met je hobby. Geen uitleg, gewoon een top 10.",
};

export type Categorie = {
  slug: string;
  label: string;
  icon: string; // lucide-naam, zie Icon.astro
  groep: string;
  tint: [string, string]; // [achtergrond, icoonkleur]
};

// Volgorde binnen een groep = volgorde in megamenu en archief-chips.
export const CATEGORIEEN: Categorie[] = [
  // Hobby & creatief
  { slug: "aquarelleren", label: "Aquarelleren", icon: "palette", groep: "Hobby & creatief", tint: ["#FFE6E0", "#C43618"] },
  { slug: "fotografie", label: "Fotografie", icon: "camera", groep: "Hobby & creatief", tint: ["#F4EEE4", "#44413D"] },
  { slug: "handwerken", label: "Handwerken", icon: "scissors", groep: "Hobby & creatief", tint: ["#FFE6E0", "#FF5B3E"] },
  { slug: "lezen", label: "Lezen", icon: "book-open", groep: "Hobby & creatief", tint: ["#FFF7D6", "#E0B426"] },
  { slug: "koken-bakken", label: "Koken & bakken", icon: "utensils", groep: "Hobby & creatief", tint: ["#FFE6E0", "#FF5B3E"] },
  { slug: "koffie", label: "Koffie", icon: "coffee", groep: "Hobby & creatief", tint: ["#F4EEE4", "#44413D"] },
  { slug: "tuinieren", label: "Tuinieren", icon: "sprout", groep: "Hobby & creatief", tint: ["#E4F3EA", "#2E8B57"] },
  { slug: "hardlopen", label: "Hardlopen", icon: "footprints", groep: "Hobby & creatief", tint: ["#E4F3EA", "#2E8B57"] },
  { slug: "vogels-kijken", label: "Vogels kijken", icon: "binoculars", groep: "Hobby & creatief", tint: ["#E3EEFA", "#2563A8"] },
  // Wonen & leven
  { slug: "wonen", label: "Wonen", icon: "home", groep: "Wonen & leven", tint: ["#FFF7D6", "#E0B426"] },
  { slug: "duurzaam", label: "Duurzaam", icon: "leaf", groep: "Wonen & leven", tint: ["#E4F3EA", "#2E8B57"] },
  { slug: "pensioen", label: "Pensioen", icon: "armchair", groep: "Wonen & leven", tint: ["#E3EEFA", "#2563A8"] },
  { slug: "gezondheid", label: "Gezondheid", icon: "heart-pulse", groep: "Wonen & leven", tint: ["#FFE6E0", "#C43618"] },
  { slug: "sinterklaas", label: "Sinterklaas", icon: "gift", groep: "Wonen & leven", tint: ["#FFE6E0", "#FF5B3E"] },
  // Uit & vrije tijd
  { slug: "dagtrips", label: "Dagtrips", icon: "map", groep: "Uit & vrije tijd", tint: ["#FFF7D6", "#E0B426"] },
  { slug: "vrije-tijd", label: "Vrije tijd", icon: "puzzle", groep: "Uit & vrije tijd", tint: ["#FFE6E0", "#FF5B3E"] },
  { slug: "sporten", label: "Sporten", icon: "trophy", groep: "Uit & vrije tijd", tint: ["#FFF7D6", "#E0B426"] },
  { slug: "media", label: "Media", icon: "tv", groep: "Uit & vrije tijd", tint: ["#F4EEE4", "#44413D"] },
  { slug: "nieuws", label: "Nieuws", icon: "newspaper", groep: "Uit & vrije tijd", tint: ["#E3EEFA", "#2563A8"] },
  { slug: "auto", label: "Auto", icon: "car", groep: "Uit & vrije tijd", tint: ["#F4EEE4", "#44413D"] },
];

export const MEGA_GROEPEN = ["Hobby & creatief", "Wonen & leven", "Uit & vrije tijd"];

export function categorie(slug: string): Categorie {
  return (
    CATEGORIEEN.find((c) => c.slug === slug) ?? {
      slug,
      label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
      icon: "list",
      groep: "Uit & vrije tijd",
      tint: ["#FFE6E0", "#FF5B3E"],
    }
  );
}

/** Uniforme post-vorm voor beide contentbronnen (markdown / Sanity). */
export type Post = {
  id: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    category: string;
    tags: string[];
    legacyPath: string;
    published: boolean;
    image?: { url: string; alt?: string };
  };
  /** Markdown-modus: de collection entry (renderen via render()) */
  entry?: CollectionEntry<"posts">;
  /** Sanity-modus: kant-en-klare HTML uit Portable Text */
  bodyHtml?: string;
  /** Platte tekst voor leestijd */
  bodyText: string;
};

function uitEntry(entry: CollectionEntry<"posts">): Post {
  return {
    id: entry.id,
    data: entry.data,
    entry,
    bodyText: entry.body ?? "",
  };
}

const SANITY_POSTS_QUERY = `*[_type == "post" && published == true] | order(pubDate desc) {
  "id": slug.current, title, description, pubDate, category, tags,
  legacyPath, published, imageUrl, body
}`;

function uitSanity(doc: any): Post {
  return {
    id: doc.id,
    data: {
      title: doc.title,
      description: doc.description,
      pubDate: new Date(doc.pubDate),
      category: doc.category,
      tags: doc.tags ?? [],
      legacyPath: doc.legacyPath,
      published: doc.published !== false,
      ...(doc.imageUrl ? { image: { url: doc.imageUrl, alt: doc.title } } : {}),
    },
    bodyHtml: portableTextToHtml(doc.body ?? []),
    bodyText: portableTextToPlainText(doc.body ?? []),
  };
}

let cache: Post[] | null = null;

export async function gepubliceerdePosts(): Promise<Post[]> {
  if (cache) return cache;
  if (USE_SANITY) {
    const docs = await sanityFetch<any[]>(SANITY_POSTS_QUERY);
    cache = (docs ?? []).map(uitSanity);
  } else {
    const posts = await getCollection("posts", (p) => p.data.published);
    cache = posts
      .map(uitEntry)
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  }
  return cache;
}

export function postUrl(post: Post): string {
  return post.data.legacyPath;
}

export function formatteerDatum(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Categorieën die daadwerkelijk gepubliceerde posts hebben, met aantallen. */
export async function categorieenMetAantal(): Promise<
  Array<Categorie & { count: number }>
> {
  const posts = await gepubliceerdePosts();
  const telling = new Map<string, number>();
  for (const p of posts) {
    telling.set(p.data.category, (telling.get(p.data.category) ?? 0) + 1);
  }
  return CATEGORIEEN.filter((c) => telling.has(c.slug)).map((c) => ({
    ...c,
    count: telling.get(c.slug)!,
  }));
}
