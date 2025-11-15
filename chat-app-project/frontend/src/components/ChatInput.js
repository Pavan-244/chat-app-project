import { useState } from "react";

export default function ChatInput({ sendMessage }) {
  const [text, setText] = useState("");

  const handleSend = (e) => {
    e?.preventDefault?.();
    if (!text.trim()) return;
    sendMessage(text);
    setText("");
  };

  return (
    <form onSubmit={handleSend} className="p-4 border-t dark:border-gray-700">
      <div className="relative">
        {/* left plus button inside the pill */}
        <button
          type="button"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-lg"
          aria-label="new"
          onClick={() => {
            // could open attachments or quick actions later
          }}
        >
          +
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-full py-4 pl-14 pr-28 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Ask anything"
        />

        {/* right side: mic, waveform, send */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"
            aria-label="voice"
            onClick={() => {
              // placeholder for voice recording
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-600 dark:text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 1v11m0 0a3 3 0 0 0 3-3V4a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 0 1-14 0"
              />
            </svg>
          </button>

          <button
            type="button"
            className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"
            aria-label="wave"
            onClick={() => {}}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-600 dark:text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2 12h2m4 0h2m4 0h2m4 0h2"
              />
            </svg>
          </button>

          <button
            type="submit"
            className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow"
            aria-label="send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2.94 2.94a1 1 0 011.06-.21l14 7a1 1 0 010 1.82l-14 7A1 1 0 012 18.82V3.18a1 1 0 01.94-.24z" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
