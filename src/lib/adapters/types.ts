import type { CollectionId, FieldValue, Record } from "@/lib/types";

// The single seam between the app and its backend.
//
// Today this is implemented by the in-memory MockAdapter. When Jira access is
// available, JiraAdapter implements the same interface against the Jira Cloud
// REST API, and the rest of the app does not change.
export interface DataAdapter {
  list(collection: CollectionId): Promise<Record[]>;
  create(collection: CollectionId, fields: { [key: string]: FieldValue }): Promise<Record>;
  update(
    collection: CollectionId,
    id: string,
    fields: { [key: string]: FieldValue }
  ): Promise<Record>;
  remove(collection: CollectionId, id: string): Promise<void>;
}
