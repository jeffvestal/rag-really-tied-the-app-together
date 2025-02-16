"use client";

import {useState, useEffect} from "react";
import SearchInput from "./SearchInput";
import ResultItem from "./ResultItem";
import ThemeToggle from "./ThemeToggle";
import LabSources from "./LabSources";
import {Settings, X} from "lucide-react";
import ReactMarkdown from "react-markdown";


export default function SearchInterface() {
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [apiKey, setApiKey] = useState("");
    const [apiUrl, setApiUrl] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [generatedResponse, setGeneratedResponse] = useState("");
    const [generatedPrompt, setGeneratedPrompt] = useState(""); // ✅ Store the LLM prompt
    const [labSources, setLabSources] = useState<any[]>([]);
    const [useContextOnly, setUseContextOnly] = useState(true);
    const [numSources, setNumSources] = useState(3);
    const [useChunk, setUseChunk] = useState(true); // true = `semantic_body`, false = `body`
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false); // ✅ State for Prompt Box


    useEffect(() => {
        setApiKey(localStorage.getItem("es_api_key") || "");
        setApiUrl(localStorage.getItem("es_api_url") || "");
        fetchLabSources();
    }, []);

    useEffect(() => {
        const responseContainer = document.getElementById("generatedResponseContainer");
        if (responseContainer) {
            responseContainer.scrollTop = responseContainer.scrollHeight;
        }
    }, [generatedResponse]);

    const fetchLabSources = async () => {
        try {
            console.log("🔍 Fetching Lab Sources...");
            const response = await fetch("/api/search", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({query: "", apiKey, apiUrl}),
            });

            if (!response.ok) throw new Error("Failed to fetch lab sources");

            const data = await response.json();
            console.log("✅ Fetched Lab Sources Data:", JSON.stringify(data.labSources, null, 2));

            setLabSources(
                data.labSources.map((source: any, index: number) => ({
                    id: index + 1,
                    text: source.text,
                    checked: true,
                }))
            );
        } catch (error) {
            console.error("❌ Error fetching lab sources:", error);
        }
    };

    const handleSearch = async (query: string) => {
        console.log(`🔍 Sending search request for query: "${query}"`);
        setGeneratedResponse("");
        setGeneratedPrompt(""); // ✅ Reset the prompt when a new search starts

        const selectedSources = labSources.filter((source) => source.checked).map((source) => source.text);

        try {
            const response = await fetch("/api/search", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    query,
                    apiKey,
                    apiUrl,
                    selectedLabSources: selectedSources,
                    numSources,   // ✅ Send user-defined number of sources
                    useChunk,     // ✅ Send whether to use chunking or full doc
                }),
            });

            const data = await response.json();
            console.log("📥 Search Response:", JSON.stringify(data, null, 2));

            if (!data.results || !Array.isArray(data.results)) {
                console.error("❌ Invalid results format:", data.results);
                return;
            }

            setSearchResults(data.results);

            if (data.labSources && Array.isArray(data.labSources)) {
                console.log("✅ Updating labSources state:", JSON.stringify(data.labSources, null, 2));
                setLabSources(data.labSources);
            }

// ✅ Extract sources for the prompt
            const sources = data.results.slice(0, numSources).map((doc, index) => {
                console.log(`🔍 Processing Source ${index + 1}:`, JSON.stringify(doc, null, 2));  // ✅ Log the full document

                return {
                    id: `Source ${index + 1}`,
                    title: doc.title,
                    url: doc.url_path,
                    content: doc.prompt_context, // ✅ Always use prompt_context
                };
            });

            console.log("✅ Extracted Sources for Prompt:", JSON.stringify(sources, null, 2));


// ✅ Format sources for prompt (structured with identifiers)
            const formattedDocs = sources
                .map((source) => `${source.id}: ${source.title}\n${source.content}`)
                .join("\n\n");

// ✅ Instruction for LLM to cite only used sources
            const promptInstruction = useContextOnly
                ? `ONLY use the provided documents for your response. Do not use any prior knowledge. 
                If the answer is not in the provided documents return "I'm unable to provide an answer using the included context." 
                 Cite ONLY the sources you actually reference in your response.`
                : `Prefer using the provided documents, but if they lack sufficient details, you may use prior knowledge. 
       If you do, explicitly state: "[This response includes knowledge beyond the provided context.]" 
       Cite ONLY the sources you actually reference in your response.`;

// ✅ Sources list (for reference) — LLM will decide what to cite
            const sourcesList = sources.map((source) => `- **${source.id}**: ${source.title} (${source.url})`).join("\n");

            const prompt = `The user has asked a question: ${query}. Use the following documents to answer the question:
${formattedDocs}

${promptInstruction}

Format the response with:
- Proper Markdown headings (### for sections)
- Clear bullet points for lists
- Extra line breaks for readability
- Paragraph spacing between sections
- **At the end of the response, include a "*Sources Used*" section listing ONLY the document titles that were actually referenced.**


### Sources Used:
(Only include sources that were directly referenced in your response.)`;

            console.log("📤 Sending prompt to LLM:", prompt);
            setGeneratedPrompt(prompt); // ✅ Store the generated prompt for UI display
            streamLLMResponse(prompt);

        } catch (error) {
            console.error("❌ Error fetching search results:", error);
        }
    };
    const streamLLMResponse = async (prompt: string) => {
        try {
            const response = await fetch("/api/llm", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({prompt, apiKey, apiUrl}),
            });

            if (!response.body) throw new Error("LLM response body is empty");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let resultText = "";

            const processStream = async () => {
                while (true) {
                    const {value, done} = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, {stream: true});

                    // 🛠️ Parse each event
                    chunk.split("\n").forEach((line) => {
                        if (line.startsWith("data:")) {
                            try {
                                const jsonData = JSON.parse(line.replace("data: ", "").trim());

                                if (jsonData.completion) {
                                    const deltaText = jsonData.completion.map((c: any) => c.delta).join("");
                                    resultText += deltaText;

                                    // Update state dynamically
                                    setGeneratedResponse((prev) => prev + deltaText);
                                }
                            } catch (error) {
                                console.error("⚠️ Error parsing LLM event stream:", error);
                            }
                        }
                    });
                }
            };

            await processStream();
            console.log("✅ LLM Streaming Complete:", resultText);
        } catch (error) {
            console.error("❌ Error streaming LLM response:", error);
        }
    };


    const handleLabSourceToggle = (id: number) => {
        setLabSources((prevSources) =>
            prevSources.map((source) =>
                source.id === id ? {...source, checked: !source.checked} : source
            )
        );
    };

    const closeSettings = () => setIsSettingsOpen(false);

    return (
        <div className="w-full min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-7xl mx-auto space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        {/* 🔹 Title and Logo */}
                        <div className="flex items-center space-x-3">
                            <img src="/bowling-ball-logo.png" alt="Logo" className="w-6 h-6"/>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                The Rag Really Ties the App Together
                            </h1>
                        </div>
                        {/* 🔹 Right-aligned buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            >
                                <Settings size={20}/>
                            </button>
                            <ThemeToggle/>
                        </div>
                    </div>
                    <SearchInput onSearch={handleSearch}/>
                </div>

                {/* 🔹 Layout: Results + Sidebar */}
                <div className="flex max-w-7xl mx-auto space-x-4 w-full">
                    {/* Left Side: Generated Response & Search Results */}
                    <div className="flex-grow space-y-4 max-w-[75%]">
                        {/* 🔹 Generated Response Box */}
                        <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-4 relative transition-all 
            ${isExpanded ? "w-full" : "w-full"} max-w-full`}>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generated
                                    Response</h2>
                                {generatedResponse && (
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="text-blue-500 dark:text-blue-400 text-sm hover:underline focus:outline-none"
                                    >
                                        {isExpanded ? "Collapse" : "Expand"}
                                    </button>
                                )}
                            </div>

                            <div
                                id="generatedResponseContainer"
                                className={`px-4 py-4 bg-gray-50 dark:bg-gray-700 rounded-md overflow-y-auto transition-all ${
                                    isExpanded ? "max-h-[600px]" : "max-h-[250px]"
                                }`}
                            >
                                {generatedResponse ? (
                                    <ReactMarkdown
                                        className="prose prose-sm text-sm dark:prose-invert text-gray-900 dark:text-gray-200 leading-relaxed space-y-3"
                                    >
                                        {generatedResponse}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                        No response generated yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 🔹 Search Results */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Elasticsearch
                                Results</h2>
                            <div className="space-y-4">
                                {searchResults.map((result) => (
                                    <ResultItem key={result.id} result={result}
                                                className="text-gray-900 dark:text-gray-200"/>
                                ))}
                            </div>
                        </div>

                        {/* 🔹 LLM Prompt Box (Collapsible) */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">LLM Prompt</h2>
                                <button
                                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                    className="text-blue-500 dark:text-blue-400 text-sm hover:underline focus:outline-none"
                                >
                                    {isPromptExpanded ? "Collapse" : "Expand"}
                                </button>
                            </div>

                            {isPromptExpanded && (
                                <pre
                                    className="bg-gray-50 dark:bg-gray-700 p-4 mt-2 rounded-md overflow-x-auto text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap break-words">
                                    {generatedPrompt}
                                </pre>
                            )}
                        </div>


                    </div>

                    {/* 🔹 Sidebar: Lab Sources */}
                    <div className="w-72 flex-shrink-0">
                        <LabSources
                            sources={labSources}
                            onToggle={handleLabSourceToggle}
                            useContextOnly={useContextOnly}
                            setUseContextOnly={setUseContextOnly}
                            numSources={numSources}
                            setNumSources={setNumSources}
                            useChunk={useChunk}
                            setUseChunk={setUseChunk}
                        />
                    </div>
                </div>


            </div>

            {/* 🔹 Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Settings</h2>
                            <button onClick={closeSettings} className="text-gray-500 hover:text-gray-700">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="API Key"
                                className="w-full px-4 py-2 text-sm rounded-full border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <input
                                type="text"
                                value={apiUrl}
                                onChange={(e) => setApiUrl(e.target.value)}
                                placeholder="ES URL"
                                className="w-full px-4 py-2 text-sm rounded-full border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            {/* 🔹 Restore Buttons */}
                            <div className="flex justify-between mt-4">
                                <button
                                    onClick={() => {
                                        if (!apiKey || !apiUrl) {
                                            alert("Please enter both an API URL and an API Key.");
                                            return;
                                        }
                                        localStorage.setItem("es_api_key", apiKey);
                                        localStorage.setItem("es_api_url", apiUrl);
                                        alert("✅ Settings saved!");
                                        closeSettings();
                                    }}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={closeSettings}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>


    );
}
