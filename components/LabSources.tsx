import type React from "react";

interface LabSource {
    id: number;
    text: string;
    checked: boolean;
}

interface LabSourcesProps {
    sources: LabSource[];
    onToggle: (id: number) => void;
}

const LabSources: React.FC<LabSourcesProps> = ({
  sources,
  onToggle,
  useContextOnly,
  setUseContextOnly,
  numSources,
  setNumSources,
  useChunk,
  setUseChunk
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72 self-start">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lab Sources</h2>

      {/* 🔹 Source Checkboxes */}
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`source-${source.id}`}
              checked={source.checked}
              onChange={() => onToggle(source.id)}
              className="w-5 h-5"
            />
            <label htmlFor={`source-${source.id}`} className="text-sm text-gray-900 dark:text-gray-300">
              {source.text}
            </label>
          </div>
        ))}
      </div>

      {/* 🔹 Answer Source */}
      <h3 className="mt-4 text-md font-semibold text-gray-900 dark:text-white">Answer Source</h3>
      <div className="flex items-center space-x-2 mt-1">
        <input
          type="checkbox"
          id="contextOnly"
          checked={useContextOnly}
          onChange={() => setUseContextOnly(!useContextOnly)}
          className="w-5 h-5"
        />
        <label htmlFor="contextOnly" className="text-sm text-gray-900 dark:text-gray-300">
          Context Only
        </label>
      </div>

      {/* 🔹 Number of Sources */}
      <h3 className="mt-4 text-md font-semibold text-gray-900 dark:text-white">Number of Sources</h3>
      <input
        type="number"
        min="1"
        max="10"
        value={numSources}
        onChange={(e) => setNumSources(parseInt(e.target.value) || 1)}
        className="w-16 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />

      {/* 🔹 Chunk or Doc Toggle */}
      <h3 className="mt-4 text-md font-semibold text-gray-900 dark:text-white">Chunk or Doc</h3>
      <div className="flex items-center space-x-4 mt-1">
        <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-gray-300">
          <input
            type="radio"
            name="chunkOrDoc"
            checked={useChunk}
            onChange={() => setUseChunk(true)}
            className="w-5 h-5"
          />
          <span>Chunk</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-gray-300">
          <input
            type="radio"
            name="chunkOrDoc"
            checked={!useChunk}
            onChange={() => setUseChunk(false)}
            className="w-5 h-5"
          />
          <span>Doc</span>
        </label>
      </div>
    </div>
  );
};


export default LabSources;
