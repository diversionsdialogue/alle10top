import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  groups: [
    { name: "general", title: "General", default: true },
    { name: "seo", title: "SEO" },
    { name: "social", title: "Social" },
  ],
  fields: [
    // General
    defineField({
      name: "title",
      title: "Site Title",
      type: "string",
      group: "general",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Site Description",
      type: "text",
      rows: 3,
      group: "general",
      description: "Used for SEO and meta tags",
    }),
    defineField({
      name: "siteUrl",
      title: "Site URL",
      type: "url",
      group: "general",
      description: "The full URL of your website (e.g., https://example.com)",
      validation: (Rule) => Rule.required(),
    }),

    // SEO
    defineField({
      name: "ogImage",
      title: "Default OG Image",
      type: "image",
      group: "seo",
      description: "Default image for social sharing (1200x630 recommended)",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "twitterHandle",
      title: "Twitter Handle",
      type: "string",
      group: "seo",
      description: "Your Twitter handle (e.g., @yourhandle)",
    }),

    // Navigation
    defineField({
      name: "navigation",
      title: "Navigation Links",
      type: "array",
      group: "general",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "href",
              title: "URL",
              type: "string",
              description: "Use relative paths like /blog or absolute URLs",
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "href",
            },
          },
        },
      ],
    }),
    defineField({
      name: "footer",
      title: "Footer Settings",
      type: "object",
      fields: [
        defineField({
          name: "text",
          title: "Footer Text",
          type: "string",
        }),
        defineField({
          name: "links",
          title: "Footer Links",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "href",
                  title: "URL",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
              ],
            },
          ],
        }),
      ],
    }),
    defineField({
      name: "socials",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: [
                  { title: "Twitter", value: "twitter" },
                  { title: "GitHub", value: "github" },
                  { title: "LinkedIn", value: "linkedin" },
                  { title: "Instagram", value: "instagram" },
                  { title: "YouTube", value: "youtube" },
                  { title: "Other", value: "other" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "platform",
              subtitle: "url",
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Site Settings",
      };
    },
  },
});
