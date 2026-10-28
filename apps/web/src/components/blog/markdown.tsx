import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Heading anchor that keeps Arabic letters (the TOC links to these). */
export function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

/** `## ` headings of a markdown body, for the table of contents. */
export function outline(markdown: string): { id: string; text: string }[] {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1]!.replace(/[*_`]/g, "").trim();
    return { id: headingId(text), text };
  });
}

const components: Components = {
  h2: ({ children }) => (
    <h2 id={headingId(textOf(children))} className="mt-12 scroll-mt-28 font-display text-heading first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 font-display text-title">{children}</h3>,
  p: ({ children }) => <p className="mt-5 text-body-lg leading-[1.9] text-foreground/85">{children}</p>,
  ul: ({ children }) => <ul className="mt-5 flex list-none flex-col gap-2.5 ps-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-5 flex list-decimal flex-col gap-2.5 ps-6 marker:font-display marker:text-accent-text">{children}</ol>,
  li: ({ children, ...props }) => {
    const ordered = (props as { node?: { parent?: { tagName?: string } } }).node?.parent?.tagName === "ol";
    return ordered ? (
      <li className="ps-1 text-body-lg leading-[1.8] text-foreground/85">{children}</li>
    ) : (
      <li className="relative ps-6 text-body-lg leading-[1.8] text-foreground/85 before:absolute before:start-0 before:top-[0.8em] before:size-2 before:rounded-full before:bg-primary">{children}</li>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href = "", children }) => {
    const external = /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-medium text-secondary-text underline decoration-secondary-text/40 underline-offset-4 transition-colors hover:decoration-secondary-text">
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="relative mt-8 overflow-hidden rounded-3xl border border-gold-400/40 bg-gold-50/70 px-6 py-5 dark:bg-gold-400/[0.07] [&_p]:mt-0 [&_p]:text-body">
      <span aria-hidden className="absolute inset-y-0 start-0 w-1.5 bg-primary" />
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div data-lenis-prevent className="mt-8 overflow-x-auto rounded-3xl border border-border">
      <table className="w-full min-w-[32rem] text-body-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-sunken text-caption text-muted-foreground">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-3 text-start font-medium">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-4 py-3 align-top">{children}</td>,
  code: ({ children }) => <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>,
  hr: () => <hr className="my-10 border-border" />,
};

/**
 * Article body. Markdown only: raw HTML is never rendered and images are dropped (covers come from the
 * post's own field), so an editor account can't inject scripts or tracking pixels into the site.
 */
export function Markdown({ source, className, ...props }: { source: string; className?: string } & Omit<ComponentProps<"div">, "children">) {
  return (
    <div className={cn("[&>*:first-child]:mt-0", className)} {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml disallowedElements={["img"]} unwrapDisallowed>
        {source}
      </ReactMarkdown>
    </div>
  );
}
