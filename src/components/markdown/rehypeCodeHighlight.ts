import type { Element, ElementContent, Root, RootContent } from 'hast';
import { createLowlight, type LanguageFn } from 'lowlight';

interface Options {
  /** Grammars to register, keyed by the name used after ```. */
  languages: Record<string, LanguageFn>;
  /** Fenced languages to leave as plain text. */
  plainText?: string[];
}

/** Read the language from a `language-xxx` or `lang-xxx` class; false for no-highlight. */
function languageOf(node: Element): string | false | undefined {
  const list = node.properties.className;
  if (!Array.isArray(list)) return undefined;
  let name: string | undefined;
  for (const item of list) {
    const value = String(item);
    if (value === 'no-highlight' || value === 'nohighlight') return false;
    if (!name && value.startsWith('language-')) name = value.slice(9);
    if (!name && value.startsWith('lang-')) name = value.slice(5);
  }
  return name;
}

function textOf(node: Element | ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

/**
 * Syntax-highlights fenced code with only the grammars we register. It does what
 * rehype-highlight does for our content, without bundling its default set of
 * thirty-seven languages.
 */
export function rehypeCodeHighlight({ languages, plainText = [] }: Options) {
  const lowlight = createLowlight(languages);

  const visit = (node: Root | RootContent, parent?: Element) => {
    if (node.type !== 'element' && node.type !== 'root') return;
    if (node.type === 'element' && node.tagName === 'code' && parent?.tagName === 'pre') {
      const lang = languageOf(node);
      if (!lang || plainText.includes(lang) || !lowlight.registered(lang)) return;
      const className = Array.isArray(node.properties.className)
        ? node.properties.className
        : (node.properties.className = []);
      if (!className.includes('hljs')) className.unshift('hljs');
      const result = lowlight.highlight(lang, node.children.map(textOf).join(''));
      if (result.children.length > 0) node.children = result.children as ElementContent[];
      return;
    }
    for (const child of node.children) visit(child, node.type === 'element' ? node : undefined);
  };

  return () => (tree: Root) => visit(tree);
}
