import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Set CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Get request data
    const requestData = await request.json();
    const text = requestData.text;
    const language = requestData.language || "en";

    if (!text) {
      console.log(`Error: No text provided for TTS`);
      return new NextResponse("No text provided", {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(
      `Generating speech for ${text.length} characters in ${language}`
    );

    // Forward the request to the TTS API
    const response = await fetch("https://summarizer.alexfarkas.me/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    // Get the audio data from the response
    const audioData = await response.arrayBuffer();

    // Return the audio data with appropriate headers
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="speech.wav"`,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error(`Error in TTS processing:`, error);
    return new NextResponse(
      `Error generating speech: ${(error as Error).message}`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
