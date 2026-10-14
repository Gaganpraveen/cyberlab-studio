import { Eye, FileSearch, Flag, ImageDown, ScanLine, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout } from '../components/LabLayout';
import {
  CHALLENGE_STEGO,
  IMAGE_METADATA,
  decodeMessage,
  encodeMessage,
  makeCarrier,
} from './engine';
import { steganographyStudioLab } from './index';

const BASE = makeCarrier(4096);
const GRID = 48; // render BASE as a 48-wide strip of grayscale pixels

/** Paint carrier bytes as a grayscale image, optionally showing only the LSB plane. */
function paint(canvas: HTMLCanvasElement | null, bytes: number[], lsbOnly: boolean) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cols = GRID;
  const rows = Math.ceil(bytes.length / cols);
  canvas.width = cols;
  canvas.height = rows;
  const img = ctx.createImageData(cols, rows);
  for (let i = 0; i < bytes.length; i++) {
    const v = lsbOnly ? ((bytes[i] ?? 0) & 1) * 255 : (bytes[i] ?? 0);
    const p = i * 4;
    img.data[p] = v;
    img.data[p + 1] = v;
    img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export default function SteganographyLab() {
  const [message, setMessage] = useState('meet at the old bridge, midnight');
  const [carrier, setCarrier] = useState<number[]>(BASE);
  const [extracted, setExtracted] = useState<string | null>(null);
  const [lsbView, setLsbView] = useState(false);
  const [lastEncoded, setLastEncoded] = useState<string>('');
  const [metaRevealed, setMetaRevealed] = useState(false);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  useEffect(() => {
    paint(canvasRef.current, carrier, lsbView);
  }, [carrier, lsbView]);

  const capacity = useMemo(() => Math.floor((BASE.length - 32) / 8), []);

  const encode = () => {
    try {
      const { stego, usedBytes } = encodeMessage(BASE, message);
      setCarrier(stego);
      setLastEncoded(message);
      setExtracted(null);
      add(
        evidence(
          'info',
          'Message embedded in the LSB plane',
          `${usedBytes} bytes hidden across ${usedBytes * 8} pixels. The image looks unchanged.`,
        ),
      );
    } catch (err) {
      add(evidence('warning', 'Message too large for this carrier', String(err)));
    }
  };

  const extract = () => {
    const result = decodeMessage(carrier);
    setExtracted(result);
    if (result && result === lastEncoded) markChallengeSolved('steg-roundtrip');
    add(
      evidence(
        result ? 'success' : 'info',
        result ? 'Hidden message recovered' : 'No hidden message found',
        result || 'The LSB plane held no valid payload.',
      ),
    );
  };

  const loadSuspicious = () => {
    setCarrier(CHALLENGE_STEGO.slice());
    setExtracted(null);
    setLastEncoded('');
    add(
      evidence(
        'warning',
        'Loaded the suspicious image',
        'It looks like an ordinary gradient. Extract to check the LSB plane.',
      ),
    );
  };

  const revealMeta = () => {
    setMetaRevealed(true);
    const leaks = IMAGE_METADATA.filter((f) => f.suspicious);
    add(
      evidence(
        'danger',
        `${leaks.length} metadata fields leak information`,
        leaks.map((f) => `- ${f.key}: ${f.value}`).join('\n'),
      ),
    );
  };

  const reset = () => {
    setMessage('meet at the old bridge, midnight');
    setCarrier(BASE);
    setExtracted(null);
    setLsbView(false);
    setLastEncoded('');
    setMetaRevealed(false);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Two ways data hides inside an image. On the first tab, slip a message into the
        least-significant bits of the pixels — invisible, but readable by anyone who looks. On the
        second, read the EXIF-style metadata that quietly ships inside the file.
      </p>
      <Callout tone="warning" title="Hidden is not protected">
        Steganography hides that a message exists; it does not encrypt it. Find the carrier and the
        secret is yours. Everything here is generated, fictional data.
      </Callout>
    </div>
  );

  const stegTab = (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            aria-label="carrier image"
            className="border-line bg-surface-2 h-40 w-40 rounded-lg border [image-rendering:pixelated]"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={lsbView}
              onChange={(e) => setLsbView(e.target.checked)}
              className="accent-accent size-3.5"
            />
            <span className="text-fg-muted">Show LSB plane (the hidden-data layer)</span>
          </label>
        </div>
        <div className="min-w-[14rem] flex-1 space-y-2">
          <label className="text-xs" htmlFor="steg-msg">
            <span className="text-fg-subtle mb-1 block">Secret message</span>
            <textarea
              id="steg-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="bg-surface-2 border-line text-fg w-full rounded-md border px-2 py-1.5 text-sm"
            />
          </label>
          <div className="text-fg-subtle text-xs">
            Capacity: ~{capacity} bytes in this {BASE.length}-byte carrier.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={encode} className="gap-1.5">
              <ImageDown className="size-4" aria-hidden /> Embed
            </Button>
            <Button size="sm" variant="secondary" onClick={extract} className="gap-1.5">
              <ScanLine className="size-4" aria-hidden /> Extract
            </Button>
            <Button size="sm" variant="outline" onClick={loadSuspicious} className="gap-1.5">
              <FileSearch className="size-4" aria-hidden /> Load suspicious image
            </Button>
          </div>
        </div>
      </div>

      {extracted !== null && (
        <div
          className={cn(
            'rounded-lg border p-3 text-sm',
            extracted ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface-2',
          )}
        >
          <div className="text-fg-subtle mb-1 text-xs">Extracted payload</div>
          {extracted ? (
            <code className="text-fg font-mono text-sm break-all">{extracted}</code>
          ) : (
            <span className="text-fg-muted text-xs">Nothing hidden here.</span>
          )}
          {extracted.startsWith('CTF{') && (
            <div className="border-accent/40 mt-2 flex items-center gap-2 border-t pt-2 font-mono text-xs">
              <Flag className="text-accent-text size-4 shrink-0" aria-hidden /> flag captured
            </div>
          )}
        </div>
      )}

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Toggle the LSB plane. This carrier has a regular, striped LSB pattern, so an embedded message shows up as an irregular patch that breaks the stripes — the pixels whose low bit was overwritten. (A real photo is the opposite: its LSB plane looks like random noise, and embedding adds visible structure.) Either way, a disturbed LSB plane is what steganalysis looks for. The carrier still looks identical to the eye because each byte moved by at most one. Remember: this is **encoding**, not encryption. The right primitive to protect contents is a cipher; hiding only delays discovery.`}
        </Markdown>
      </div>
    </div>
  );

  const metaTab = (
    <div className="space-y-4 p-5">
      <Button size="sm" onClick={revealMeta} className="gap-1.5">
        <Eye className="size-4" aria-hidden /> Inspect image metadata
      </Button>
      <div className="border-line overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-fg-subtle text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {IMAGE_METADATA.map((f) => {
              const flagLeak = metaRevealed && f.suspicious;
              return (
                <tr key={f.key} className={cn(flagLeak && 'bg-danger-soft/40')}>
                  <td className="px-3 py-2 font-mono text-xs">{f.key}</td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs break-all">{f.value}</div>
                    {flagLeak && f.note && (
                      <div className="text-danger mt-0.5 flex items-start gap-1 text-[0.7rem]">
                        <ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                        {f.note}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {metaRevealed && (
        <Badge tone="danger">
          {IMAGE_METADATA.filter((f) => f.suspicious).length} fields leak data — strip metadata
          before sharing
        </Badge>
      )}

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`Image files carry EXIF metadata: camera, timestamp, GPS coordinates, software, and free-text comments. It travels with the file and is easy to forget. Here a GPS pair pins the location, an author field leaks an internal badge, and a comment field holds a backup key someone pasted and forgot. Strip metadata before publishing — and never treat a comment field as private storage.`}
        </Markdown>
      </div>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="steg" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="steg" className="gap-1.5">
          <ScanLine className="size-4" aria-hidden /> LSB steganography
        </TabsTrigger>
        <TabsTrigger value="meta" className="gap-1.5">
          <FileSearch className="size-4" aria-hidden /> Metadata
        </TabsTrigger>
      </TabsList>
      <TabsContent value="steg" className="min-h-0 flex-1 overflow-y-auto">
        {stegTab}
      </TabsContent>
      <TabsContent value="meta" className="min-h-0 flex-1 overflow-y-auto">
        {metaTab}
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={steganographyStudioLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
