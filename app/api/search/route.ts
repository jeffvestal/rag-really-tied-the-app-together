import {NextResponse} from "next/server";
import {Client} from "@elastic/elasticsearch";
import {trace} from "@opentelemetry/api";
import {otelLogger} from "@/otel-logs";

export async function POST(request: Request) {
    // Create a tracer and start a root span
    const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME || "nextjs-otel-app");
    const rootSpan = tracer.startSpan("search.POST", {
        attributes: {
            component: "api",
            operation: "POST /search"
        }
    });

    try {
        const {query, apiKey, apiUrl, selectedLabSources, numSources, useChunk} = await request.json();

        // Capture relevant request attributes, excluding apiKey
        rootSpan.setAttribute("request.query", query || "");
        rootSpan.setAttribute("request.apiUrl", apiUrl || "");
        rootSpan.setAttribute("request.selectedLabSources", JSON.stringify(selectedLabSources) || "[]");
        rootSpan.setAttribute("request.numSources", numSources || "");
        rootSpan.setAttribute("request.useChunk", !!useChunk);

        const fieldToUse = useChunk ? "semantic_body" : "body";

        if (!query || !apiKey || !apiUrl) {
            rootSpan.setAttribute("error", true);
            rootSpan.end();
            return NextResponse.json(
                {error: "Missing query, API key, or API URL"},
                {status: 400}
            );
        }

        // console.log("🔍 Received search request for query:", query);
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: `Received search request for query: ${query}`
        });
        // console.log("🔗 Connecting to Elasticsearch at:", apiUrl);
        otelLogger.emit({
            severityNumber: 9,
            severityText: "INFO",
            body: `Connecting to Elasticsearch at: ${apiUrl}`
        });

        const client = new Client({
            node: apiUrl,
            auth: {apiKey},
        });

        // console.log("✅ Elasticsearch client initialized");
        otelLogger.emit({
            severityNumber: 9,
            severityText: "INFO",
            body: `Elasticsearch client initialized`
        });

        // Debugging: Log selected sources
        // console.log("🛠️ Selected Lab Sources:", selectedLabSources);
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: `Selected Lab Sources: ${selectedLabSources}`
        });

        let filterClause = null;
        if (selectedLabSources && selectedLabSources.length > 0) {
            filterClause = {
                bool: {
                    should: selectedLabSources.map((source: string) => ({
                        term: {"url_path_dir1.keyword": source},
                    })),
                    minimum_should_match: 1,
                },
            };
        }

        // Build Elasticsearch query
        const esQuery: any = {
            retriever: {
                rrf: {
                    retrievers: [
                        {
                            standard: {
                                query: {
                                    multi_match: {
                                        query: query,
                                        fields: ["body^2", "title", "meta_description"],
                                    },
                                },
                            },
                        },
                        {
                            standard: {
                                query: {
                                    semantic: {
                                        field: "semantic_body",
                                        query: query,
                                    },
                                },
                            },
                        },
                    ],
                    rank_constant: 1,
                    rank_window_size: 50,
                },
            },
            _source: false,
            fields: ["title", "url_path", "url_path_dir1.keyword", "body", "semantic_body"],
            highlight: {
                fields: {
                    body: {},
                    semantic_body: {
                        type: "semantic",
                        number_of_fragments: 2,
                        order: "score",
                    },
                },
            },
            aggs: {
                lab_sources: {
                    terms: {
                        field: "url_path_dir1.keyword",
                    },
                },
            },
        };

        // Add filter only if it exists
        if (filterClause) {
            esQuery.retriever.rrf.filter = filterClause;
            // console.log("✅ Applied Filter:", JSON.stringify(filterClause, null, 2));
            otelLogger.emit({
                severityNumber: 5,
                severityText: "DEBUG",
                body: "Applied Filter",
                attributes: {
                    filterClause: filterClause
                }
            });


        } else {
            // console.log("⚠️ No filter applied (all sources selected)");
            otelLogger.emit({
                severityNumber: 9,
                severityText: "INFO",
                body: `No filter applied (all sources selected`
            });
        }

        // console.log("📤 Sending query to Elasticsearch:", JSON.stringify(esQuery, null, 2));
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "Sending query to Elasticsearch",
            attributes: {
                esQuery: esQuery
            }
        });

        //  Create a child span for the Elasticsearch search call
        const searchSpan = tracer.startSpan("client.search", {
            parent: rootSpan,
            attributes: {
                "search.index": "elastic-labs",
                // Optional: store the query JSON (be mindful of size)
                "search.query": JSON.stringify(esQuery)
            }
        });

        let result;
        try {
            result = await client.search({
                index: "elastic-labs",
                body: esQuery,
            });
        } catch (esError) {
            // Record error on the child span so it appears in APM
            searchSpan.recordException(esError);
            searchSpan.setAttribute("error", true);
            // console.error("❌ Elasticsearch request failed:", esError.meta?.body || esError.message);
            otelLogger.emit({
                severityNumber: 17,
                severityText: "ERROR",
                body: "❌ Elasticsearch request failed",
                attributes: {
                    error: esError.meta?.body || esError.message,
                    stack: esError.stack || "",
                },
            });

            return NextResponse.json(
                {error: "Failed to query Elasticsearch", details: esError.meta?.body || esError.message},
                {status: 500}
            );
        } finally {

            // Ensure the child span is always ended
            searchSpan.end();
        }

        // console.log("📥 RAW Elasticsearch response received.", JSON.stringify(result, null, 2));
        // console.log("📥 RAW Elasticsearch response received.");
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "RAW Elasticsearch response received",
        });


        // Extract Hits
        const rawHits = result?.body?.hits?.hits || result?.hits?.hits;

        if (!rawHits || !Array.isArray(rawHits)) {
            rootSpan.setAttribute("error", true);
            // console.error("⚠️ Unexpected Elasticsearch response format:", JSON.stringify(result, null, 2));
            otelLogger.emit({
                severityNumber: 17,
                severityText: "ERROR",
                body: "Unexpected Elasticsearch response format",
                attributes: {
                    result: result
                }
            });
            rootSpan.end();
            return NextResponse.json(
                {error: "Unexpected response format from Elasticsearch", response: result},
                {status: 500}
            );
        }

        // console.log(`✅ Found ${rawHits.length} results`);
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "Found Results",
            attributes: {
                hitCount: rawHits.length
            }
        });


        // Process search hits into frontend-friendly format
        const results = rawHits.map((hit: any, index: number) => {
            const main_text = hit.highlight?.semantic_body?.[0] || "No preview available"; // Always for UI display
            const prompt_context = useChunk
                ? hit.highlight?.semantic_body?.[0] || "No chunk content available" // Use highlighted chunk
                : hit.fields?.body?.[0] || "No full document content available"; // Use full document text

            return {
                id: hit._id || `hit-${index}`,
                title: hit.fields?.title?.[0] || "Untitled",
                url_path: hit.fields?.url_path?.[0]?.startsWith("https://www.elastic.co")
                    ? hit.fields?.url_path?.[0]
                    : `https://www.elastic.co${hit.fields?.url_path?.[0] || "#"}`,
                main_text, // Always uses highlight.semantic_body for UI
                prompt_context, // This will be used in the LLM prompt
                citations: hit.highlight?.body || [],
            };
        });

        // console.log("✅ Extracted Search Results:", JSON.stringify(results, null, 2));
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "Extracted Search Results",
            attributes: {
                results: results
            }
        });

        // Extract Aggregations (Lab Sources)
        // console.log("📊 Extracting Aggregation Data...");
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "Extracting Aggregation Data",
        });
        const aggregationData = result?.aggregations?.lab_sources?.buckets;

        if (!aggregationData || !Array.isArray(aggregationData)) {
            // console.warn("⚠️ Aggregation data is missing or not in expected format!");
            otelLogger.emit({
                severityNumber: 17,
                severityText: "ERROR",
                body: "Aggregation data is missing or not in expected format",
            });
        } else {
            // console.log("✅ Raw Aggregation Buckets:", JSON.stringify(aggregationData, null, 2));
            otelLogger.emit({
                severityNumber: 5,
                severityText: "DEBUG",
                body: "Raw Aggregation Buckets",
                attributes: {
                    aggregationData: aggregationData
                }
            });
        }

        const labSources = aggregationData?.map((bucket: any, index: number) => ({
            id: index + 1,
            text: bucket.key,
            checked: true,
        })) || [];

        // console.log("🔹 Extracted Lab Sources:", JSON.stringify(labSources, null, 2));
        otelLogger.emit({
            severityNumber: 5,
            severityText: "DEBUG",
            body: "Extracted Lab Sources",
            attributes: {
                labSources: labSources
            }
        });

        // End the root span before returning
        rootSpan.end();

        return NextResponse.json({results, labSources});
    } catch (error: any) {
        // Record the error on the root span so it appears in APM
        rootSpan.recordException(error);
        rootSpan.setAttribute("error", true);
        rootSpan.end();
        // console.error("❌ Unexpected server error:", error);
        otelLogger.emit({
            severityNumber: 17,
            severityText: "ERROR",
            body: "❌ Unexpected server error",
            attributes: {
                error: error.message || "Unexpected error",
                stack: error.stack || "",
            },
        });
        return NextResponse.json(
            {error: error.message || "Unexpected error"},
            {status: 500}
        );
    }
}
