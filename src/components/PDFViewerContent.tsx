"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF.js worker (matching reference implementation)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFViewerContentProps {
  pdfUrl: string;
  pageNumber: number;
  pageWidth: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onLoadError: (error: Error) => void;
}

export default function PDFViewerContent({
  pdfUrl,
  pageNumber,
  pageWidth,
  onLoadSuccess,
  onLoadError,
}: PDFViewerContentProps) {
  return (
    <div className="flex justify-center">
      <Document
        file={pdfUrl}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <div className="text-gray-600 dark:text-gray-400">Loading PDF...</div>
        }
        error={
          <div className="text-red-600 dark:text-red-400">
            Failed to load PDF
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          className="shadow-lg"
          width={pageWidth}
        />
      </Document>
    </div>
  );
}
