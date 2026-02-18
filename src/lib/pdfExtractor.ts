import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker bundled with pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by their vertical position (y coordinate) to reconstruct lines
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      height: number;
    }>;

    // Sort by page position: top-to-bottom, then left-to-right
    const lines: Map<number, string[]> = new Map();

    for (const item of items) {
      if (!item.str) continue;
      // Round y to nearest 2px to group items on the same visual line
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }

    // Sort lines by descending y (PDF coords go bottom-up)
    const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
    const pageText = sortedYs
      .map(y => lines.get(y)!.join(' ').trim())
      .filter(line => line.length > 0)
      .join('\n');

    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
}
