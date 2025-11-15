import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import ChatInput from "./ChatInput";
import TableResponse from "./TableResponse";
import AnswerFeedback from "./AnswerFeedback";

export default function ChatWindow(props) {
  const params = useParams();
  // allow explicit prop override or route param
  const sessionId = props.sessionId || params.sessionId || "session-0";
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`http://localhost:5000/api/session/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data || []))
      .catch(() => setMessages([]));

    // also fetch session title from sessions list
    fetch("http://localhost:5000/api/sessions")
      .then((res) => res.json())
      .then((list) => {
        const s = list.find((x) => x.id === sessionId);
        setTitle(s ? s.title : sessionId);
      })
      .catch(() => setTitle(sessionId));
  }, [sessionId]);

  useEffect(() => {
    // scroll to bottom when messages change
    try {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    } catch (e) {}
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;

    // optimistically add user message
    setMessages((prev) => [...prev, { role: "user", message: text }]);

    try {
      const res = await fetch(`http://localhost:5000/api/chat/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => null);
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const reply = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: reply.message, table: reply.table },
      ]);
    } catch (e) {
      // avoid dumping full HTML error pages into the chat UI
      const raw = e?.message || "";
      if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
        console.error("Server returned HTML error page:", raw);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            message:
              "Error: failed to get response - server error (see console)",
          },
        ]);
      } else {
        const errMsg = raw
          ? `Error: failed to get response - ${raw}`
          : "Error: failed to get response";
        console.error("Chat request failed:", e);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", message: errMsg },
        ]);
      }
    }
  };

  const isWelcome = !params.sessionId && !props.sessionId; // treat root as welcome

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b dark:border-gray-700 text-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {isWelcome ? "What are you working on?" : title || "Chat"}
        </h2>
        {!isWelcome && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Session: {sessionId}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className={`flex-1 overflow-y-auto p-3 ${
            isWelcome ? "" : "space-y-4"
          }`}
          ref={containerRef}
        >
          {messages.length === 0 && (
            <div className="text-gray-600 dark:text-gray-300 text-center">
              {isWelcome
                ? "Say hi — start the conversation."
                : "No messages yet — ask something!"}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="w-full flex flex-col space-y-2 py-1">
              <div
                className={`w-full flex ${
                  msg.role === "assistant" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-3/4 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <p className="text-sm font-semibold text-blue-600">YOU</p>
                    <p className="text-gray-700 dark:text-gray-200">
                      {msg.message}
                    </p>
                  </div>
                ) : (
                  (() => {
                    // Support either legacy `message` string or new structured
                    // `messageBefore` / `messageAfter` fields (or nested `message.before`).
                    const beforeText =
                      msg.messageBefore ??
                      (typeof msg.message === "string"
                        ? msg.message
                        : msg.message?.before ?? null);

                    return (
                      <div className="max-w-3/4 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm text-right">
                        <p className="text-sm font-semibold text-green-600">
                          ASSISTANT
                        </p>
                        {beforeText && (
                          <p className="text-gray-700 dark:text-gray-200">
                            {beforeText}
                          </p>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {msg.table && (
                <div
                  className={`${
                    msg.role === "assistant"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }`}
                >
                  <div className="w-full max-w-3/4">
                    <TableResponse data={msg.table} />
                  </div>
                </div>
              )}

              {/* Render trailing assistant text (after the table) if present */}
              {msg.role === "assistant" &&
                (msg.messageAfter ||
                  (typeof msg.message === "object" && msg.message?.after)) && (
                  <div
                    className={`w-full ${
                      msg.table ? "flex justify-end" : "flex justify-end"
                    }`}
                  >
                    <div className="max-w-3/4">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm text-right">
                        <p className="text-gray-700 dark:text-gray-200">
                          {msg.messageAfter ?? msg.message?.after}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {msg.role === "assistant" && (
                <div
                  className={`w-full ${
                    msg.table ? "flex justify-end" : "flex justify-end"
                  }`}
                >
                  <div className="max-w-3/4">
                    <AnswerFeedback
                      sessionId={sessionId}
                      messageIndex={i}
                      initialFeedback={msg.feedback ? msg.feedback.type : null}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t dark:border-gray-700">
          <ChatInput sendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
}
