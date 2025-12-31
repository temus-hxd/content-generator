import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({}); // Auth via GEMINI_API_KEY env var

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: file.type || "application/octet-stream",
    });

    // Upload file using SDK
    // File name will be visible in citations
    // Use displayName (not name) as name has strict format requirements
    const uploadResponse = await ai.files.upload({
      file: blob,
      config: {
        displayName: file.name,
        mimeType: file.type || "application/octet-stream",
      },
    });

    const fileData = uploadResponse;

    // Poll until file is processed (if not already ACTIVE)
    let currentFile = fileData;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (currentFile.state === "PROCESSING" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const fileName = currentFile.name;
      if (!fileName) {
        throw new Error("File name not found");
      }
      currentFile = await ai.files.get({ name: fileName });
      attempts++;

      if (currentFile.state === "FAILED") {
        return NextResponse.json(
          {
            error: currentFile.error?.message || "File processing failed",
          },
          { status: 500 }
        );
      }
    }

    if (currentFile.state !== "ACTIVE") {
      return NextResponse.json(
        { error: "File processing timeout" },
        { status: 500 }
      );
    }

    // Optionally import into a default File Search Store if one exists
    // For now, just return the file info - the frontend can import it separately
    return NextResponse.json({
      success: true,
      file: {
        name: currentFile.name,
        uri: currentFile.uri,
        mimeType: currentFile.mimeType,
        sizeBytes: currentFile.sizeBytes,
        displayName: currentFile.displayName,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
