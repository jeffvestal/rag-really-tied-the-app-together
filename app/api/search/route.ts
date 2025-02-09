import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";

export async function POST(request: Request) {
  try {
    const { query, apiKey, apiUrl, selectedLabSources } = await request.json();

    if (!query || !apiKey || !apiUrl) {
      return NextResponse.json(
        { error: "Missing query, API key, or API URL" },
        { status: 400 }
      );
    }

    console.log("🔍 Received search request for query:", query);
    console.log("🔗 Connecting to Elasticsearch at:", apiUrl);

    const client = new Client({
      node: apiUrl,
      auth: { apiKey },
    });

    console.log("✅ Elasticsearch client initialized");

    // ✅ Build filter only if sources are selected
    let filterClause = null;
    if (selectedLabSources && selectedLabSources.length > 0) {
      filterClause = {
        bool: {
          should: selectedLabSources.map((source: string) => ({
            term: { "url_path_dir1.keyword": source },
          })),
          minimum_should_match: 1,
        },
      };
    }

    // ✅ Build Elasticsearch query
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
      fields: ["title", "url_path", "url_path_dir1.keyword"],
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

    // ✅ Add filter only if it exists
    if (filterClause) {
      esQuery.retriever.rrf.filter = filterClause;
      console.log("✅ Applied Filter:", JSON.stringify(filterClause, null, 2));
    } else {
      console.log("⚠️ No filter applied (all sources selected)");
    }

    console.log("📤 Sending query to Elasticsearch:", JSON.stringify(esQuery, null, 2));

    let result;
    try {
      result = await client.search({
        index: "elastic-labs",
        body: esQuery,
      });
    } catch (esError) {
      console.error("❌ Elasticsearch request failed:", esError.meta?.body || esError.message);
      return NextResponse.json(
        { error: "Failed to query Elasticsearch", details: esError.meta?.body || esError.message },
        { status: 500 }
      );
    }

    console.log("📥 RAW Elasticsearch response received.");

    // ✅ Extract Hits
    const rawHits = result?.body?.hits?.hits || result?.hits?.hits;

    if (!rawHits || !Array.isArray(rawHits)) {
      console.error("⚠️ Unexpected Elasticsearch response format:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "Unexpected response format from Elasticsearch", response: result },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${rawHits.length} results`);

    // ✅ Process search hits into frontend-friendly format
    const results = rawHits.map((hit: any, index: number) => ({
      id: hit._id || `hit-${index}`,
      title: hit.fields?.title?.[0] || "Untitled",
      url_path: `https://www.elastic.co${hit.fields?.url_path?.[0] || "#"}`,
      main_text:
        hit.highlight?.semantic_body?.[0] ||
        hit.highlight?.body?.[0] ||
        "No preview available",
      citations: hit.highlight?.body || [],
    }));

    // ✅ Extract Aggregations (Lab Sources)
    console.log("📊 Extracting Aggregation Data...");
    const aggregationData = result?.aggregations?.lab_sources?.buckets;

    if (!aggregationData || !Array.isArray(aggregationData)) {
      console.warn("⚠️ Aggregation data is missing or not in expected format!");
    } else {
      console.log("✅ Raw Aggregation Buckets:", JSON.stringify(aggregationData, null, 2));
    }

    const labSources = aggregationData?.map((bucket: any, index: number) => ({
      id: index + 1,
      text: bucket.key,
      checked: true,
    })) || [];

    console.log("🔹 Extracted Lab Sources:", JSON.stringify(labSources, null, 2));

    return NextResponse.json({ results, labSources });
  } catch (error: any) {
    console.error("❌ Unexpected server error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
