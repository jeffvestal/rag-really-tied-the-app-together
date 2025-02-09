import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, apiKey, apiUrl } = await request.json();

    if (!prompt || !apiKey || !apiUrl) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    console.log("📤 Sending request to Elastic Inference API...");

    const response = await fetch(`${apiUrl}/_inference/completion/azure_openai_gpt-4o/_stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({ input: prompt }),
    });

    if (!response.body) throw new Error("No response body received from LLM");

    console.log("✅ Streaming LLM response...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      start(controller) {
        async function push() {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(decoder.decode(value, { stream: true }));
          }
        }
        push();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("❌ Error in LLM API:", error);
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
