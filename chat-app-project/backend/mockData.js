// mockData.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

// Default initial data
let sessions = [{ id: "session-0", title: "Welcome Chat" }];

let conversations = {
  "session-0": [
    {
      role: "assistant",
      messageBefore: "Welcome! I'm your assistant. How can I help today?",
    },
    {
      role: "assistant",
      messageBefore: "Tip: Try asking for 'table of 7' or 'give 12th table'.",
    },
    {
      role: "assistant",
      messageBefore:
        "You can create, rename, or delete sessions from the sidebar.",
    },
    {
      role: "assistant",
      messageBefore:
        "Example question: 'Show me a short analysis of sales trends'.",
    },
    {
      role: "assistant",
      messageBefore:
        "Need structured data? Ask for tables and I'll return them.",
    },
  ],
};

// Persist data to disk
export async function saveData() {
  try {
    const payload = { sessions, conversations };
    await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save data file", err);
  }
}

// Load data if file exists (synchronous at module init via async IIFE)
(async () => {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.sessions && parsed.conversations) {
      sessions = parsed.sessions;
      conversations = parsed.conversations;
      console.log("Loaded persisted sessions from data.json");
    }
  } catch (err) {
    // No file yet — create one with defaults
    await saveData();
    console.log("Initialized data.json with default sessions");
  }
})();

// Expose getters so other modules can access current memory
export function getSessions() {
  return sessions;
}

export function getConversations() {
  return conversations;
}

// Create new session dynamically. IDs are re-indexed (session-0..session-N)
export const createNewSession = () => {
  const newIdx = sessions.length; // next index
  const newId = `session-${newIdx}`;
  sessions.push({ id: newId, title: `New Chat ${newIdx}` });
  conversations[newId] = [];
  // persist asynchronously
  saveData().catch((e) => console.error("saveData error", e));
  return newId;
};

export const renameSession = (id, title) => {
  const s = sessions.find((x) => x.id === id);
  if (s) {
    s.title = title;
    saveData().catch((e) => console.error("saveData error", e));
    return true;
  }
  return false;
};

export const deleteSession = (id) => {
  const idx = sessions.findIndex((x) => x.id === id);
  if (idx === -1) return false;

  // keep a copy of old conversations
  const oldConversations = { ...conversations };

  // remove session
  sessions.splice(idx, 1);

  // clear conversations object
  Object.keys(conversations).forEach((k) => delete conversations[k]);

  // re-index remaining sessions and rebuild conversations mapping
  const remainingOldIds = sessions.map((s) => s.id);
  sessions.forEach((s, i) => {
    const oldId = remainingOldIds[i];
    const newId = `session-${i}`;
    s.id = newId;
    conversations[newId] = oldConversations[oldId] || [];
  });

  saveData().catch((e) => console.error("saveData error", e));
  return true;
};

// Utility: generate a multiplication table for `n` up to `count` rows
export function generateMultiplicationTable(n = 1, count = 10) {
  const table = [];
  for (let i = 1; i <= count; i++) {
    table.push({ multiplier: i, value: n * i });
  }
  return table;
}

// ----------------------------
// 2. Generate 100 Mock Responses
// ----------------------------

// Example keywords to generate queries
const keywords = [
  "marketing",
  "sales",
  "finance",
  "analysis",
  "growth",
  "budget",
  "team",
  "project",
  "performance",
  "customer",
  "employee",
  "production",
  "research",
  "quality",
  "support",
  "strategy",
  "roadmap",
  "training",
  "statistics",
  "report",
];

// 100 unique mock responses
export const mockResponses = [];

for (let i = 1; i <= 100; i++) {
  const word = keywords[i % keywords.length];
  mockResponses.push({
    id: i,
    keyword: `${word} ${i}`,
    messageBefore: `Here is the structured response for ${word} ${i}.`,
    table: [
      { metric: "Value A", result: `${i * 10}` },
      { metric: "Value B", result: `${i * 5}` },
      { metric: "Value C", result: `${i + 100}` },
    ],
  });
}

// ----------------------------
// 3. Function: Get answer based on user input
// ----------------------------
export const generateMockResponse = (message) => {
  const msg = (message || "").toString().toLowerCase();

  // Try to match a keyword-based response
  const match = mockResponses.find((item) =>
    msg.includes(item.keyword.split(" ")[0])
  );

  if (match) {
    return {
      messageBefore: match.messageBefore || match.message,
      table: match.table,
    };
  }

  // Default fallback if no match
  return {
    messageBefore:
      "No exact match found. Here is a general structured response.",
    table: [
      { metric: "General A", result: "100" },
      { metric: "General B", result: "200" },
    ],
  };
};

// Export live references (for compatibility with existing imports)
export { sessions, conversations };
