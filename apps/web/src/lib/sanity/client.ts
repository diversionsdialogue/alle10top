import { createClient } from "@sanity/client";

// Placeholder when env not set so client init succeeds; set SANITY_PROJECT_ID for real data.
const projectId =
  import.meta.env.SANITY_PROJECT_ID ||
  import.meta.env.PUBLIC_SANITY_PROJECT_ID ||
  "build-placeholder";

export const client = createClient({
  projectId,
  dataset: import.meta.env.SANITY_DATASET || "production",
  apiVersion: import.meta.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: import.meta.env.PROD,
  token: import.meta.env.SANITY_READ_TOKEN,
});

export const previewClient = createClient({
  projectId,
  dataset: import.meta.env.SANITY_DATASET || "production",
  apiVersion: import.meta.env.SANITY_API_VERSION || "2024-01-01",
  useCdn: false,
  token: import.meta.env.SANITY_READ_TOKEN,
});
