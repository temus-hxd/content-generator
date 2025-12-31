import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

interface SlideContent {
  title: string;
  subtitle: string;
  slides: Array<{
    title: string;
    bulletPoints: string[];
    notes: string;
    citations?: string[];
  }>;
}

const ai = new GoogleGenAI({}); // Auth via GEMINI_API_KEY env var

async function generateSlideContentFromQuery(
  query: string,
  fileSearchStoreNames: string[],
  genAI: GoogleGenAI
): Promise<SlideContent> {
  const prompt = `Based on the following query: "${query}"

Create a 5-slide presentation using the file search documents to answer this query.

Return VALID JSON only - no markdown or explanations:
{
  "title": "Presentation Title",
  "subtitle": "Subtitle",
  "slides": [
    {
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "notes": "Speaker notes with citations",
      "citations": ["doc1.pdf", "doc2.pdf"]
    }
  ]
}`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: fileSearchStoreNames,
            },
          },
        ],
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    if (!result.text) {
      throw new Error("No response from Gemini");
    }

    // Validate and parse JSON
    let jsonContent: SlideContent;
    try {
      jsonContent = JSON.parse(result.text);
    } catch {
      console.error("Raw response:", result.text);
      throw new Error(
        "Invalid JSON response from Gemini - check prompt structure"
      );
    }

    // Validate structure
    if (
      !jsonContent.title ||
      !Array.isArray(jsonContent.slides) ||
      jsonContent.slides.length === 0
    ) {
      throw new Error(
        "Incomplete slide structure - missing title or slides array"
      );
    }

    return jsonContent;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Gemini error";
    const errorObj = error instanceof Error ? error : {};
    console.error("Gemini Error Details:", {
      message: errorMessage,
      code: "code" in errorObj ? errorObj.code : undefined,
      status: "status" in errorObj ? errorObj.status : undefined,
      details: "details" in errorObj ? errorObj.details : undefined,
    });

    throw new Error(`Gemini generation failed: ${errorMessage}`);
  }
}

async function createGoogleSlides(
  slideData: SlideContent,
  auth: InstanceType<typeof google.auth.GoogleAuth>
): Promise<string> {
  const slides = google.slides({ version: "v1", auth });

  try {
    // Create new presentation
    const presentation = await slides.presentations.create({
      requestBody: { title: slideData.title },
    });

    const presentationId = presentation.data.presentationId!;
    const requests: Array<{
      createSlide?: {
        objectId: string;
        insertionIndex?: number;
        slideLayoutReference?: { predefinedLayout: string };
      };
      insertText?: {
        objectId: string;
        insertionIndex: number;
        text: string;
      };
    }> = [];

    // Title slide
    requests.push({
      createSlide: {
        objectId: "title_slide",
        insertionIndex: 0,
        slideLayoutReference: { predefinedLayout: "TITLE" },
      },
    });

    // Content slides
    slideData.slides.forEach((slide, index) => {
      const slideId = `slide_${index}`;

      requests.push({
        createSlide: {
          objectId: slideId,
          slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
          insertionIndex: index + 1,
        },
      });

      // Title text
      requests.push({
        insertText: {
          objectId: `${slideId}.p1-t1`, // Standard title placeholder
          insertionIndex: 0,
          text: slide.title,
        },
      });

      // Body bullets
      const bulletText = slide.bulletPoints.map((p) => `• ${p}`).join("\n");
      requests.push({
        insertText: {
          objectId: `${slideId}.p2`, // Standard body placeholder
          insertionIndex: 0,
          text: bulletText,
        },
      });
    });

    // Batch update all at once
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests },
    });

    return presentationId;
  } catch (error: unknown) {
    console.error("Slides API Error:", error);

    const errorObj = error instanceof Error ? error : {};
    const errorCode = "code" in errorObj ? errorObj.code : undefined;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Specific error handling
    if (errorCode === 403) {
      throw new Error("Permission denied - check service account scopes");
    }
    if (errorCode === 429) {
      throw new Error("Rate limit exceeded - try again later");
    }
    if (errorCode === 400) {
      throw new Error("Invalid request - check slide structure");
    }

    throw new Error(`Slides creation failed: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, fileSearchStoreNames, createSlides } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!fileSearchStoreNames || fileSearchStoreNames.length === 0) {
      return NextResponse.json(
        { error: "At least one fileSearchStoreName is required" },
        { status: 400 }
      );
    }

    const storeNames = Array.isArray(fileSearchStoreNames)
      ? fileSearchStoreNames
      : [fileSearchStoreNames];

    // Generate content with file search tool
    // Supported models: gemini-3-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
    // Request markdown format in the response
    const markdownQuery = `${query}

## Instructions
You MUST format your response using markdown syntax. Follow these rules:
1. Use headings (# for main title, ## for sections, ### for subsections)
2. Use **bold** for emphasis and key terms
3. Use bullet lists with - (not *) for better compatibility
4. Use numbered lists (1., 2., 3.) for sequential items
5. Use code blocks with \`\`\`language for code examples
6. Use [link text](url) for links
7. Separate sections with blank lines
8. Do NOT use plain text paragraphs - structure everything with markdown

Example format:
## Main Topic
Brief introduction paragraph.

### Section 1
- **Key Point 1**: Description
- **Key Point 2**: Description

### Section 2
1. First item
2. Second item

Return your response in markdown format only.`;
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: markdownQuery,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: storeNames,
            },
          },
        ],
      },
    });

    if (!result.text) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 500 }
      );
    }

    const text = result.text;

    // Extract citations from grounding metadata
    // Access citation information through the grounding_metadata attribute
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = (result as any).candidates || [];
    const groundingMetadata = candidates[0]?.groundingMetadata;
    const citations =
      groundingMetadata?.groundingChunks?.map(
        (chunk: {
          web?: { uri?: string };
          retrievedContext?: { uri?: string };
          confidenceScore?: number;
        }) => ({
          segment: chunk.web?.uri || chunk.retrievedContext?.uri || "",
          confidenceScore: chunk.confidenceScore,
        })
      ) || [];

    const response: {
      success: boolean;
      answer: string;
      citations: typeof citations;
      slides?: {
        presentationId: string;
        presentationUrl: string;
        slideCount: number;
        title: string;
        preview: SlideContent["slides"];
      };
    } = {
      success: true,
      answer: text,
      citations,
    };

    // If createSlides is requested, generate and create Google Slides
    if (createSlides) {
      // Environment validation for slides creation
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          {
            error: "GEMINI_API_KEY environment variable missing",
          },
          { status: 500 }
        );
      }
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return NextResponse.json(
          {
            error:
              "GOOGLE_APPLICATION_CREDENTIALS environment variable missing",
          },
          { status: 500 }
        );
      }

      // Initialize clients for slides creation
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
          "https://www.googleapis.com/auth/presentations",
          "https://www.googleapis.com/auth/drive",
        ],
      });

      console.log(`Generating slides from query: ${query}`);

      // Generate slide content based on the query
      const slideData = await generateSlideContentFromQuery(
        query,
        storeNames,
        genAI
      );
      console.log(`Generated ${slideData.slides.length} slides`);

      // Create Google Slides presentation
      const presentationId = await createGoogleSlides(slideData, auth);
      const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

      response.slides = {
        presentationId,
        presentationUrl,
        slideCount: slideData.slides.length,
        title: slideData.title,
        preview: slideData.slides.slice(0, 2), // First 2 slides preview
      };
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Query error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process query";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
