import { Children, isValidElement, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { EndpointDirectory } from './EndpointDirectory';
import { publicDocumentationHref, type Endpoint, type PreparedDocument } from './documentation-model';

type MarkdownNode = { type: string; position?: { start: { line: number } }; data?: { hProperties?: Record<string, unknown> }; children?: MarkdownNode[] };

export function ApiMarkdown({ document, guide, endpoints }: { document: PreparedDocument; guide: string; endpoints: Endpoint[] }) {
  const byLine = new Map(document.headings.map(heading => [heading.line, heading.id]));
  function headingsPlugin() {
    return (tree: unknown) => {
      function visit(node: MarkdownNode) {
        if (node.type === 'heading' && node.position) {
          const id = byLine.get(node.position.start.line);
          if (id) node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
        }
        node.children?.forEach(visit);
      }
      visit(tree as MarkdownNode);
    };
  }
  return <div className="docs-markdown"><Markdown skipHtml remarkPlugins={[remarkGfm, headingsPlugin]} components={{
    h2: ({ id, children }) => <><h2 id={id}><a className="docs-heading-link" href={`#${id}`} aria-label={`Link para ${document.headings.find(heading => heading.id === id)?.title ?? 'esta seção'}`}>#</a>{children}</h2>{id === 'endpoints' && <EndpointDirectory endpoints={endpoints} />}</>,
    h3: ({ id, children }) => <h3 id={id}>{children}</h3>,
    h4: ({ id, children }) => <h4 id={id}>{children}</h4>,
    a: ({ href, children }) => {
      const target = publicDocumentationHref(href, guide);
      return target ? <a href={target} {...(target.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a> : <span className="docs-source-label">{children}</span>;
    },
    table: ({ children }) => <div className="docs-table-scroll" tabIndex={0} role="region" aria-label="Tabela da documentação"><table>{children}</table></div>,
    pre: ({ children }) => {
      const code = Children.toArray(children)[0];
      if (!isValidElement<{ children: ReactNode; className?: string }>(code)) return <pre>{children}</pre>;
      const value = String(code.props.children ?? '').replace(/\n$/, '');
      return <CodeBlock value={value} language={code.props.className?.replace('language-', '') ?? ''} />;
    },
  }}>{document.markdown}</Markdown></div>;
}
