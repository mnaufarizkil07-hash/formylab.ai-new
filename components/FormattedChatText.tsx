import React from "react";

function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Tokenize inline **bold**, *italic*, and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function FormattedChatText({ content }: { content: string }) {
  if (!content) return null;

  // Split by fenced code blocks first
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 leading-relaxed">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const codeBody = segment
            .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
            .replace(/```$/, "")
            .trim();
          return (
            <pre
              key={`code-${segIdx}`}
              className="p-3 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto my-2"
            >
              <code>{codeBody}</code>
            </pre>
          );
        }

        const lines = segment.split("\n");
        return (
          <div key={`seg-${segIdx}`} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={`br-${lineIdx}`} className="h-1" />;
              }

              // Horizontal rule --- or ***
              if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                return (
                  <hr
                    key={`hr-${lineIdx}`}
                    className="my-2 border-gray-200/70"
                  />
                );
              }

              // Headings ### / ## / #
              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={`h3-${lineIdx}`}
                    className="font-extrabold text-[#234e42] text-sm pt-1.5"
                  >
                    {renderInlineMarkdown(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
                const headingText = trimmed.replace(/^#+\s+/, "");
                return (
                  <h3
                    key={`h2-${lineIdx}`}
                    className="font-extrabold text-[#234e42] text-sm sm:text-[15px] pt-2"
                  >
                    {renderInlineMarkdown(headingText)}
                  </h3>
                );
              }

              // Bullet list item
              if (/^[-*•]\s+/.test(trimmed)) {
                const indent = line.search(/\S/);
                const itemText = trimmed.replace(/^[-*•]\s+/, "");
                return (
                  <div
                    key={`ul-${lineIdx}`}
                    className={`flex items-start gap-2 ${
                      indent >= 2 ? "pl-4" : ""
                    }`}
                  >
                    <span className="text-[#234e42] font-bold mt-0.5 select-none">
                      •
                    </span>
                    <span className="flex-1">
                      {renderInlineMarkdown(itemText)}
                    </span>
                  </div>
                );
              }

              // Numbered list item
              const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
              if (numMatch) {
                return (
                  <div
                    key={`ol-${lineIdx}`}
                    className="flex items-start gap-2"
                  >
                    <span className="font-bold text-[#234e42] shrink-0 select-none">
                      {numMatch[1]}
                    </span>
                    <span className="flex-1">
                      {renderInlineMarkdown(numMatch[2])}
                    </span>
                  </div>
                );
              }

              return (
                <p key={`p-${lineIdx}`}>{renderInlineMarkdown(trimmed)}</p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
