import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content) return null;

  const copyCodeToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Basic regex parser to handle paragraphs, bold, lists, and code blocks
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-100 font-sans">
      {blocks.map((block, bIdx) => {
        if (block.startsWith("```")) {
          // Code Block
          const lines = block.split("\n");
          const language = lines[0].replace("```", "").trim() || "plaintext";
          const codeText = lines.slice(1, -1).join("\n");

          return (
            <div
              key={bIdx}
              className="my-3 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 font-mono text-xs shadow-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2 text-slate-400">
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  {language}
                </span>
                <button
                  onClick={() => copyCodeToClipboard(codeText, bIdx)}
                  className="flex items-center gap-1.5 rounded bg-slate-900 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {copiedIndex === bIdx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 text-slate-300">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        } else {
          // Regular Text & Inline Formats
          const lines = block.split("\n");
          return (
            <div key={bIdx} className="space-y-2">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                // 1. Headers
                if (trimmed.startsWith("### ")) {
                  return (
                    <h4 key={lIdx} className="mt-4 text-base font-bold text-slate-50 tracking-tight">
                      {parseInline(trimmed.substring(4))}
                    </h4>
                  );
                }
                if (trimmed.startsWith("## ")) {
                  return (
                    <h3 key={lIdx} className="mt-5 text-lg font-bold text-slate-50 tracking-tight border-b border-slate-800 pb-1">
                      {parseInline(trimmed.substring(3))}
                    </h3>
                  );
                }
                if (trimmed.startsWith("# ")) {
                  return (
                    <h2 key={lIdx} className="mt-6 text-xl font-bold text-slate-50 tracking-tight">
                      {parseInline(trimmed.substring(2))}
                    </h2>
                  );
                }

                // 2. Unordered lists
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                  return (
                    <ul key={lIdx} className="list-disc pl-5 my-1 text-slate-200">
                      <li>{parseInline(trimmed.substring(2))}</li>
                    </ul>
                  );
                }

                // 3. Ordered lists
                const orderedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
                if (orderedMatch) {
                  return (
                    <ol key={lIdx} className="list-decimal pl-5 my-1 text-slate-200">
                      <li value={parseInt(orderedMatch[1])}>
                        {parseInline(orderedMatch[2])}
                      </li>
                    </ol>
                  );
                }

                // 4. Default Paragraph
                return (
                  <p key={lIdx} className="text-slate-200">
                    {parseInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }
      })}
    </div>
  );
}

// Sub-parser for inline elements: Bold, Italics, Code, and Citation tags
function parseInline(text: string): React.ReactNode[] {
  // Regex splitting inline blocks
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\|.*?\]|\[.*?\])/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-slate-50">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-300">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-xs text-amber-400 border border-slate-700/50"
        >
          {part.substring(1, part.length - 1)}
        </code>
      );
    }
    // Citation highlighting: e.g. [Document.pdf | Page 2 | Chunk 4] or [Document.pdf, page 2]
    if (part.startsWith("[") && part.endsWith("]")) {
      return (
        <span
          key={idx}
          className="inline-flex items-center rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20 shadow-sm mx-0.5"
        >
          {part.substring(1, part.length - 1)}
        </span>
      );
    }
    return part;
  });
}
