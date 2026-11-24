import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renderiza Markdown de forma segura: react-markdown não injeta HTML bruto
 * (sem rehype-raw) e sanitiza URLs perigosas por padrão.
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
