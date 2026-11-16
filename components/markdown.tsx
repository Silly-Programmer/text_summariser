import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders AI notes. Raw HTML in the text is NOT rendered (react-markdown escapes it). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="notes">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ table: (p) => <div className="overflow-x-auto"><table {...p} /></div> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
