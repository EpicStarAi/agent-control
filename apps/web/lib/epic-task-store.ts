// Shared in-memory task store for operator task tracking.
// Singleton persists across requests in the same Next.js worker.
// Replace with DB/Redis in production.
const taskStore = new Map<string, unknown>();

export { taskStore };
