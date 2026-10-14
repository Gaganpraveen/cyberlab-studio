import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import http from 'highlight.js/lib/languages/http';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import {
  Children,
  type ComponentPropsWithoutRef,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components, defaultUrlTransform } from 'react-markdown';
import { Link } from 'react-router';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

import { Callout, type Tone } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { slugify } from '@/lib/slug';

import { TermLink } from './TermLink';

const languages = {
  bash,
  shell: bash,
  css,
  http,
  javascript,
  js: javascript,
  json,
  plaintext,
  text: plaintext,
  python,
  sql,
  typescript,
  ts: typescript,
  html: xml,
  xml,
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
    return (
      <a href={href} {...props}>
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
        rehypePlugins={[
          [rehypeHighlight, { languages, detect: false, plainText: ['text', 'plaintext'] }],
        ]}
        components={components}
        urlTransform={urlTransform}
      >
        {expandWikiLinks(children)}
      </ReactMarkdown>
    </div>
  );
});
