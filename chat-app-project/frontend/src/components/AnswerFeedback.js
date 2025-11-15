import { useState, useEffect } from "react";

export default function AnswerFeedback({
  sessionId,
  messageIndex,
  initialFeedback = null,
}) {
  // initialize from persisted feedback when available
  const [liked, setLiked] = useState(initialFeedback === "like");
  const [disliked, setDisliked] = useState(initialFeedback === "dislike");
  const [loading, setLoading] = useState(false);

  // Update local state if parent provides a different initialFeedback later
  // (e.g., when messages are refreshed from the server)
  useEffect(() => {
    setLiked(initialFeedback === "like");
    setDisliked(initialFeedback === "dislike");
  }, [initialFeedback]);

  const sendFeedback = async (value) => {
    if (!sessionId || typeof messageIndex !== "number") {
      // nothing to persist
      if (value === "like") setLiked(true);
      if (value === "dislike") setDisliked(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/feedback/${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIndex, feedback: value }),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Status ${res.status}`);
      }

      // optimistic UI already applied, server confirmed
      const data = await res.json();
      // server confirmed; no-op
      console.log("Feedback saved", data);
    } catch (e) {
      console.error("Failed to save feedback", e);
      // do not revert UI, but notify console — could add toast later
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    if (disliked && next) setDisliked(false);
    sendFeedback(next ? "like" : "none");
  };

  const toggleDislike = () => {
    const next = !disliked;
    setDisliked(next);
    if (liked && next) setLiked(false);
    sendFeedback(next ? "dislike" : "none");
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={toggleLike}
        aria-label="like"
        disabled={loading}
        className={`px-2 py-1 rounded ${
          liked ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        👍
      </button>

      <button
        onClick={toggleDislike}
        aria-label="dislike"
        disabled={loading}
        className={`px-2 py-1 rounded ${
          disliked ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        👎
      </button>
    </div>
  );
}
