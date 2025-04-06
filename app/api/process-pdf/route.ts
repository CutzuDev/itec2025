import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the FormData from the original request
    const formData = await request.formData();

    // Create a new FormData to send to the external API
    const updatedFormData = new FormData();
    
    // Use Array.from to convert FormData entries to an array before iterating
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (key === "pdf") {
        updatedFormData.append("pdf", value);
      }
    });

    // Forward the request to the new API
    const response = await fetch("https://summarizer.alexfarkas.me/api/process-pdf", {
      method: "POST",
      body: updatedFormData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Get the response text - this will be JSX format with style={{...}}
    let jsxContent = await response.text();
    
    // We need to convert React style={{...}} to regular HTML style="..." for rendering
    // This is a simple transformation - in a production app you might want a proper JSX parser
    jsxContent = jsxContent.replace(/style={{(.*?)}}/g, (match, styleContent) => {
      // Convert React style object to CSS string
      const styleString = styleContent
        .replace(/"/g, '')
        .replace(/,\s*/g, ';')
        .replace(/([a-zA-Z0-9]+):/g, '$1:')
        .replace(/([a-zA-Z])([A-Z])/g, '$1-$2').toLowerCase();
      
      return `style="${styleString}"`;
    });

    // Return the response with CORS headers
    return new NextResponse(jsxContent, {
      headers: {
        // Ensure proper content type for styled HTML
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        // Add security headers to allow inline styles
        "Content-Security-Policy": "style-src 'self' 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff"
      },
    });
  } catch (error) {
    console.error("Error proxying to PDF processing service:", error);
    return new NextResponse(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
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
