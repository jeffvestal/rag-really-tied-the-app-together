"use client"

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ResultItemProps {
  result: {
    id: string;
    title: string;
    main_text: string;
    url_path: string;
    citations: string[];
  };
}

export default function ResultItem({ result }: ResultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const toggleCitations = () => setShowCitations(!showCitations);

  const truncatedContent = result.main_text.slice(0, 250);
  const needsExpansion = result.main_text.length > 250;
  const fullUrl = `https://www.elastic.co${result.url_path}`; // ✅ Ensure full URL

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h2 className="text-lg dark:text-white font-semibold mb-2">{result.title}</h2>

      {/* ✅ Clickable Elastic.co URL */}
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
      >
        {fullUrl}
      </a>

      {/* ✅ Expandable Main Text */}
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
        {isExpanded ? (
          <p dangerouslySetInnerHTML={{ __html: result.main_text }} />
        ) : (
          <>
            <p dangerouslySetInnerHTML={{ __html: truncatedContent }} />
            {needsExpansion && (
              <button
                onClick={toggleExpand}
                className="ml-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="inline w-4 h-4" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="inline w-4 h-4" /> Expand
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ✅ Citations Section */}
      {result.citations.length > 0 && (
        <div className="mt-2">
          <button
            onClick={toggleCitations}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showCitations ? (
              <>
                <ChevronUp className="inline w-4 h-4" /> Hide Citations
              </>
            ) : (
              <>
                <ChevronDown className="inline w-4 h-4" /> Show Citations
              </>
            )}
          </button>

          {showCitations && (
            <ul className="mt-2 pl-5 list-disc text-sm text-gray-600 dark:text-gray-300">
              {result.citations.map((citation, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: citation }} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
