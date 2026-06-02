"use client";

import { useState, useRef, useCallback } from "react";
import { parseChordPro, transposeChordPro, semitonesBetween, DISPLAY_KEYS, type ChordLine } from "@/lib/chords";
import { cn } from "@/lib/utils";
import { Printer, ChevronUp, ChevronDown, Music } from "lucide-react";

interface ChordSheetProps {
  title: string;
  author?: string | null;
  chords: string;
  originalKey: string;
}

function renderLine(line: ChordLine, idx: number) {
  if (line.isSection) {
    return (
      <div key={idx} className="mt-5 mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {line.label}
      </div>
    );
  }

  if (line.segments.length === 0 || (line.segments.length === 1 && !line.segments[0].chord && !line.segments[0].text.trim())) {
    return <div key={idx} className="h-3" />;
  }

  if (!line.hasChords) {
    return (
      <div key={idx} className="font-mono text-sm leading-relaxed text-foreground">
        {line.segments.map((s) => s.text).join('')}
      </div>
    );
  }

  return (
    <div key={idx} className="flex flex-wrap items-end leading-none mb-1">
      {line.segments.map((seg, si) => (
        <span key={si} className="inline-flex flex-col mr-0">
          <span className={cn(
            "text-xs font-bold font-mono leading-none mb-1 whitespace-pre",
            seg.chord ? "text-primary" : "text-transparent select-none"
          )}>
            {seg.chord ?? (seg.text ? ' ' : '')}
          </span>
          <span className="text-sm font-mono leading-relaxed whitespace-pre text-foreground">
            {seg.text || (seg.chord ? '  ' : '')}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ChordSheet({ title, author, chords, originalKey }: ChordSheetProps) {
  const [currentKey, setCurrentKey] = useState(originalKey);
  const printRef = useRef<HTMLDivElement>(null);

  const semitones = semitonesBetween(originalKey, currentKey);
  const transposedChords = transposeChordPro(chords, semitones, currentKey);
  const lines = parseChordPro(transposedChords);

  const keyIdx = DISPLAY_KEYS.findIndex((k) => k.value === currentKey);

  const shiftKey = useCallback((dir: 1 | -1) => {
    const next = DISPLAY_KEYS[(keyIdx + dir + DISPLAY_KEYS.length) % DISPLAY_KEYS.length];
    setCurrentKey(next.value);
  }, [keyIdx]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 2rem; color: #000; background: #fff; }
        h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem; }
        .meta { font-size: 0.8rem; color: #555; margin-bottom: 0.5rem; }
        .key-badge { display: inline-block; border: 1px solid #999; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700; margin-bottom: 1.5rem; }
        .section { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-top: 1.5rem; margin-bottom: 0.25rem; }
        .spacer { height: 0.5rem; }
        .line { display: flex; flex-wrap: wrap; align-items: flex-end; margin-bottom: 2px; }
        .seg { display: inline-flex; flex-direction: column; }
        .chord { font-size: 0.75rem; font-weight: 700; color: #1a56db; white-space: pre; line-height: 1; margin-bottom: 2px; }
        .chord-empty { color: transparent; }
        .lyric { font-size: 0.85rem; white-space: pre; line-height: 1.5; }
        .no-chord-line { font-size: 0.85rem; line-height: 1.6; }
        @media print { body { padding: 1rem; } }
      </style></head><body>
      <h1>${title}</h1>
      ${author ? `<div class="meta">${author}</div>` : ''}
      <div class="key-badge">Tonalité : ${currentKey}</div>
      ${lines.map((line, i) => {
        if (line.isSection) return `<div class="section">${line.label}</div>`;
        if (!line.segments.length || (line.segments.length === 1 && !line.segments[0].chord && !line.segments[0].text.trim())) return `<div class="spacer"></div>`;
        if (!line.hasChords) return `<div class="no-chord-line">${line.segments.map(s => s.text).join('')}</div>`;
        return `<div class="line">${line.segments.map(seg => `
          <span class="seg">
            <span class="chord ${seg.chord ? '' : 'chord-empty'}">${seg.chord ?? (seg.text ? '&nbsp;' : '')}</span>
            <span class="lyric">${seg.text || (seg.chord ? '&nbsp;&nbsp;' : '')}</span>
          </span>`).join('')}</div>`;
      }).join('')}
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button onClick={() => shiftKey(-1)} className="rounded p-1.5 hover:bg-accent transition-colors" title="Tonalité -1">
            <ChevronDown className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Music className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold min-w-[2.5rem] text-center">{currentKey}</span>
          </div>
          <button onClick={() => shiftKey(1)} className="rounded p-1.5 hover:bg-accent transition-colors" title="Tonalité +1">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        <select
          value={currentKey}
          onChange={(e) => setCurrentKey(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DISPLAY_KEYS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>

        {semitones !== 0 && (
          <span className="text-xs text-muted-foreground">
            ({semitones > 0 ? '+' : ''}{semitones} demi-tons depuis {originalKey})
          </span>
        )}

        <button
          onClick={handlePrint}
          className="ml-auto flex items-center gap-2 rounded-md border border-input bg-background px-3 h-9 text-sm hover:bg-accent transition-colors"
        >
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </button>
      </div>

      {/* Chord sheet */}
      <div ref={printRef} className="rounded-lg border border-border bg-card p-6 font-mono">
        <div className="mb-4">
          <h2 className="text-base font-bold">{title}</h2>
          {author && <p className="text-xs text-muted-foreground mt-0.5">{author}</p>}
          <span className="mt-2 inline-block text-xs border border-border rounded px-2 py-0.5 font-semibold">
            Tonalité : {currentKey}
          </span>
        </div>
        <div>
          {lines.map((line, i) => renderLine(line, i))}
        </div>
      </div>
    </div>
  );
}
