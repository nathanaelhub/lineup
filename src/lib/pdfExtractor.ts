import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  type PageLine = { minX: number; parts: string[] };

  // First pass: collect all text items with positions.
  // We compute a GLOBAL left margin across every page so that
  // indentation levels are consistent even on pages that start mid-dialogue
  // (which have no action text to anchor the left edge).
  const allPages: Array<Map<number, PageLine>> = [];
  const lineStartXValues: number[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str: string; transform: number[] }>;

    const lineMap = new Map<number, PageLine>();
    for (const item of items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      const x = item.transform[4];
      if (!lineMap.has(y)) lineMap.set(y, { minX: x, parts: [] });
      const entry = lineMap.get(y)!;
      if (x < entry.minX) entry.minX = x;
      entry.parts.push(item.str);
    }

    // Collect only the leftmost x per line (line-start positions).
    // Filtering out x < 72pt removes gutter elements (page numbers, binding marks)
    // that would pull the left margin too low.
    for (const entry of lineMap.values()) {
      if (entry.minX > 72) lineStartXValues.push(entry.minX);
    }

    allPages.push(lineMap);
  }

  if (lineStartXValues.length === 0) return '';

  // Use the minimum line-start x as the global left margin.
  // This is the action-text margin — consistent across all pages.
  lineStartXValues.sort((a, b) => a - b);
  const globalLeftMargin = lineStartXValues[0];

  // Second pass: convert each page to text with consistent indentation.
  const pageTexts: string[] = [];

  for (const lineMap of allPages) {
    if (lineMap.size === 0) continue;

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageText = sortedYs
      .map(y => {
        const entry = lineMap.get(y)!;
        const indentPt = Math.max(0, entry.minX - globalLeftMargin);
        const spaces = Math.min(32, Math.round(indentPt / 7));
        return ' '.repeat(spaces) + entry.parts.join(' ').trim();
      })
      .filter(line => line.trim().length > 0)
      .join('\n');

    pageTexts.push(pageText);
  }

  // Join pages with a single newline so character names at the end of one page
  // aren't separated from their dialogue at the top of the next page by a blank line.
  return pageTexts.join('\n');
}
