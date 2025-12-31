import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({}); // Auth via GEMINI_API_KEY env var

export async function GET() {
  try {
    // List files using SDK
    // The list() method returns a Pager, which is an async iterable
    const pager = await ai.files.list();

    // Collect all files by iterating through the pager
    type File = Awaited<ReturnType<typeof ai.files.upload>>;
    const files: File[] = [];
    for await (const file of pager) {
      files.push(file);
    }

    return NextResponse.json({
      success: true,
      files: files,
    });
  } catch (error) {
    console.error("List files error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list files";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("name");

    if (!fileName) {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 }
      );
    }

    await ai.files.delete({ name: fileName });

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete file";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
