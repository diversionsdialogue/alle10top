/**
 * markdown-to-portable-text.ts
 *
 * Offline, dependency-free converter: Markdown (the cleaned WP export body, with
 * frontmatter already stripped by gray-matter) -> Sanity Portable Text array.
 *
 * Why hand-rolled instead of @sanity/block-tools?
 *  - block-tools converts HTML (not Markdown) and would add a new dependency +
 *    a JSDOM-ish runtime. This module needs to run offline, with no Sanity token
 *    and no extra install, so it parses the *actual* vocabulary that the Fase 0b
 *    preprocessing produces (see wp-content/content-bron-*).
 *
 * Output shape matches apps/studio/schemas/blocks/bodyField.ts exactly:
 *  - standard `block` with styles normal | h2 | h3 | blockquote
 *  - lists: bullet | number (listItem + level)
 *  - marks: strong | em + `link` annotations (markDefs -> { _type:"link", href })
 *  - inline images: { _type:"image", _sanityAsset? } — here emitted as a portable
 *    image placeholder carrying the original src so the upload step can resolve it
 *  - custom blocks: faqBlock, ctaBlock, quoteBlock, noticeBlock, videoBlock
 *
 * Markers recognised (from the preprocessing, Fase 0b):
 *   :::faq  / VRAAG: / ANTWOORD: / :::            -> faqBlock
 *   :::accordion / TITEL: / INHOUD: / :::         -> NOT a FAQ; rendered as
 *                                                    h3 + body text (logged)
 *   > [!HERBRUIKBAAR-BLOK ref=NNNN] ...           -> noticeBlock placeholder + log
 *   [EMBED youtube]: <url> / [EMBED vimeo]: <url> -> videoBlock
 *   :::cta / KOP|HEADING: / TEKST|TEXT: /
 *          KNOP|BUTTON: / URL|HREF: / :::         -> ctaBlock (explicit marker)
 *
 * CTA is NOT auto-marked by the preprocessing; in the WP posts it usually became
 * plain text. This module converts an explicit :::cta marker when present (used by
 * the offline test + any route-B page that carries one) and otherwise leaves the
 * text as a normal paragraph, logging nothing (the human reviews CTAs in Studio).
 */

export interface PtSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

export interface PtMarkDef {
  _type: string;
  _key: string;
  href?: string;
}

export interface PtBlock {
  _type: "block";
  _key: string;
  style: string;
  markDefs: PtMarkDef[];
  children: PtSpan[];
  listItem?: "bullet" | "number";
  level?: number;
}

export type PtNode = PtBlock | Record<string, any>;

export interface ConvertResult {
  blocks: PtNode[];
  /** Human-readable notes: suspicious residue, dropped/looked-at markers, etc. */
  log: string[];
}

let keyCounter = 0;
/** Deterministic, collision-free keys for one conversion run. */
function key(prefix = "k"): string {
  keyCounter += 1;
  return `${prefix}${keyCounter.toString(36)}`;
}

/** Reset between documents so keys stay short & deterministic per file. */
export function resetKeys(): void {
  keyCounter = 0;
}

/* ------------------------------------------------------------------ */
/* Inline parsing: links, strong, em                                   */
/* ------------------------------------------------------------------ */

interface InlineResult {
  children: PtSpan[];
  markDefs: PtMarkDef[];
}

/**
 * Parse inline markdown (links / **strong** / *em* / _em_) into Portable Text
 * spans + markDefs. Intentionally small: it covers what the export contains.
 */
function parseInline(text: string): InlineResult {
  const children: PtSpan[] = [];
  const markDefs: PtMarkDef[] = [];

  // Token regex, evaluated left-to-right. Order matters: links first, then
  // bold (** **), then italics (* * or _ _).
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
  const strongRe = /\*\*([^*]+)\*\*/;
  const emRe = /(?:\*([^*]+)\*|_([^_]+)_)/;

  let remaining = text;

  const pushText = (t: string, marks: string[]) => {
    if (t.length === 0) return;
    children.push({ _type: "span", _key: key("s"), text: t, marks });
  };

  while (remaining.length > 0) {
    const link = linkRe.exec(remaining);
    const strong = strongRe.exec(remaining);
    const em = emRe.exec(remaining);

    // Find the earliest match.
    const candidates = [
      { kind: "link", m: link },
      { kind: "strong", m: strong },
      { kind: "em", m: em },
    ].filter((c) => c.m) as { kind: string; m: RegExpExecArray }[];

    if (candidates.length === 0) {
      pushText(remaining, []);
      break;
    }

    candidates.sort((a, b) => a.m.index - b.m.index);
    const next = candidates[0];
    const m = next.m;

    // Text before the match -> plain span.
    if (m.index > 0) pushText(remaining.slice(0, m.index), []);

    if (next.kind === "link") {
      const defKey = key("ld");
      markDefs.push({ _type: "link", _key: defKey, href: m[2] });
      // Link label may itself contain marks; keep it simple (plain label).
      pushText(m[1], [defKey]);
    } else if (next.kind === "strong") {
      pushText(m[1], ["strong"]);
    } else {
      pushText(m[1] ?? m[2], ["em"]);
    }

    remaining = remaining.slice(m.index + m[0].length);
  }

  return { children, markDefs };
}

function makeBlock(
  style: string,
  text: string,
  extra: Partial<PtBlock> = {}
): PtBlock {
  const { children, markDefs } = parseInline(text);
  return {
    _type: "block",
    _key: key("b"),
    style,
    markDefs,
    children:
      children.length > 0
        ? children
        : [{ _type: "span", _key: key("s"), text: "", marks: [] }],
    ...extra,
  };
}

/* ------------------------------------------------------------------ */
/* Custom-block builders                                               */
/* ------------------------------------------------------------------ */

function faqBlock(items: { question: string; answer: string }[]): PtNode {
  return {
    _type: "faqBlock",
    _key: key("faq"),
    items: items.map((it) => ({
      _key: key("q"),
      question: it.question,
      answer: it.answer,
    })),
  };
}

function ctaBlock(fields: {
  heading: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: string;
}): PtNode {
  return {
    _type: "ctaBlock",
    _key: key("cta"),
    heading: fields.heading,
    ...(fields.text ? { text: fields.text } : {}),
    buttonLabel: fields.buttonLabel,
    buttonHref: fields.buttonHref,
    variant: fields.variant ?? "default",
  };
}

function videoBlock(url: string): PtNode {
  // poster is REQUIRED by the component (CLAUDE.md §4). It is unknown at import
  // time, so emit an empty placeholder string; the image/quality step fills it.
  return {
    _type: "videoBlock",
    _key: key("vid"),
    videoUrl: url,
    poster: "",
  };
}

function noticeBlock(label: string, text: string): PtNode {
  return { _type: "noticeBlock", _key: key("not"), label, text };
}

function quotePt(fields: { quote: string; author?: string; role?: string }): PtNode {
  return {
    _type: "quoteBlock",
    _key: key("quote"),
    quote: fields.quote,
    ...(fields.author ? { author: fields.author } : {}),
    ...(fields.role ? { role: fields.role } : {}),
  };
}

function bulletListPt(fields: {
  title?: string;
  columns?: number;
  items: string[];
}): PtNode {
  return {
    _type: "bulletList",
    _key: key("bl"),
    ...(fields.title ? { title: fields.title } : {}),
    items: fields.items,
    columns: fields.columns === 2 ? 2 : 1,
  };
}

function numberedListPt(fields: {
  title?: string;
  items: { number?: string; label: string; text?: string }[];
}): PtNode {
  return {
    _type: "numberedList",
    _key: key("nl"),
    ...(fields.title ? { title: fields.title } : {}),
    items: fields.items.map((it) => ({
      _key: key("nli"),
      ...(it.number ? { number: it.number } : {}),
      label: it.label,
      ...(it.text ? { text: it.text } : {}),
    })),
  };
}

function inlineImage(src: string, alt: string): PtNode {
  // Carry the original WP src so the asset-upload step can resolve & rewrite it.
  return {
    _type: "image",
    _key: key("img"),
    _sanityAsset: `image@${src}`,
    alt: alt ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Marker parsing helpers                                              */
/* ------------------------------------------------------------------ */

/** Parse a `:::faq ... :::` fence body into a question/answer pair. */
function parseFaqFence(lines: string[]): { question: string; answer: string } {
  let question = "";
  const answerLines: string[] = [];
  let mode: "q" | "a" | null = null;
  for (const raw of lines) {
    const line = raw;
    if (/^VRAAG:/.test(line)) {
      question = line.replace(/^VRAAG:/, "").trim();
      mode = "q";
    } else if (/^ANTWOORD:/.test(line)) {
      answerLines.push(line.replace(/^ANTWOORD:/, "").trim());
      mode = "a";
    } else if (mode === "a") {
      answerLines.push(line);
    } else if (mode === "q") {
      question = `${question} ${line}`.trim();
    }
  }
  return { question: question.trim(), answer: answerLines.join("\n").trim() };
}

/** Parse a `:::cta ... :::` fence body into CTA fields. */
function parseCtaFence(lines: string[]): {
  heading: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: string;
} {
  const get = (re: RegExp): string | undefined => {
    const hit = lines.find((l) => re.test(l));
    return hit ? hit.replace(re, "").trim() : undefined;
  };
  return {
    heading: get(/^(KOP|HEADING):/i) ?? "",
    text: get(/^(TEKST|TEXT):/i),
    buttonLabel: get(/^(KNOP|BUTTON|BUTTONLABEL):/i) ?? "",
    buttonHref: get(/^(URL|HREF|BUTTONHREF):/i) ?? "",
    variant: get(/^(VARIANT):/i),
  };
}

/** Parse a `:::quote ... :::` fence body into quote fields. */
function parseQuoteFence(lines: string[]): {
  quote: string;
  author?: string;
  role?: string;
} {
  const get = (re: RegExp): string | undefined => {
    const hit = lines.find((l) => re.test(l));
    return hit ? hit.replace(re, "").trim() : undefined;
  };
  return {
    quote: get(/^(QUOTE|CITAAT):/i) ?? "",
    author: get(/^(AUTEUR|AUTHOR):/i),
    role: get(/^(ROL|ROLE|FUNCTIE):/i),
  };
}

/** Parse a `:::let-op ... :::` fence body into notice fields. */
function parseNoticeFence(lines: string[]): { label: string; text: string } {
  const get = (re: RegExp): string | undefined => {
    const hit = lines.find((l) => re.test(l));
    return hit ? hit.replace(re, "").trim() : undefined;
  };
  return {
    label: get(/^(LABEL|KOP):/i) ?? "",
    text: get(/^(TEKST|TEXT):/i) ?? "",
  };
}

/**
 * Parse a `:::bullets ... :::` fence: optional TITEL: / KOLOMMEN: header lines,
 * then `- item` lines. Returns title, columns (1|2) and the string items.
 */
function parseBulletsFence(lines: string[]): {
  title?: string;
  columns?: number;
  items: string[];
} {
  let title: string | undefined;
  let columns: number | undefined;
  const items: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^TITEL:/i.test(line)) {
      title = line.replace(/^TITEL:/i, "").trim();
    } else if (/^(KOLOMMEN|COLUMNS):/i.test(line)) {
      columns = parseInt(line.replace(/^(KOLOMMEN|COLUMNS):/i, "").trim(), 10);
    } else if (/^[-*+]\s+/.test(line)) {
      items.push(line.replace(/^[-*+]\s+/, "").trim());
    }
  }
  return { title, columns, items };
}

/**
 * Parse a `:::nummers ... :::` fence: optional TITEL: header, then one `- ` line
 * per item with pipe-separated keys: `- LABEL: x | TEKST: y | NUMMER: z`.
 * Only LABEL is required; NUMMER turns the item into a stat, otherwise it is a step.
 */
function parseNumbersFence(lines: string[]): {
  title?: string;
  items: { number?: string; label: string; text?: string }[];
} {
  let title: string | undefined;
  const items: { number?: string; label: string; text?: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^TITEL:/i.test(line)) {
      title = line.replace(/^TITEL:/i, "").trim();
      continue;
    }
    if (!/^[-*+]\s+/.test(line)) continue;
    const body = line.replace(/^[-*+]\s+/, "");
    const parts = body.split("|").map((p) => p.trim());
    const field = (re: RegExp): string | undefined => {
      const hit = parts.find((p) => re.test(p));
      return hit ? hit.replace(re, "").trim() : undefined;
    };
    const label = field(/^(LABEL):/i);
    if (!label) continue;
    items.push({
      label,
      number: field(/^(NUMMER|NUMBER):/i),
      text: field(/^(TEKST|TEXT):/i),
    });
  }
  return { title, items };
}

/* ------------------------------------------------------------------ */
/* Main conversion                                                     */
/* ------------------------------------------------------------------ */

export function markdownToPortableText(markdown: string): ConvertResult {
  resetKeys();
  const blocks: PtNode[] = [];
  const log: string[] = [];

  const src = markdown.replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  let i = 0;
  // Buffer of consecutive FAQ fences so multiple :::faq become ONE faqBlock.
  let faqBuffer: { question: string; answer: string }[] = [];

  const flushFaq = () => {
    if (faqBuffer.length === 0) return;
    const valid = faqBuffer.filter((q) => q.question.length > 0);
    const dropped = faqBuffer.length - valid.length;
    if (dropped > 0) {
      log.push(
        `FAQ: ${dropped} item(s) zonder VRAAG overgeslagen (heuristiek-miss uit voorbewerking) — handmatig nalopen.`
      );
    }
    if (valid.length > 0) blocks.push(faqBlock(valid));
    faqBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line.
    if (trimmed === "") {
      i += 1;
      continue;
    }

    // ---- HTML-comment (<!-- ... -->) --------------------------------------
    // Enkel- of meerregelig. WP-export + CONVERT-META gebruiken standalone
    // comment-regels; die zijn redactie-/conversienotities en horen NIET in de
    // body. Zonder deze tak werden ze als gewone paragrafen gerenderd.
    if (trimmed.startsWith("<!--")) {
      // Eénregelig comment dat ook weer sluit op dezelfde regel.
      if (trimmed.includes("-->")) {
        i += 1;
        continue;
      }
      // Meerregelig: consumeer tot en met de regel met `-->`.
      i += 1;
      while (i < lines.length && !lines[i].includes("-->")) {
        i += 1;
      }
      i += 1; // consume the closing `-->` line
      continue;
    }

    // ---- :::faq fence -----------------------------------------------------
    if (trimmed === ":::faq") {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing :::
      faqBuffer.push(parseFaqFence(body));
      continue;
    }

    // ---- :::cta fence -----------------------------------------------------
    if (trimmed === ":::cta") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const fields = parseCtaFence(body);
      if (!fields.heading || !fields.buttonLabel || !fields.buttonHref) {
        log.push(
          `CTA: marker mist verplicht veld (heading/buttonLabel/buttonHref) — als tekst gelaten, handmatig nalopen.`
        );
        blocks.push(makeBlock("normal", body.join(" ")));
      } else {
        blocks.push(ctaBlock(fields));
      }
      continue;
    }

    // ---- :::quote fence ---------------------------------------------------
    if (trimmed === ":::quote") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const fields = parseQuoteFence(body);
      if (!fields.quote) {
        log.push(`QUOTE: marker mist QUOTE-veld — als tekst gelaten, handmatig nalopen.`);
        blocks.push(makeBlock("normal", body.join(" ")));
      } else {
        blocks.push(quotePt(fields));
      }
      continue;
    }

    // ---- :::let-op fence (noticeBlock) ------------------------------------
    if (trimmed === ":::let-op") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const fields = parseNoticeFence(body);
      if (!fields.label || !fields.text) {
        log.push(`LET-OP: marker mist LABEL of TEKST — als tekst gelaten, handmatig nalopen.`);
        blocks.push(makeBlock("normal", body.join(" ")));
      } else {
        blocks.push(noticeBlock(fields.label, fields.text));
      }
      continue;
    }

    // ---- :::bullets fence (bulletList) ------------------------------------
    if (trimmed === ":::bullets") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const fields = parseBulletsFence(body);
      if (fields.items.length === 0) {
        log.push(`BULLETS: marker zonder items — overgeslagen, handmatig nalopen.`);
      } else {
        blocks.push(bulletListPt(fields));
      }
      continue;
    }

    // ---- :::nummers fence (numberedList) ----------------------------------
    if (trimmed === ":::nummers") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const fields = parseNumbersFence(body);
      if (fields.items.length === 0) {
        log.push(`NUMMERS: marker zonder geldige items (LABEL verplicht) — overgeslagen, handmatig nalopen.`);
      } else {
        blocks.push(numberedListPt(fields));
      }
      continue;
    }

    // ---- :::accordion fence (NOT a FAQ) -----------------------------------
    if (trimmed === ":::accordion") {
      flushFaq();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== ":::") {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      log.push(
        `accordion-marker omgezet naar tekst (geen Q&A: inhoudslijst/glossarium) — handmatig nalopen.`
      );
      let title = "";
      const content: string[] = [];
      let mode: "t" | "c" | null = null;
      for (const b of body) {
        if (/^TITEL:/.test(b)) {
          title = b.replace(/^TITEL:/, "").trim();
          mode = "t";
        } else if (/^INHOUD:/.test(b)) {
          content.push(b.replace(/^INHOUD:/, "").trim());
          mode = "c";
        } else if (mode === "c") content.push(b);
      }
      if (title) blocks.push(makeBlock("h3", title));
      if (content.join("\n").trim())
        blocks.push(makeBlock("normal", content.join(" ").trim()));
      continue;
    }

    // ---- [EMBED youtube|vimeo]: <url> -------------------------------------
    const embed = /^\[EMBED (youtube|vimeo)\]:\s*<?([^>\s]+)>?/i.exec(trimmed);
    if (embed) {
      flushFaq();
      blocks.push(videoBlock(embed[2]));
      log.push(`EMBED ${embed[1]} -> videoBlock (poster ontbreekt, Fase 6).`);
      i += 1;
      continue;
    }

    // ---- > [!HERBRUIKBAAR-BLOK ref=NNNN] ----------------------------------
    const reusable = /^>\s*\[!HERBRUIKBAAR-BLOK ref=(\w+)\]\s*(.*)$/.exec(
      trimmed
    );
    if (reusable) {
      flushFaq();
      blocks.push(
        noticeBlock(
          "Herbruikbaar blok ontbreekt",
          `WP wp_block ref=${reusable[1]} zat niet in de export. Handmatig ophalen/opnieuw opbouwen.`
        )
      );
      log.push(
        `HERBRUIKBAAR-BLOK ref=${reusable[1]} ontbreekt in export — noticeBlock placeholder geplaatst, HANDMATIG ophalen.`
      );
      i += 1;
      continue;
    }

    flushFaq();

    // ---- Headings ---------------------------------------------------------
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      const style = level <= 2 ? "h2" : "h3";
      blocks.push(makeBlock(style, h[2].trim()));
      i += 1;
      continue;
    }

    // ---- Blockquote (multi-line, '>' prefixed) ----------------------------
    if (/^>/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>/.test(lines[i].trim())) {
        const t = lines[i].trim().replace(/^>\s?/, "");
        if (t !== "") quoteLines.push(t);
        i += 1;
      }
      // Join quote lines into one blockquote block (attribution lines included).
      blocks.push(makeBlock("blockquote", quoteLines.join(" ")));
      continue;
    }

    // ---- Standalone inline image ------------------------------------------
    const img = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/.exec(trimmed);
    if (img) {
      const alt = img[1] ?? "";
      blocks.push(inlineImage(img[2], alt));
      if (!alt.trim())
        log.push(`afbeelding zonder alt: ${img[2]} — markeren voor quality-agent.`);
      i += 1;
      continue;
    }

    // ---- Ordered list -----------------------------------------------------
    if (/^\d+\.\s+/.test(trimmed)) {
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const t = lines[i].trim().replace(/^\d+\.\s+/, "");
        blocks.push(
          makeBlock("normal", t, { listItem: "number", level: 1 })
        );
        i += 1;
      }
      continue;
    }

    // ---- Bullet list ------------------------------------------------------
    if (/^[-*+]\s+/.test(trimmed)) {
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const t = lines[i].trim().replace(/^[-*+]\s+/, "");
        blocks.push(
          makeBlock("normal", t, { listItem: "bullet", level: 1 })
        );
        i += 1;
      }
      continue;
    }

    // ---- Paragraph (gather until blank line or a new structural line) -----
    // De huidige regel is hier per definitie niet leeg en niet door een eerdere
    // tak geconsumeerd. Consumeer 'm ALTIJD (i schuift gegarandeerd op), anders
    // ontstaat een infinite loop bij regels die met een structurele prefix
    // beginnen maar niet matchten — bv. een inline-afbeelding mét tekst erachter
    // (`![alt](src) tekst...`) of een onbekende `:::`-fence.
    const para: string[] = [lines[i].trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6}\s|>|!\[|\d+\.\s|[-*+]\s|:::)/.test(lines[i].trim()) &&
      !/^\[EMBED /i.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(makeBlock("normal", para.join(" ")));
  }

  flushFaq();

  return { blocks, log };
}

/* ------------------------------------------------------------------ */
/* CLI: `npx tsx markdown-to-portable-text.ts <file.md>` prints JSON    */
/* ------------------------------------------------------------------ */

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("markdown-to-portable-text.ts");

if (isMain) {
  void (async () => {
    const fs = await import("fs");
    const matter = (await import("gray-matter")).default;
    const file = process.argv[2];
    if (!file) {
      console.error(
        "Usage: npx tsx markdown-to-portable-text.ts <path-to.md>\n" +
          "       npx tsx markdown-to-portable-text.ts --self-test"
      );
      process.exit(1);
    }

    if (file === "--self-test") {
      const faqSample = [
        ":::faq",
        "VRAAG: Wat is innovatie?",
        "ANTWOORD: Innovatie is vernieuwing op vele terreinen.",
        ":::",
        ":::faq",
        "VRAAG:",
        "ANTWOORD: Dit item mist een vraag (heuristiek-miss).",
        ":::",
        "## Tot slot",
        "Een normale paragraaf met een [link](https://example.com) en **vet**.",
      ].join("\n");

      const ctaSample = [
        "Een inleidende paragraaf.",
        "",
        ":::cta",
        "KOP: Tijd voor groei?",
        "TEKST: Plan een vrijblijvende kennismaking.",
        "KNOP: Maak een afspraak",
        "URL: /contact",
        ":::",
      ].join("\n");

      console.log("=== FAQ sample ===");
      const faq = markdownToPortableText(faqSample);
      console.log(JSON.stringify(faq.blocks, null, 2));
      console.log("LOG:", JSON.stringify(faq.log, null, 2));

      console.log("\n=== CTA sample ===");
      const cta = markdownToPortableText(ctaSample);
      console.log(JSON.stringify(cta.blocks, null, 2));
      console.log("LOG:", JSON.stringify(cta.log, null, 2));
      return;
    }

    const raw = fs.readFileSync(file, "utf-8");
    const { content } = matter(raw);
    const result = markdownToPortableText(content);
    console.log(JSON.stringify(result.blocks, null, 2));
    if (result.log.length) console.error("\nLOG:\n" + result.log.join("\n"));
  })();
}
