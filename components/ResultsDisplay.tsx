export default function ResultsDisplay({ results }: { results: any[] }) {
  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div key={result.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">{result.title}</h2>
          <p className="text-gray-600 dark:text-gray-300">{result.content}</p>
        </div>
      ))}
    </div>
  )
}

