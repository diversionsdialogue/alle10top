import { client, previewClient } from "./client";

interface FetchOptions {
  preview?: boolean;
}

const isPlaceholder =
  typeof import.meta.env.SANITY_PROJECT_ID === "undefined" &&
  typeof import.meta.env.PUBLIC_SANITY_PROJECT_ID === "undefined";

/**
 * Fetch data from Sanity with proper caching for Astro.
 * When SANITY_PROJECT_ID is not set (e.g. CI build), returns empty result so build succeeds.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  options: FetchOptions = {}
): Promise<T> {
  if (isPlaceholder) {
    return [] as T;
  }
  const { preview = false } = options;
  const sanityClient = preview ? previewClient : client;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (err) {
    if (err && typeof (err as { message?: string }).message === "string" && (err as { message: string }).message.includes("Dataset not found")) {
      return [] as T;
    }
    throw err;
  }
}
