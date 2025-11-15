// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Lightweight fetch mock used by tests (avoids adding MSW dependency)
const apiUrl = "http://localhost:5000";

let sessions = [
  { id: "session-0", title: "Default Session" },
  { id: "session-1", title: "Second Session" },
];

// Reset sessions before each test to avoid cross-test pollution
beforeEach(() => {
  sessions = [
    { id: "session-0", title: "Default Session" },
    { id: "session-1", title: "Second Session" },
  ];
});

async function handleRequest(input, init = {}) {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();

  // helper to create a minimal response-like object
  const makeResponse = (obj, status = 200) => {
    const body = typeof obj === "string" ? obj : JSON.stringify(obj);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => (typeof obj === "string" ? JSON.parse(body) : obj),
      text: async () => body,
    };
  };

  // only intercept our API (accept both absolute and relative /api/ paths)
  if (url && (url.startsWith(`${apiUrl}/api/`) || url.startsWith(`/api/`))) {
    const path = url.startsWith(`${apiUrl}/api/`)
      ? url.substring((apiUrl + "/api").length)
      : url.substring("/api".length);

    if (method === "GET" && path === "/sessions") {
      // return a shallow copy so consumers receive a new reference
      return makeResponse(
        sessions.map((s) => ({ ...s })),
        200
      );
    }

    if (method === "GET" && path === "/new-chat") {
      const id = `session-${sessions.length}`;
      const newSession = { id, title: `Session ${sessions.length}` };
      sessions.push(newSession);
      return makeResponse({ sessionId: id }, 200);
    }

    const sessionMatch = path.match(/^\/session\/(.+)$/);
    if (method === "GET" && sessionMatch) {
      const id = sessionMatch[1];
      const found = sessions.find((s) => s.id === id);
      if (!found) return makeResponse({ error: "Not found" }, 404);
      // return empty history by default
      return makeResponse([], 200);
    }

    const chatMatch = path.match(/^\/chat\/(.+)$/);
    if (method === "POST" && chatMatch) {
      const id = chatMatch[1];
      const found = sessions.find((s) => s.id === id);
      if (!found) return makeResponse({ error: "Unknown session" }, 404);
      const bodyText = init.body || "";
      let body = {};
      try {
        body = JSON.parse(bodyText);
      } catch (e) {}
      const message = body.message || "";
      if (/table|times|multiply/i.test(message)) {
        const nMatch = message.match(/(\d+)/);
        const base = nMatch ? parseInt(nMatch[1], 10) : 7;
        const table = Array.from({ length: 7 }, (_, i) => ({
          n: i + 1,
          value: base * (i + 1),
        }));
        return makeResponse(
          { role: "assistant", message: `Table of ${base}`, table },
          200
        );
      }
      return makeResponse(
        { role: "assistant", message: `Echo: ${message}` },
        200
      );
    }

    if (method === "PUT" && sessionMatch) {
      const id = sessionMatch[1];
      let body = {};
      try {
        body = JSON.parse(init.body || "{}");
      } catch (e) {}
      const idx = sessions.findIndex((s) => s.id === id);
      if (idx === -1) return makeResponse({ error: "Not found" }, 404);
      sessions[idx].title = body.title || sessions[idx].title;
      return makeResponse(sessions[idx], 200);
    }

    if (method === "DELETE" && sessionMatch) {
      const id = sessionMatch[1];
      const idx = sessions.findIndex((s) => s.id === id);
      if (idx === -1) return makeResponse({ error: "Not found" }, 404);
      sessions.splice(idx, 1);
      sessions = sessions.map((s, i) => ({
        id: `session-${i}`,
        title: s.title,
      }));
      return makeResponse({ success: true }, 200);
    }
  }

  // fallback to real fetch if not our API
  if (typeof global.originalFetch === "function") {
    return global.originalFetch(input, init);
  }
  return makeResponse({ error: "no fetch available" }, 500);
}

if (!global.originalFetch) {
  global.originalFetch = global.fetch;
}

// Use a plain function wrapper for fetch so Jest's mock reset doesn't remove our
// implementation between files/runs. It delegates to the async handler above.
global.fetch = (input, init) => handleRequest(input, init);
