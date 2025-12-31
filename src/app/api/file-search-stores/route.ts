import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({}); // Auth via GEMINI_API_KEY env var

export async function POST(request: NextRequest) {
  try {
    const { displayName } = await request.json();

    // Create a File Search Store using SDK
    // File name will be visible in citations
    const fileSearchStore = await ai.fileSearchStores.create({
      config: { displayName: displayName || "My Knowledge Base" },
    });

    return NextResponse.json({
      success: true,
      store: {
        name: fileSearchStore.name,
        displayName: fileSearchStore.displayName,
      },
    });
  } catch (error) {
    console.error("Create store error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create store";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    // List File Search Stores using SDK
    // The list() method returns a Pager, which is an async iterable
    const pager = await ai.fileSearchStores.list();

    // Collect all stores by iterating through the pager
    type FileSearchStore = Awaited<
      ReturnType<typeof ai.fileSearchStores.create>
    >;
    const stores: FileSearchStore[] = [];
    for await (const store of pager) {
      stores.push(store);
    }

    return NextResponse.json({
      success: true,
      stores: stores,
    });
  } catch (error) {
    console.error("List stores error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list stores";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeName = searchParams.get("name");
    const force = searchParams.get("force") === "true";

    if (!storeName) {
      return NextResponse.json(
        { error: "Store name is required" },
        { status: 400 }
      );
    }

    // Delete the File Search Store
    // If force=true, any documents and objects related to this store will also be deleted
    await ai.fileSearchStores.delete({
      name: storeName,
      config: {
        force: force,
      },
    });

    return NextResponse.json({
      success: true,
      message: "File Search Store deleted successfully",
    });
  } catch (error) {
    console.error("Delete store error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete store";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
