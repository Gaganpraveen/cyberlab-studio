import { cn } from '@/lib/cn';

import { inspect } from './engine';

/** Render one string as a row of inspectable character cells. */
export function CharRow({
  value,
  compareTo,
  onSelect,
  selected,
  label,
}: {
  value: string;
  compareTo?: string;
  onSelect: (index: number) => void;
  selected: number | null;
  label: string;
}) {
  const cells = inspect(value);
  const other = compareTo ? inspect(compareTo) : undefined;
  return (
    <div>
      <div className="text-fg-subtle mb-1.5 text-xs font-semibold tracking-wide uppercase">
        {label}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={`${label} characters`}>
        {cells.map((cell) => {
          const differs = other && other[cell.index]?.codePoint !== cell.codePoint;
          const suspicious = !cell.isAscii;
          return (
            <button
              key={cell.index}
              type="button"
              onClick={() => onSelect(cell.index)}
              aria-pressed={selected === cell.index}
              aria-label={`Position ${cell.index}: ${cell.name}${differs ? ', changed' : ''}`}
              className={cn(
                'relative flex size-11 items-center justify-center rounded-lg border font-mono text-lg transition-colors',
                selected === cell.index
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface-2 hover:border-line-strong',
                differs && 'ring-2 ring-danger/50',
                suspicious && 'text-warning',
              )}
            >
              {cell.char === ' ' ? '␠' : cell.char}
              {suspicious && (
                <span
                  className="bg-warning absolute -top-1 -right-1 size-2 rounded-full"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Detailed card for the selected character. */
export function CharDetail({ value, index }: { value: string; index: number | null }) {
  const cells = inspect(value);
  const cell = index === null ? null : cells[index];
  if (!cell) {
    return (
      <div className="text-fg-subtle flex h-full items-center justify-center p-4 text-sm">
        Select a character to inspect it.
      </div>
    );
  }
  const rows: Array<[string, string]> = [
    ['Position', String(cell.index)],
    ['Glyph', cell.char === ' ' ? '(space)' : cell.char],
    ['Code point', cell.codePointHex],
    ['Unicode name', cell.name],
    ['Script', cell.script],
    ['ASCII?', cell.isAscii ? 'yes' : 'no'],
    ['Escaped', `\\u${cell.codePoint.toString(16).padStart(4, '0')}`],
  ];
  return (
    <dl className="divide-line divide-y text-sm">
      {rows.map(([key, val]) => (
        <div key={key} className="flex justify-between gap-4 px-1 py-2">
          <dt className="text-fg-subtle">{key}</dt>
          <dd className="text-fg font-mono">{val}</dd>
        </div>
      ))}
      {cell.confusable && (
        <div className="text-warning bg-warning-soft mt-2 rounded-lg px-3 py-2 text-xs">
          Looks like the Latin letter “{cell.confusable}”, but it is not.
        </div>
      )}
    </dl>
  );
}
