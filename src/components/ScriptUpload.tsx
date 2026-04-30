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
      setError("Could not read file. Make sure it's a valid .txt or .pdf.");
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
    e.target.value = '';
  }, [handleFile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        disabled={isLoading}
        className={`drop${isDragging ? ' dragging' : ''}`}
        style={{ width: '100%', display: 'block', cursor: isLoading ? 'wait' : 'pointer' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.text,.pdf,text/plain,application/pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'var(--ink)',
              color: 'var(--paper)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {isLoading ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
          </div>
          <span className="display" style={{ fontSize: 22 }}>
            {isLoading ? 'Reading…' : isDragging ? 'Drop it' : 'New script'}
          </span>
        </div>
        <p className="label" style={{ marginTop: 4 }}>Drop · pdf · txt · paste</p>
      </button>
      {error && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--scarlet)',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.1em',
            padding: '0 8px',
          }}
        >
          {error}
        </p>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
