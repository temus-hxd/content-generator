import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeName: string }> }
) {
  try {
    const { fileUri } = await request.json();
    const { storeName } = await params;

    if (!fileUri) {
      return NextResponse.json(
        { error: "fileUri is required" },
        { status: 400 }
      );
    }

    let fileName = fileUri;
    if (fileUri.includes("/files/")) {
      const match = fileUri.match(/files\/[^/]+/);
      if (match) {
        fileName = match[0];
      }
    }

    const decodedStoreName = decodeURIComponent(storeName);

    console.log("Importing:", {
      fileSearchStoreName: decodedStoreName,
      fileName,
    });

    // Start import
    const operation = await ai.fileSearchStores.importFile({
      fileSearchStoreName: decodedStoreName,
      fileName,
    });

    console.log("Operation started:", operation.name);

    let current = operation;
    let attempts = 0;
    const maxAttempts = 30;

    // Poll operation until complete (matching documentation format)
    while (!current.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      current = await ai.operations.get({ operation: current });
      attempts++;

      console.log(`Poll ${attempts}: done=${current.done}`);

      if (current.error) {
        const errorMessage =
          typeof current.error === "string"
            ? current.error
            : (current.error as { message?: string })?.message ||
              JSON.stringify(current.error) ||
              "Operation failed";
        throw new Error(errorMessage);
      }
    }

    if (!current.done) {
      throw new Error("Import timeout");
    }

    return NextResponse.json({
      success: true,
      importedFile: current.response,
      operationName: current.name,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import" },
      { status: 500 }
    );
  }
}
