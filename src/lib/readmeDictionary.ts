import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
};

export type DictionarySection = {
  id: string;
  title: string;
  number: number;
  label: string;
  entries: string[];
};

export type Entry = {
  term: string;
  slug: string;
  sectionId: string;
  previewText: string;
  bodyHtml: string;
  wordCount: number;
  hasUsage: boolean;
  hasAvoid: boolean;
  hasTable: boolean;
  outboundLinks: string[];
  inboundLinks: string[];
};

export type LinkGraph = {
  edges: Array<{ source: string; target: string }>;
  hubs: Array<{ slug: string; term: string; inboundCount: number }>;
};

export type DictionaryStats = {
  sectionCount: number;
  entryCount: number;
  medianWords: number;
  tableCount: number;
  usageCount: number;
  avoidCount: number;
  linkCount: number;
  hubTerms: string[];
};

export type DictionaryDocument = {
  title: string;
  introHtml: string;
  sections: DictionarySection[];
  entries: Entry[];
  linkGraph: LinkGraph;
  stats: DictionaryStats;
};

const htmlProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema.tagNames ?? []),
      "picture",
      "source",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    attributes: {
      ...defaultSchema.attributes,
      a: [...(defaultSchema.attributes?.a ?? []), ["href"], ["title"]],
      img: [
        ...(defaultSchema.attributes?.img ?? []),
        ["src"],
        ["alt"],
        ["width"],
        ["height"],
      ],
      source: [["srcset"], ["srcSet"], ["media"], ["type"]],
      th: [...(defaultSchema.attributes?.th ?? []), ["align"]],
      td: [...(defaultSchema.attributes?.td ?? []), ["align"]],
    },
    protocols: {
      ...defaultSchema.protocols,
      srcset: ["http", "https"],
      srcSet: ["http", "https"],
    },
  })
  .use(rehypeStringify);

const astProcessor = unified().use(remarkParse).use(remarkGfm);

function githubSlug(text: string): string {
  const slugger = new GithubSlugger();
  return slugger.slug(text);
}

function renderMarkdown(markdown: string): string {
  return htmlProcessor.processSync(markdown.trim()).toString();
}

function parseMarkdown(markdown: string): MarkdownNode {
  return astProcessor.parse(markdown) as MarkdownNode;
}

function stripGeneratedComment(markdown: string): string {
  return markdown.replace(/^<!--[\s\S]*?-->\s*/, "");
}

function readHeadingText(line: string, marker: string): string {
  return line.slice(marker.length).trim();
}

function wordsIn(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length;
}

function firstParagraphText(markdown: string): string {
  const ast = parseMarkdown(markdown);
  const paragraph = ast.children?.find((child) => child.type === "paragraph");
  const text = paragraph ? toString(paragraph) : toString(ast);
  return text.replace(/\s+/g, " ").trim();
}

function previewFrom(markdown: string): string {
  const text = firstParagraphText(markdown);
  if (text.length <= 170) return text;

  const sentenceEnd = text.slice(0, 170).search(/[.!?](?=\s|$)(?!.*[.!?])/);
  if (sentenceEnd > 80) return text.slice(0, sentenceEnd + 1);

  return `${text.slice(0, 167).trimEnd()}...`;
}

function linksFrom(
  markdown: string,
  slugToTerm: Map<string, string>,
  self: string
): string[] {
  const ast = parseMarkdown(markdown);
  const links = new Set<string>();

  visit(ast, "link", (node: MarkdownNode) => {
    if (!node.url?.startsWith("#")) return;
    const slug = decodeURIComponent(node.url.slice(1));
    const target = slugToTerm.get(slug);
    if (target && target !== self) links.add(target);
  });

  return [...links];
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}

function normalizeSection(heading: string): { number: number; label: string } {
  const match = heading.match(/^Section\s+(\d+)\s+[—-]\s+(.+)$/);
  if (!match) {
    throw new Error(`Unexpected section heading: ${heading}`);
  }

  return {
    number: Number(match[1]),
    label: match[2],
  };
}

export function parseReadmeDictionary(markdown: string): DictionaryDocument {
  const source = stripGeneratedComment(markdown);
  const lines = source.split("\n");
  const tocIndex = lines.findIndex(
    (line) => line.trim() === "## Table of contents"
  );
  const firstSectionIndex = lines.findIndex((line) =>
    line.startsWith("## Section ")
  );

  if (tocIndex === -1) {
    throw new Error("README is missing the Table of contents heading");
  }

  if (firstSectionIndex === -1) {
    throw new Error("README is missing dictionary section headings");
  }

  const titleLineIndex = lines.findIndex((line) => line.startsWith("# "));
  if (titleLineIndex === -1 || titleLineIndex > tocIndex) {
    throw new Error(
      "README is missing a top-level title before the table of contents"
    );
  }

  const title = readHeadingText(lines[titleLineIndex] ?? "", "# ");
  const introMarkdown = [
    ...lines.slice(0, titleLineIndex),
    ...lines.slice(titleLineIndex + 1, tocIndex),
  ]
    .join("\n")
    .trim();

  const sections: DictionarySection[] = [];
  const rawEntries: Array<{
    term: string;
    sectionId: string;
    markdown: string;
  }> = [];

  let currentSection: DictionarySection | null = null;
  let currentEntry: {
    term: string;
    sectionId: string;
    lines: string[];
  } | null = null;
  const sectionSlugger = new GithubSlugger();
  const entrySlugger = new GithubSlugger();

  function finishEntry(): void {
    if (!currentEntry) return;
    rawEntries.push({
      term: currentEntry.term,
      sectionId: currentEntry.sectionId,
      markdown: currentEntry.lines.join("\n").trim(),
    });
    currentEntry = null;
  }

  for (let index = firstSectionIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (line.startsWith("## Section ")) {
      finishEntry();
      const title = readHeadingText(line, "## ");
      const { number, label } = normalizeSection(title);
      currentSection = {
        id: sectionSlugger.slug(title),
        title,
        number,
        label,
        entries: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith("### ")) {
      if (!currentSection) {
        throw new Error(`Entry heading found before a section: ${line}`);
      }
      finishEntry();
      const term = readHeadingText(line, "### ");
      entrySlugger.slug(term);
      currentSection.entries.push(term);
      currentEntry = { term, sectionId: currentSection.id, lines: [] };
      continue;
    }

    if (currentEntry) currentEntry.lines.push(line);
  }

  finishEntry();

  const slugToTerm = new Map<string, string>();
  const termToSlug = new Map<string, string>();
  const outboundByTerm = new Map<string, string[]>();
  const inboundByTerm = new Map<string, Set<string>>();
  const entrySluggerForMap = new GithubSlugger();

  for (const rawEntry of rawEntries) {
    const slug = entrySluggerForMap.slug(rawEntry.term);
    slugToTerm.set(slug, rawEntry.term);
    termToSlug.set(rawEntry.term, slug);
    inboundByTerm.set(rawEntry.term, new Set());
  }

  for (const rawEntry of rawEntries) {
    const outbound = linksFrom(rawEntry.markdown, slugToTerm, rawEntry.term);
    outboundByTerm.set(rawEntry.term, outbound);
    for (const target of outbound) {
      inboundByTerm.get(target)?.add(rawEntry.term);
    }
  }

  const entries: Entry[] = rawEntries.map((rawEntry) => {
    const outboundTerms = outboundByTerm.get(rawEntry.term) ?? [];
    const inboundTerms = [
      ...(inboundByTerm.get(rawEntry.term) ?? new Set<string>()),
    ];

    return {
      term: rawEntry.term,
      slug: termToSlug.get(rawEntry.term) ?? githubSlug(rawEntry.term),
      sectionId: rawEntry.sectionId,
      previewText: previewFrom(rawEntry.markdown),
      bodyHtml: renderMarkdown(rawEntry.markdown),
      wordCount: wordsIn(rawEntry.markdown),
      hasUsage: /(^|\n)_Usage:_/.test(rawEntry.markdown),
      hasAvoid: /(^|\n)_Avoid:_/.test(rawEntry.markdown),
      hasTable: /^\|.+\|$/m.test(rawEntry.markdown),
      outboundLinks: outboundTerms.map(
        (term) => termToSlug.get(term) ?? githubSlug(term)
      ),
      inboundLinks: inboundTerms.map(
        (term) => termToSlug.get(term) ?? githubSlug(term)
      ),
    };
  });

  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const edges = entries.flatMap((entry) =>
    entry.outboundLinks
      .filter((target) => entryBySlug.has(target))
      .map((target) => ({ source: entry.slug, target }))
  );
  const hubs = [...entries]
    .sort((a, b) => b.inboundLinks.length - a.inboundLinks.length)
    .slice(0, 7)
    .map((entry) => ({
      slug: entry.slug,
      term: entry.term,
      inboundCount: entry.inboundLinks.length,
    }));

  return {
    title,
    introHtml: renderMarkdown(introMarkdown),
    sections,
    entries,
    linkGraph: { edges, hubs },
    stats: {
      sectionCount: sections.length,
      entryCount: entries.length,
      medianWords: median(entries.map((entry) => entry.wordCount)),
      tableCount: entries.filter((entry) => entry.hasTable).length,
      usageCount: entries.filter((entry) => entry.hasUsage).length,
      avoidCount: entries.filter((entry) => entry.hasAvoid).length,
      linkCount: edges.length,
      hubTerms: hubs.map((hub) => hub.term),
    },
  };
}
