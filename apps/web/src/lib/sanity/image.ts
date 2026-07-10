import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { client } from "./client";

const builder = imageUrlBuilder(client);

/**
 * Generate optimized image URLs from Sanity image assets
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// Placeholder image for posts/team members without images
const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x800/e5e5e5/a3a3a3?text=No+Image";

/**
 * Get a fully-formed image URL with common defaults
 * Returns a placeholder if no image is provided
 */
export function getImageUrl(
  source: SanityImageSource | undefined | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "jpg" | "png";
  } = {}
): string {
  // Return placeholder if no source provided
  if (!source) {
    return PLACEHOLDER_IMAGE;
  }

  const { width, height, quality = 80, format = "webp" } = options;

  try {
    let imageBuilder = builder.image(source).format(format).quality(quality);

    if (width) {
      imageBuilder = imageBuilder.width(width);
    }

    if (height) {
      imageBuilder = imageBuilder.height(height);
    }

    return imageBuilder.url();
  } catch (error) {
    // If image URL generation fails, return placeholder
    return PLACEHOLDER_IMAGE;
  }
}
