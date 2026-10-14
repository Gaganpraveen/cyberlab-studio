import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import http from 'highlight.js/lib/languages/http';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { Check, Copy } from 'lucide-react';
import {
  Children,
  type ComponentPropsWithoutRef,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';
import ReactMarkdown, { type Components, defaultUrlTransform } from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';

import { SequenceDiagram } from '@/components/diagrams/SequenceDiagram';
import { Callout, type Tone } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/slug';

import { rehypeCodeHighlight } from './rehypeCodeHighlight';
import { TermLink } from './TermLink';

const languages = {
  bash,
  shell: bash,
  sh: bash,
  c,
  cpp,
  css,
  diff,
  dockerfile,
  go,
  http,
  ini,
  toml: ini,
  java,
  javascript,
  js: javascript,
  json,
  plaintext,
  text: plaintext,
  powershell,
  python,
  rust,
  sql,
  typescript,
  ts: typescript,
  html: xml,
  xml,
  yaml,
  yml: yaml,
};

const highlightCode = rehypeCodeHighlight({
  languages,
  plainText: ['text', 'plaintext', 'sequence'],
});

/** How each code language is named in the code block's label. */
const languageLabels: Record<string, string> = {
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  c: 'C',
  cpp: 'C++',
  css: 'CSS',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
  go: 'Go',
  http: 'HTTP',
  ini: 'INI',
  toml: 'TOML',
  java: 'Java',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  powershell: 'PowerShell',
  python: 'Python',
  rust: 'Rust',
  sql: 'SQL',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  html: 'HTML',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
};

/**
 * Glossary shorthand: [[term-id]] or [[term-id|display text]] becomes a
 * `term:` link that renders as an inline definition popover.
 */
export function expandWikiLinks(markdown: string): string {
  return markdown.replace(
    /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g,
    (_m, id: string, text?: string) => {
      const label = text ?? id.replace(/-/g, ' ');
      return `[${label}](term:${id})`;
    },
  );
}

/** Allow our internal schemes (term:, lesson:, lab:, glossary:) alongside safe web URLs. */
function urlTransform(url: string): string {
  if (/^(term|lesson|lab|glossary|challenge):[A-Za-z0-9-]+$/.test(url)) return url;
  return defaultUrlTransform(url);
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return '';
}

const ALERTS: Record<string, { tone: Tone; title: string }> = {
  NOTE: { tone: 'info', title: 'Note' },
  TIP: { tone: 'success', title: 'Tip' },
  IMPORTANT: { tone: 'accent', title: 'Important' },
  WARNING: { tone: 'warning', title: 'Warning' },
  CAUTION: { tone: 'danger', title: 'Caution' },
  ETHICS: { tone: 'warning', title: 'Ethics and authorization' },
};

/** GitHub-style alerts: a blockquote whose first line is [!NOTE], [!TIP], ... */
function Blockquote({ children }: ComponentPropsWithoutRef<'blockquote'>) {
  const items = Children.toArray(children).filter(
    (child) => !(typeof child === 'string' && child.trim() === ''),
  );
  const first = items[0];
  if (isValidElement(first)) {
    const paragraph = first as ReactElement<{ children?: ReactNode }>;
    const firstChildren = Children.toArray(paragraph.props.children);
    const lead = firstChildren[0];
    if (typeof lead === 'string') {
      const match = /^\s*\[!([A-Z]+)\]\s*/.exec(lead);
      const alert = match ? ALERTS[match[1] ?? ''] : undefined;
      if (match && alert) {
        const rest = [lead.slice(match[0].length), ...firstChildren.slice(1)];
        const hasLeadText = textOf(rest).trim().length > 0;
        return (
          <Callout tone={alert.tone} title={alert.title} className="not-prose my-6">
            {hasLeadText && <p>{rest}</p>}
            {items.slice(1)}
          </Callout>
        );
      }
    }
  }
  return <blockquote>{children}</blockquote>;
}

function Anchor({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const [scheme, id] = href.includes(':') ? href.split(/:(.*)/s, 2) : ['', ''];
  if (scheme === 'term' && id) return <TermLink termId={id}>{children}</TermLink>;
  if (scheme === 'lesson' && id) return <Link to={`/learn/${id.toLowerCase()}`}>{children}</Link>;
  if (scheme === 'lab' && id) return <Link to={`/labs/${id}`}>{children}</Link>;
  if (scheme === 'glossary' && id) return <Link to={`/glossary/${id}`}>{children}</Link>;
  if (scheme === 'challenge' && id) return <Link to={`/challenges#${id}`}>{children}</Link>;
  if (href.startsWith('#')) {
    // The URL hash belongs to the router, so scroll instead of navigating.
    return (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(href.slice(1))?.scrollIntoView({ block: 'start' });
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function headingWithId(Tag: 'h2' | 'h3') {
  return function Heading({ children }: ComponentPropsWithoutRef<'h2'>) {
    const id = slugify(textOf(children));
    return <Tag id={id}>{children}</Tag>;
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="text-fg-subtle hover:text-fg hover:bg-surface-3 inline-flex size-7 items-center justify-center rounded-md transition-colors"
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? (
        <Check className="text-success size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

/** Fenced code: a language label and a copy button; `sequence` blocks become diagrams. */
function Pre({ children }: ComponentPropsWithoutRef<'pre'>) {
  const code = Children.toArray(children)[0];
  const className = isValidElement(code)
    ? ((code.props as { className?: string }).className ?? '')
    : '';
  const language = /language-([\w-]+)/.exec(className)?.[1];
  const text = textOf(children).replace(/\n$/, '');

  if (language === 'sequence') return <SequenceDiagram source={text} />;

  const label = language ? languageLabels[language] : undefined;
  return (
    <div className="group relative">
      <pre>{children}</pre>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        {label && (
          <span className="text-fg-subtle font-sans text-[0.6875rem] font-medium tracking-wide uppercase">
            {label}
          </span>
        )}
        <CopyButton text={text} />
      </div>
    </div>
  );
}

function Table({ children }: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="border-line overflow-x-auto rounded-xl border">
      <table>{children}</table>
    </div>
  );
}

const components: Components = {
  a: Anchor,
  blockquote: Blockquote,
  pre: Pre,
  h2: headingWithId('h2'),
  h3: headingWithId('h3'),
  table: Table,
};

export interface MarkdownProps {
  children: string;
  className?: string;
  /** Use compact typography (cards, challenge prompts) instead of lesson typography. */
  compact?: boolean;
}

export const Markdown = memo(function Markdown({ children, className, compact }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose-lesson',
        compact && 'max-w-none text-[0.9375rem] leading-relaxed [&>*+*]:mt-3',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[highlightCode]}
        components={components}
        urlTransform={urlTransform}
      >
        {expandWikiLinks(children)}
      </ReactMarkdown>
    </div>
  );
});
