import type { FieldValue, Record } from "@/lib/types";

// The single seam between the app and its backend.
//
// Today this is implemented by the in-memory MockAdapter. When Jira access is
// available, JiraAdapter implements the same interface against the Jira Cloud
// REST API, and the rest of the app does not change.
//
// `collection` is a built-in CollectionId or a user-created board's id, so it is
// typed as a plain string.
export interface DataAdapter {
  list(collection: string): Promise<Record[]>;
  create(collection: string, fields: { [key: string]: FieldValue }): Promise<Record>;
  update(collection: string, id: string, fields: { [key: string]: FieldValue }): Promise<Record>;
  remove(collection: string, id: string): Promise<void>;
  // Persist a new row order. `ids` lists records in the desired order; any
  // records not named keep their relative order at the end.
  reorder(collection: string, ids: string[]): Promise<void>;
}
