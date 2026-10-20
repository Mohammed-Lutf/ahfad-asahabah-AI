import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isLightMode?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isLightMode = false,
}) => {
  return (
    <div className="markdown-body text-[15px] leading-[1.75] space-y-3 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-5 mb-2 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-4 mb-2 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="leading-[1.75] mb-2.5 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2.5 ps-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2.5 ps-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className={`ps-4 py-1 my-3 italic rounded-sm border-s-2 ${
                isLightMode
                  ? "border-slate-300 bg-slate-100/70 text-slate-700"
                  : "border-slate-700 bg-slate-800/40 text-slate-300"
              }`}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-slate-700/60">
              <table className="w-full text-sm text-right border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead
              className={
                isLightMode
                  ? "bg-slate-100 text-slate-800 border-b border-slate-200"
                  : "bg-slate-800/80 text-slate-200 border-b border-slate-700"
              }
            >
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td
              className={`px-3.5 py-2 border-t ${
                isLightMode ? "border-slate-200" : "border-slate-800"
              } tabular-nums`}
            >
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4 transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isBlock = Boolean(match || codeString.includes("\n"));

            if (!isBlock) {
              return (
                <code
                  dir="ltr"
                  className={`px-1.5 py-0.5 text-[13px] rounded font-mono ${
                    isLightMode
                      ? "bg-slate-200/80 text-slate-800"
                      : "bg-slate-800 text-emerald-300"
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : "code"}
                value={codeString}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      dir="ltr"
      className="my-3.5 rounded-xl overflow-hidden border border-slate-800 bg-[#090D14] text-slate-100 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#111723] border-b border-slate-800/80 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="lowercase">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
          title="نسخ الكود"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-sans text-emerald-400">
                تم النسخ
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px] font-sans">نسخ الكود</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto font-mono text-slate-200">
        <code>{value}</code>
      </pre>
    </div>
  );
};
