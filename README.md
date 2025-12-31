# RAG Knowledge Base with Gemini File Search

A Next.js application that implements a Retrieval-Augmented Generation (RAG) knowledge base using Google's Gemini File Search API. Upload documents, select them, and query them with AI-powered semantic search.

## Features

- 📄 **File Upload**: Upload various document formats (PDF, DOCX, TXT, JSON, MD, and code files)
- 🔍 **Semantic Search**: Query your documents using natural language
- 📚 **Multiple Files**: Select and query across multiple documents simultaneously
- 🔗 **Citations**: Get answers with citations linking back to source documents
- 💾 **File Management**: View, select, and delete uploaded files

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

3. Add your Gemini API key to `.env.local`:

```
GEMINI_API_KEY=your_actual_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Upload Documents**: Click the upload area and select one or more files to upload. Supported formats include PDF, DOCX, TXT, JSON, Markdown, and various code files.

2. **Select Files**: Check the boxes next to the files you want to query. You can select multiple files to search across all of them.

3. **Query**: Enter your question in the query box and click "Query". The system will search through your selected documents and provide an answer with citations.

4. **View Results**: Answers include citations that link back to the specific parts of your documents used to generate the response.

## API Routes

- `POST /api/upload` - Upload a file to Gemini File Search
- `GET /api/files` - List all uploaded files
- `DELETE /api/files?name=<filename>` - Delete a file
- `POST /api/query` - Query the knowledge base with selected files

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Generative AI SDK** - Gemini API integration
- **Gemini File Search** - RAG functionality

## Cost Structure

- **Storage**: Free
- **Query-time embedding generation**: Free
- **Initial indexing**: $0.15 per 1 million tokens

## Learn More

- [Gemini API Documentation](https://ai.google.dev/docs)
- [File Search Tool Documentation](https://blog.google/technology/developers/file-search-gemini-api/)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
