import rss from "@astrojs/rss";
import { gepubliceerdePosts, postUrl, SITE } from "@/lib/site";

export async function GET(context) {
  const posts = await gepubliceerdePosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
    })),
    customData: "<language>nl-NL</language>",
  });
}
