import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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

async function generateSlideContent(
  topic: string,
  genAI: GoogleGenAI
): Promise<SlideContent> {
  const prompt = `Create a 5-slide presentation about "${topic}" using the file search documents.

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
              fileSearchStoreNames: [process.env.GEMINI_FILE_SEARCH_STORE!],
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
    const { topic } = await request.json();

    // Input validation
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Environment validation
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY environment variable missing",
        },
        { status: 500 }
      );
    }
    if (!process.env.GEMINI_FILE_SEARCH_STORE) {
      return NextResponse.json(
        {
          error: "GEMINI_FILE_SEARCH_STORE environment variable missing",
        },
        { status: 500 }
      );
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        {
          error: "GOOGLE_APPLICATION_CREDENTIALS environment variable missing",
        },
        { status: 500 }
      );
    }

    // Initialize clients
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: [
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    console.log(`Generating slides for topic: ${topic}`);

    // Execute pipeline
    const slideData = await generateSlideContent(topic, genAI);
    console.log(`Generated ${slideData.slides.length} slides`);

    const presentationId = await createGoogleSlides(slideData, auth);
    const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

    return NextResponse.json(
      {
        success: true,
        presentationId,
        presentationUrl,
        slideCount: slideData.slides.length,
        title: slideData.title,
        preview: slideData.slides.slice(0, 2), // First 2 slides preview
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error: unknown) {
    console.error("Pipeline Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorObj = error instanceof Error ? error : {};

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.stack : undefined,
          code: "code" in errorObj ? errorObj.code : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
