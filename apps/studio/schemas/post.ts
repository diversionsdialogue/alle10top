import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "A short description for cards and SEO",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pubDate",
      title: "Publish Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Cover Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility",
        }),
      ],
    }),
    defineField({
      name: "imageUrl",
      title: "Afbeeldings-URL (tijdelijk, tot uploads geplaatst zijn)",
      type: "string",
      description:
        "Pad of URL van de featured image uit WordPress; vervangen door een echte upload zodra de bestanden er zijn.",
    }),
    defineField({
      name: "category",
      title: "Categorie",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "legacyPath",
      title: "URL-pad (uit WordPress, bv. /nieuws/top-10-probleembuurten/)",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "published",
      title: "Gepubliceerd op de site",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
              { title: "Code", value: "code" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                    validation: (Rule) =>
                      Rule.uri({
                        scheme: ["http", "https", "mailto", "tel"],
                      }),
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              type: "string",
              title: "Alt Text",
            },
            {
              name: "caption",
              type: "string",
              title: "Caption",
            },
          ],
        },
        { type: "productList" },
        {
          type: "object",
          name: "externalImage",
          title: "Afbeelding (externe URL)",
          fields: [
            { name: "url", type: "string", title: "URL of pad" },
            { name: "alt", type: "string", title: "Alt-tekst" },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "image",
      date: "pubDate",
    },
    prepare({ title, media, date }) {
      return {
        title,
        media,
        subtitle: date ? new Date(date).toLocaleDateString() : "No date",
      };
    },
  },
  orderings: [
    {
      title: "Publish Date, New",
      name: "pubDateDesc",
      by: [{ field: "pubDate", direction: "desc" }],
    },
    {
      title: "Publish Date, Old",
      name: "pubDateAsc",
      by: [{ field: "pubDate", direction: "asc" }],
    },
  ],
});
