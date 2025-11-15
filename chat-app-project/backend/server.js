import express from "express";
import cors from "cors";
import {
  sessions,
  conversations,
  generateMultiplicationTable,
  createNewSession,
  renameSession,
  deleteSession,
  saveData,
} from "./mockData.js";

const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger to aid debugging
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// lightweight health check
app.get("/ping", (req, res) => {
  res.json({ ok: true, now: Date.now() });
});

// helper to safely push into conversations mapping
function pushConversation(sessionId, item) {
  try {
    if (!sessionId) {
      console.warn("pushConversation called with empty sessionId", { item });
      return;
    }

    const cur = conversations[sessionId];
    if (!cur || !Array.isArray(cur)) {
      // attempt to initialize
      conversations[sessionId] = [];
    }

    if (!conversations[sessionId] || !Array.isArray(conversations[sessionId])) {
      console.error(
        "pushConversation: conversations[sessionId] is not an array after init",
        { sessionId, current: conversations[sessionId] }
      );
      return;
    }

    conversations[sessionId].push(item);
    // persist the change asynchronously
    try {
      if (typeof saveData === "function")
        saveData().catch((e) => console.error(e));
    } catch (e) {
      console.error("saveData invocation error", e);
    }
  } catch (err) {
    console.error("pushConversation error", { sessionId, item, err });
  }
}

// ---- GET ALL SESSIONS ----
app.get("/api/sessions", (req, res) => {
  res.json(sessions);
});

// ---- GENERATE NEW CHAT SESSION ----
app.get("/api/new-chat", (req, res) => {
  const newId = createNewSession();
  res.json({ sessionId: newId });
});

// ---- RENAME SESSION ----
app.put("/api/session/:id", (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });
  const ok = renameSession(id, title);
  if (!ok) return res.status(404).json({ error: "Session not found" });
  res.json({ id, title });
});

// ---- DELETE SESSION ----
app.delete("/api/session/:id", (req, res) => {
  const { id } = req.params;
  const ok = deleteSession(id);
  if (!ok) return res.status(404).json({ error: "Session not found" });
  res.json({ success: true });
});

// ---- GET CONVERSATION HISTORY ----
app.get("/api/session/:id", (req, res) => {
  const { id } = req.params;
  res.json(conversations[id] || []);
});

// ---- POST NEW MESSAGE + RETURN MOCK STRUCTURED RESPONSE ----
app.post("/api/chat/:id", (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  // simple parser: if user asks for an Nth/table of N (e.g. "give 20th table" or "table of 20")
  try {
    // validate session id
    if (!id) {
      return res.status(400).json({ error: "Missing session id in path" });
    }

    // ensure conversations is an object and conversations[id] is an array
    if (!conversations[id] || !Array.isArray(conversations[id])) {
      conversations[id] = [];
    }

    // debug log for incoming chat
    console.log(
      `/api/chat received - id=${id} message=${
        typeof message === "string" ? message : JSON.stringify(message)
      }`
    );

    // now continue parsing
    let n = null;
    if (message) {
      const m1 = message.toString().match(/table of\s*([0-9]+)/i);
      const m2 = message.toString().match(/([0-9]+)(?:st|nd|rd|th)?\s+table/i);
      const m3 = message.toString().match(/^\s*([0-9]+)\s*$/);
      const m4 = message.toString().match(/give\s+([0-9]+)(?:st|nd|rd|th)?/i);
      n =
        (m1 && parseInt(m1[1], 10)) ||
        (m2 && parseInt(m2[1], 10)) ||
        (m3 && parseInt(m3[1], 10)) ||
        (m4 && parseInt(m4[1], 10));
    }

    if (n) {
      const tableData = generateMultiplicationTable(n, 10);
      const reply = {
        role: "assistant",
        messageBefore: `Here is the multiplication table for ${n}`,
        messageAfter: `Let me know if you want more details or a different range.`,
        table: tableData,
      };

      // respond without persisting to avoid intermittent push errors
      try {
        if (
          conversations &&
          conversations[id] &&
          Array.isArray(conversations[id])
        ) {
          pushConversation(id, { role: "user", message });
          pushConversation(id, reply);
        }
      } catch (e) {
        console.error("Non-fatal: failed to persist conversation", e);
      }

      return res.json(reply);
    }

    // fallback mock reply
    const mockReply = {
      role: "assistant",
      messageBefore: `Mock response for: ${message}`,
      messageAfter: `Additional context: this is sample trailing text after the table.`,
      table: [
        { column1: "Row 1", column2: "Value 1" },
        { column1: "Row 2", column2: "Value 2" },
      ],
    };

    // respond without persisting to avoid intermittent push errors
    try {
      if (
        conversations &&
        conversations[id] &&
        Array.isArray(conversations[id])
      ) {
        pushConversation(id, { role: "user", message });
        pushConversation(id, mockReply);
      }
    } catch (e) {
      console.error("Non-fatal: failed to persist conversation", e);
    }

    return res.json(mockReply);
  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---- POST FEEDBACK FOR A MESSAGE ----
app.post("/api/feedback/:id", (req, res) => {
  const { id } = req.params; // session id
  const { messageIndex, feedback } = req.body; // feedback: 'like' | 'dislike' | 'none'

  if (!id) return res.status(400).json({ error: "Missing session id" });
  if (typeof messageIndex !== "number")
    return res.status(400).json({ error: "Missing or invalid messageIndex" });
  if (!["like", "dislike", "none"].includes(feedback))
    return res.status(400).json({ error: "Invalid feedback value" });

  const conv = conversations[id];
  if (!conv || !Array.isArray(conv))
    return res.status(404).json({ error: "Session not found" });

  if (messageIndex < 0 || messageIndex >= conv.length)
    return res.status(400).json({ error: "messageIndex out of range" });

  try {
    const msg = conv[messageIndex];
    if (!msg || msg.role !== "assistant") {
      return res
        .status(400)
        .json({ error: "Feedback can only be applied to assistant messages" });
    }

    // attach or update feedback on the message
    msg.feedback =
      feedback === "none" ? null : { type: feedback, at: Date.now() };

    return res.json({ success: true, messageIndex, feedback: msg.feedback });
  } catch (err) {
    console.error("/api/feedback error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(5000, () => console.log("Backend running on http://localhost:5000"));
