import { NextResponse } from "next/server";
import { Client } from "@elastic/elasticsearch";

export async function POST(request: Request) {
  try {
    const { apiUrl, apiKey } = await request.json();

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ success: false, error: "Missing API URL or API Key" }, { status: 400 });
    }

    console.log("🔗 Testing connection to Elasticsearch at:", apiUrl);

    const client = new Client({
      node: apiUrl,
      auth: { apiKey },
    });

    const pingResponse = await client.ping();

    if (!pingResponse) {
      throw new Error("No response from Elasticsearch");
    }

    console.log("✅ Connection to Elasticsearch successful");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Elasticsearch connection failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Connection failed" },
      { status: 500 }
    );
  }
}
