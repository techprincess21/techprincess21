import type { DataAdapter } from "./types";
import { MockAdapter } from "./mock";
import { JiraAdapter } from "./jira";

// Single place that decides which backend is live. Flip DATA_ADAPTER=jira
// (with the JIRA_* env vars set) to move off mock data without touching the
// API routes or UI.

let instance: DataAdapter | null = null;

export function getAdapter(): DataAdapter {
  if (instance) return instance;
  const which = (process.env.DATA_ADAPTER ?? "mock").toLowerCase();
  instance = which === "jira" ? new JiraAdapter() : new MockAdapter();
  return instance;
}

export type { DataAdapter };
