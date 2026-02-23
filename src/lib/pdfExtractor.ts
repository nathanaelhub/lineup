import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  type PdfItem = { x: number; str: string; width: number };
  type PageLine = { minX: number; items: PdfItem[] };

  // First pass: collect all text items with positions.
  // We compute a GLOBAL left margin across every page so that
  // indentation levels are consistent even on pages that start mid-dialogue.
  const allPages: Array<Map<number, PageLine>> = [];
  const lineStartXValues: number[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str: string; transform: number[]; width: number }>;

    const lineMap = new Map<number, PageLine>();
    for (const item of items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      const x = item.transform[4];
      const w = item.width ?? 0;
      if (!lineMap.has(y)) lineMap.set(y, { minX: x, items: [] });
      const entry = lineMap.get(y)!;
      if (x < entry.minX) entry.minX = x;
      entry.items.push({ x, str: item.str, width: w });
    }

    // Collect leftmost x per line. Filtering x < 72pt removes page numbers / gutter marks.
    for (const entry of lineMap.values()) {
      if (entry.minX > 72) lineStartXValues.push(entry.minX);
    }

    allPages.push(lineMap);
  }

  if (lineStartXValues.length === 0) return '';

  // Use the minimum line-start x as the global left margin (action-text column).
  lineStartXValues.sort((a, b) => a - b);
  const globalLeftMargin = lineStartXValues[0];

  // Second pass: convert each page to text with consistent indentation.
  // We also re-insert blank lines where the vertical gap between consecutive
  // lines is noticeably larger than normal line-height (~2× or more). This is
  // critical for scripts where dialogue and action share the same indentation
  // (e.g. Lars-style sides) — the parser relies on blank lines to know when a
  // dialogue block ends and the next action block begins.
  const pageTexts: string[] = [];

  for (const lineMap of allPages) {
    if (lineMap.size === 0) continue;

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    // Estimate the typical line height from the most common y-gap.
    const gaps: number[] = [];
    for (let i = 1; i < sortedYs.length; i++) {
      gaps.push(sortedYs[i - 1] - sortedYs[i]);
    }
    gaps.sort((a, b) => a - b);
    const medianGap = gaps[Math.floor(gaps.length / 2)] ?? 14;
    // A gap more than 1.8× the median signals a blank line in the source.
    const blankLineThreshold = medianGap * 1.8;

    const outputLines: string[] = [];
    for (let i = 0; i < sortedYs.length; i++) {
      if (i > 0 && (sortedYs[i - 1] - sortedYs[i]) > blankLineThreshold) {
        outputLines.push(''); // blank line
      }
      const entry = lineMap.get(sortedYs[i])!;
      const indentPt = Math.max(0, entry.minX - globalLeftMargin);
      const spaces = Math.min(32, Math.round(indentPt / 7));
      const text = ' '.repeat(spaces) + joinItems(entry.items);
      if (text.trim()) outputLines.push(text);
    }

    pageTexts.push(outputLines.join('\n'));
  }

  // Join pages with a blank line so a character at the bottom of one page
  // doesn't accidentally absorb action lines from the top of the next page.
  return pageTexts.join('\n\n');
}

/**
 * Join PDF text items on the same line intelligently.
 *
 * Some PDFs (especially Courier/screenplay exports) store every character as a
 * separate item. In those cases naively joining with ' ' produces "T H E E N D".
 * Instead we sort items by x-position and insert a space only when the gap
 * between consecutive items is larger than one character-width — i.e. an actual
 * word space rather than the natural tracking between adjacent glyphs.
 */
function joinItems(items: Array<{ x: number; str: string; width: number }>): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0].str.trim();

  // Sort left-to-right
  const sorted = [...items].sort((a, b) => a.x - b.x);

  // Estimate average character width from items that look like single glyphs.
  // Fall back to 7pt (standard Courier 12pt) if we can't determine it.
  const singleCharWidths = sorted
    .filter(it => it.str.length === 1 && it.width > 0)
    .map(it => it.width);
  const avgCharWidth = singleCharWidths.length > 0
    ? singleCharWidths.reduce((s, w) => s + w, 0) / singleCharWidths.length
    : 7;

  // Adjacent glyphs in this font overlap slightly (gap ≈ -0.2pt).
  // Word spaces produce a gap of ~6.8pt. Any positive threshold between
  // those two values correctly inserts spaces only between words.
  const spaceThreshold = avgCharWidth * 0.4;

  let result = '';
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      result += sorted[i].str;
      continue;
    }
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // Gap = distance from end of previous item to start of current item.
    // Use actual item.width if available, else estimate from char count.
    const prevEnd = prev.x + (prev.width > 0 ? prev.width : prev.str.length * avgCharWidth);
    const gap = curr.x - prevEnd;
    if (gap > spaceThreshold) result += ' ';
    result += curr.str;
  }

  return result.trim();
}
