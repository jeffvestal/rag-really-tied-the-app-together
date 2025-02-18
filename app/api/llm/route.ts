import {NextResponse} from "next/server";
import {trace, context} from "@opentelemetry/api";
import {otelLogger} from "@/otel-logs";

export async function POST(request: Request) {
    // Get a tracer using your configured service name (fallback to a default)
    const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME || "nextjs-otel-app");


    // Start a root span for the entire POST operation
    const rootSpan = tracer.startSpan("llm.POST", {
        attributes: {
            "component": "api",
            "operation": "POST /llm"
        }
    });

    try {
        // Clone the request to safely read its body without interfering with later consumption
        const requestBody = await request.clone().json();
        // Capture request attributes (avoid logging sensitive info)
        rootSpan.setAttribute("request.body", JSON.stringify({
            prompt: requestBody.prompt,
            // Avoid capturing apiKey in plain text:
            apiKey: requestBody.apiKey ? "***" : undefined,
            apiUrl: requestBody.apiUrl
        }));

        const {prompt, apiKey, apiUrl} = requestBody;

        if (!prompt || !apiKey || !apiUrl) {
            rootSpan.setAttribute("error", "Missing required parameters");
            rootSpan.end();
            return NextResponse.json(
                {error: "Missing required parameters"},
                {status: 400}
            );
        }

        // console.log("📤 Sending request to Elastic Inference API...");
        otelLogger.emit({
            severityNumber: 9,
            severityText: "Info",
            body: `Sending request to Elastic Inference API...`
        });


        // Start a child span for the external API call
        const fetchSpan = tracer.startSpan("fetch.elastic_inference", {
            parent: rootSpan,
            attributes: {
                "api.url": apiUrl,
                "request.input": prompt // record the prompt if useful
            }
        });

        let response: Response;
        try {
            response = await fetch(`${apiUrl}/_inference/completion/azure_openai_gpt-4o/_stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `ApiKey ${apiKey}`, // Avoid logging actual key
                },
                body: JSON.stringify({input: prompt}),
            });
            fetchSpan.setAttribute("response.status", response.status);
        } catch (fetchError) {
            fetchSpan.recordException(fetchError);
            fetchSpan.setAttribute("error", true);
            throw fetchError;
        } finally {
            // Always end the fetchSpan
            fetchSpan.end();
        }
        if (!response.body) {
            const msg = "No response body received from LLM";
            rootSpan.setAttribute("error", msg);
            throw new Error(msg);
        }

        // console.log("✅ Streaming LLM response...");
        otelLogger.emit({
            severityNumber: 9,
            severityText: "Info",
            body: `Streaming LLM response...`
        });

        // Create a child span for streaming the response body
        const streamSpan = tracer.startSpan("stream.reading", {parent: rootSpan});
        const reader = response.body.getReader();
        const decoder = new TextDecoder();


        const stream = new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const {value, done} = await reader.read();
                        if (done) {
                            controller.close();
                            break;
                        }
                        // Optionally record events per chunk (if not too noisy)
                        // rootSpan.addEvent("chunk received", { chunkLength: value.length });
                        streamSpan.addEvent("chunk received",
                            {chunkLength: value.length
                            });
                        controller.enqueue(decoder.decode(value, {stream: true}));
                    }
                    streamSpan.end();
                    rootSpan.end();
                } catch (streamError) {
                    // Record streaming errors on the child span
                    streamSpan.recordException(streamError);
                    streamSpan.setAttribute("error", true);
                    streamSpan.end();

                    // Also mark the root span as failed
                    rootSpan.recordException(streamError);
                    rootSpan.setAttribute("error", true);
                    rootSpan.end();

                    // If you rethrow here, the top-level catch block also fires,
                    // causing "double end" on the rootSpan. Instead, just signal error:
                    // console.error("❌ Error in streaming portion:", streamError);
                    otelLogger.emit({
                        severityNumber: 17,
                        severityText: "ERROR",
                        body: "Error in streaming portion",
                        attributes: {
                            "streamError": streamError,
                        }
                    });
                    controller.error(streamError);
                }
            },
        });

        return new Response(stream, {
            headers: {"Content-Type": "text/plain"},
        });
    } catch (error: any) {
        // console.error("❌ Error in LLM API:", error);
        otelLogger.emit({
            severityNumber: 17,
            severityText: "ERROR",
            body: "Error in LLM API",
            attributes: {
                "error": error,
            }
        });
        rootSpan.recordException(error);
        rootSpan.setAttribute("error", true);
        rootSpan.end();
        return NextResponse.json(
            {error: error.message || "Unexpected error"},
            {status: 500}
        );
    }
}
