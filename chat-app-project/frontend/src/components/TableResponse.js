export default function TableResponse({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-2 text-sm text-gray-600 dark:text-gray-300">
        No tabular data to display.
      </div>
    );
  }

  const keys = Object.keys(data[0] || {});

  return (
    <table className="border-collapse w-full mt-2">
      <thead>
        <tr>
          {keys.map((key, i) => (
            <th
              key={i}
              className="border p-2 bg-gray-200 dark:bg-gray-700 dark:text-white"
            >
              {key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {keys.map((k, j) => (
              <td
                key={j}
                className="border p-2 dark:text-white dark:border-gray-600"
              >
                {row[k]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
