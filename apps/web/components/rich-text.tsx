/**
 * Lightweight markdown-ish renderer with two consumers:
 *  - <TextLessonContent> in the student player (full multi-block).
 *  - Free-text fields inside interactive video stops (single block).
 *
 * Supports:
 *   **bold**         → <strong>
 *   *italic*         → <em>
 *   <u>underline</u> → <u>
 *   ![alt](url)      → <img> (block-only via splitBlocks)
 *   [label](url)     → <a target="_blank">
 *   bare https://... → <a target="_blank">
 *   # H1 / ## H2 / ### H3 (block start) → larger headings
 *
 * No external dependency. The grammar intentionally stays simple — if we
 * ever need full CommonMark we can swap in react-markdown.
 */

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/g;
const MD_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const MD_IMG_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
const BOLD_RE = /\*\*([^*\n]+)\*\*/g;
const ITALIC_RE = /(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g;
const U_RE = /<u>([\s\S]*?)<\/u>/g;

interface Token {
  kind: "text" | "img" | "link" | "bold" | "italic" | "u";
  body: string;
  url?: string;
}

/** Splits a single line of text into formatted tokens. Order matters:
 * images first (they swallow !), then markdown links, then bare URLs,
 * then bold/italic/underline. */
function tokenize(text: string): Token[] {
  type Match = { idx: number; len: number; tok: Token };
  const matches: Match[] = [];

  for (const m of text.matchAll(MD_IMG_RE)) {
    matches.push({
      idx: m.index ?? 0,
      len: m[0].length,
      tok: { kind: "img", body: m[1] ?? "", url: m[2] ?? "" },
    });
  }
  for (const m of text.matchAll(MD_LINK_RE)) {
    const idx = m.index ?? 0;
    if (matches.some((x) => idx >= x.idx && idx < x.idx + x.len)) continue;
    matches.push({
      idx,
      len: m[0].length,
      tok: { kind: "link", body: m[1] ?? "", url: m[2] ?? "" },
    });
  }
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (matches.some((x) => idx >= x.idx && idx < x.idx + x.len)) continue;
    matches.push({
      idx,
      len: m[0].length,
      tok: { kind: "link", body: m[0], url: m[0] },
    });
  }
  for (const m of text.matchAll(BOLD_RE)) {
    const idx = m.index ?? 0;
    if (matches.some((x) => idx >= x.idx && idx < x.idx + x.len)) continue;
    matches.push({
      idx,
      len: m[0].length,
      tok: { kind: "bold", body: m[1] ?? "" },
    });
  }
  for (const m of text.matchAll(ITALIC_RE)) {
    const idx = m.index ?? 0;
    if (matches.some((x) => idx >= x.idx && idx < x.idx + x.len)) continue;
    matches.push({
      idx,
      len: m[0].length,
      tok: { kind: "italic", body: m[1] ?? "" },
    });
  }
  for (const m of text.matchAll(U_RE)) {
    const idx = m.index ?? 0;
    if (matches.some((x) => idx >= x.idx && idx < x.idx + x.len)) continue;
    matches.push({
      idx,
      len: m[0].length,
      tok: { kind: "u", body: m[1] ?? "" },
    });
  }

  matches.sort((a, b) => a.idx - b.idx);

  const out: Token[] = [];
  let cur = 0;
  for (const m of matches) {
    if (m.idx > cur) {
      out.push({ kind: "text", body: text.slice(cur, m.idx) });
    }
    out.push(m.tok);
    cur = m.idx + m.len;
  }
  if (cur < text.length) out.push({ kind: "text", body: text.slice(cur) });
  return out;
}

function renderTokens(text: string, keyPrefix: string): React.ReactNode[] {
  return tokenize(text).map((t, i) => {
    const k = `${keyPrefix}-${i}`;
    switch (t.kind) {
      case "text":
        return t.body;
      case "img":
        return (
          <img
            key={k}
            src={t.url}
            alt={t.body}
            className="my-2 max-w-full rounded-lg"
          />
        );
      case "link":
        return (
          <a
            key={k}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-700 underline underline-offset-2 hover:text-primary-800"
          >
            {t.body}
          </a>
        );
      case "bold":
        return (
          <strong key={k} className="font-semibold text-text-primary">
            {t.body}
          </strong>
        );
      case "italic":
        return (
          <em key={k} className="italic">
            {t.body}
          </em>
        );
      case "u":
        return (
          <u key={k} className="underline underline-offset-2">
            {t.body}
          </u>
        );
    }
  });
}

/** Renders a single string with inline formatting: bold, italic,
 * underline, links. Use inside an existing block (e.g. an overlay
 * <p>). Preserves whitespace via wrapping in a span with whitespace
 * preserved by the parent if needed. */
export function InlineRichText({ text }: { text: string }) {
  if (!text) return null;
  return <>{renderTokens(text, "il")}</>;
}

/** Multi-block renderer. Splits on blank lines; recognises ![](url) as
 * a standalone image block, # / ## / ### as headings, and otherwise
 * renders <p> with inline formatting. */
export function RichText({ text }: { text: string }) {
  if (!text?.trim()) {
    return (
      <p className="text-text-tertiary italic">
        Sin contenido.
      </p>
    );
  }
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-text-secondary">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        // Standalone image block.
        const imgOnly = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)$/);
        if (imgOnly) {
          return (
            <img
              key={i}
              src={imgOnly[2]}
              alt={imgOnly[1] ?? ""}
              className="mx-auto max-w-full rounded-lg"
            />
          );
        }
        // Headings: #, ##, ###  → larger text. Anything else stays as a
        // paragraph with inline formatting + preserved newlines.
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1]?.length ?? 1;
          const body = headingMatch[2] ?? "";
          const cls =
            level === 1
              ? "text-2xl font-heading font-bold text-text-primary"
              : level === 2
                ? "text-xl font-heading font-bold text-text-primary"
                : "text-lg font-heading font-semibold text-text-primary";
          return (
            <p key={i} className={cls}>
              {renderTokens(body, `h${i}`)}
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {renderTokens(block, `b${i}`)}
          </p>
        );
      })}
    </div>
  );
}
