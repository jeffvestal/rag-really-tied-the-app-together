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

const LabSources: React.FC<LabSourcesProps> = ({sources, onToggle}) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64 self-start">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lab Sources</h2>
            <div className="space-y-2">
                {sources.map((source) => (
                    <div key={source.id} className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id={`source-${source.id}`}
                            checked={source.checked}
                            onChange={() => onToggle(source.id)}
                            className="mr-2 w-5 h-5"
                        />
                        <label htmlFor={`source-${source.id}`} className="text-sm text-gray-900 dark:text-gray-300">
                            {source.text}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LabSources;
