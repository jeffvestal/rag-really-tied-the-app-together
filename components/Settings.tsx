export default function Settings({
  apiKey,
  setApiKey,
  apiUrl,
  setApiUrl,
}: {
  apiKey: string
  setApiKey: (key: string) => void
  apiUrl: string
  setApiUrl: (url: string) => void
}) {
  return (
    <div className="flex space-x-2">
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API Key"
        className="px-2 py-1 rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />
      <input
        type="text"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        placeholder="API URL"
        className="px-2 py-1 rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />
    </div>
  )
}

