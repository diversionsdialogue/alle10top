import { defineField, defineType } from "sanity";

/**
 * bol.com top 10-productlijst, gemigreerd uit de WP-plugin
 * (top_10 CPT + bol_product CPT).
 */
export const productList = defineType({
  name: "productList",
  title: "Productlijst (bol.com)",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Lijsttitel",
      type: "string",
    }),
    defineField({
      name: "layout",
      title: "Weergave",
      type: "string",
      options: { list: ["list", "grid"] },
      initialValue: "list",
    }),
    defineField({
      name: "products",
      title: "Producten",
      type: "array",
      of: [
        {
          type: "object",
          name: "product",
          fields: [
            { name: "title", title: "Productnaam", type: "string" },
            {
              name: "imageUrl",
              title: "Afbeeldings-URL (bol.com CDN)",
              type: "url",
            },
            { name: "price", title: "Prijs (tekst, bv. € 34,95)", type: "string" },
            { name: "rating", title: "Beoordeling (bv. 4.6)", type: "string" },
            { name: "url", title: "Product-URL (bol.com)", type: "url" },
          ],
          preview: {
            select: { title: "title", subtitle: "price" },
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare({ title }) {
      return { title: title || "Productlijst", subtitle: "bol.com top 10" };
    },
  },
});
