"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import PDFViewer from "./PDFViewer";
import VideoViewer from "./VideoViewer";

interface QueryInterfaceProps {
  fileSearchStoreName: string | null;
}

interface Citation {
  segment: string;
  confidenceScore?: number;
}

interface QueryResponse {
  answer: string;
  citations: Citation[];
  slides?: {
    presentationId: string;
    presentationUrl: string;
    slideCount: number;
    title: string;
    preview: Array<{
      title: string;
      bulletPoints: string[];
      notes: string;
      citations?: string[];
    }>;
  };
}

export default function QueryInterface({
  fileSearchStoreName,
}: QueryInterfaceProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createSlides] = useState(false);
  const [isPDFViewerOpen, setIsPDFViewerOpen] = useState(false);
  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    if (!fileSearchStoreName) {
      setError("Please select a File Search Store");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          fileSearchStoreNames: [fileSearchStoreName],
          createSlides,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Query failed");
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        Query Knowledge Base
      </h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !fileSearchStoreName}
          />
          <button
            type="submit"
            disabled={loading || !fileSearchStoreName || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (createSlides ? "Creating..." : "Querying...") : "Query"}
          </button>
        </div>
        {/* <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="createSlides"
            checked={createSlides}
            onChange={(e) => setCreateSlides(e.target.checked)}
            disabled={loading || !fileSearchStoreName}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="createSlides"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Also create Google Slides presentation
          </label>
        </div> */}
        {!fileSearchStoreName && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please select a File Search Store to query
          </p>
        )}
      </form>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Answer:
            </h3>
            <div className="text-gray-900 dark:text-gray-100 markdown-content">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-semibold mb-2 mt-3">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-3 space-y-2 ml-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-2 ml-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-200 dark:bg-gray-700 p-3 rounded mb-3 overflow-x-auto">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-3">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {response.answer}
              </ReactMarkdown>
            </div>
          </div>

          {response.slides && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="mb-2 text-sm font-medium text-green-700 dark:text-green-300">
                Google Slides Created:
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {response.slides.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {response.slides.slideCount} slides created
                  </p>
                </div>
                <a
                  href={response.slides.presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  Open Presentation
                </a>
                {response.slides.preview &&
                  response.slides.preview.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Preview:
                      </p>
                      <div className="space-y-2">
                        {response.slides.preview.map((slide, index) => (
                          <div
                            key={index}
                            className="p-2 bg-white dark:bg-gray-800 rounded text-xs"
                          >
                            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {slide.title}
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                              {slide.bulletPoints
                                .slice(0, 3)
                                .map((point, i) => (
                                  <li key={i}>{point}</li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Content Template Thumbnails */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Output Content Template:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setIsPDFViewerOpen(true)}
                className="p-4 rounded-lg border-2 transition-all hover:shadow-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 mb-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Slides
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsVideoViewerOpen(true);
                }}
                className="p-4 rounded-lg border-2 transition-all hover:shadow-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 mb-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Videos
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <PDFViewer
        isOpen={isPDFViewerOpen}
        onClose={() => setIsPDFViewerOpen(false)}
        pdfUrl="/ns_guide.pdf"
        pdfName="NS Guide"
      />

      <VideoViewer
        isOpen={isVideoViewerOpen}
        onClose={() => setIsVideoViewerOpen(false)}
        videoUrl="/ns_vid.mp4"
        videoName="NS Video"
      />
    </div>
  );
}
