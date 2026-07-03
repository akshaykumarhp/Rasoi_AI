import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/gemini";

export const runtime = "nodejs";

/**
 * POST /api/transcribe   (multipart/form-data: audio=<Blob>, language=<bcp47>)
 * Transcribes recorded audio with Gemini. Used as the STT fallback on browsers
 * without a usable Web Speech API (notably iOS Safari) and for regional languages.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  }

  const audio = form.get("audio");
  const language = (form.get("language") as string) || "en";
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  const bytes = Buffer.from(await audio.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mimeType = audio.type || "audio/webm";

  try {
    const text = await transcribeAudio(base64, mimeType, language);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcription failed", err);
    return NextResponse.json(
      { error: "Could not understand the audio. Please try again." },
      { status: 502 },
    );
  }
}
