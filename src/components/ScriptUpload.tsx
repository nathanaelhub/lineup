import { useState, useCallback, useRef } from 'react';
import { extractTextFromPDF } from '../lib/pdfExtractor';

interface ScriptUploadProps {
  onUpload: (text: string, filename: string) => void;
}

export function ScriptUpload({ onUpload }: ScriptUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const text = await extractTextFromPDF(file);
        onUpload(text, file.name);
      } else {
        const text = await file.text();
        onUpload(text, file.name);
      }
    } catch (err) {
      setError('Could not read file. Make sure it\'s a valid .txt or .pdf.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 ease-out
          ${isDragging
            ? 'border-accent bg-accent/10 scale-[1.02]'
            : isLoading
              ? 'border-bg-tertiary opacity-60 cursor-wait'
              : 'border-bg-tertiary hover:border-accent/50 hover:bg-bg-secondary'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.text,.pdf,text/plain,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-colors duration-300
            ${isDragging ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-secondary'}
          `}>
            {isLoading ? (
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-text-primary">
              {isLoading ? 'Reading script...' : isDragging ? 'Drop your script here' : 'Upload a script'}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Tap to browse · supports .txt and .pdf
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-center text-sm text-danger px-2">{error}</p>
      )}
    </div>
  );
}
