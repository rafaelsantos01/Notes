/** Remove sintaxe Markdown para gerar resumos em texto puro. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ") // code blocks
    .replace(/`([^`]*?)`/g, "$1") // inline code
    .replace(/!?\[([^\]]*?)\]\([^)]*?\)/g, "$1") // links/images
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "") // task items
    .replace(/^\s*[-*+]\s+/gm, "") // bullets
    .replace(/^\s*\d+\.\s+/gm, "") // ordered
    .replace(/(\*\*|__|\*|~~)/g, "") // emphasis
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, "") // hr
    .replace(/\|/g, " ") // table pipes
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(markdown: string, length = 180): string {
  const text = stripMarkdown(markdown);
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

/** Nome de arquivo seguro a partir de um título. */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "sem-titulo";
}
