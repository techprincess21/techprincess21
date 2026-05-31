import type { CollectionId, FieldValue, Record } from "@/lib/types";
import type { DataAdapter } from "./types";

// Jira Cloud adapter — NOT YET ACTIVE.
//
// This is the real backend we'll switch to once IT confirms access. It
// implements the exact same DataAdapter interface as MockAdapter, so flipping
// DATA_ADAPTER=jira is the only change the rest of the app needs.
//
// To activate, set these environment variables (e.g. in .env.local):
//   DATA_ADAPTER=jira
//   JIRA_BASE_URL=https://taktak.atlassian.net
//   JIRA_EMAIL=you@cribl.io
//   JIRA_API_TOKEN=<token from id.atlassian.com/manage-profile/security/api-tokens>
//   JIRA_PROJECT_KEY=WEB
//
// FIELD MAPPING (app field  ->  Jira field)
// -----------------------------------------------------------------------------
//   targetPrompt    -> summary
//   keyword         -> custom field (e.g. customfield_XXXXX "Keyword")
//   stage           -> workflow status (transition, not a plain field write)
//   owner           -> assignee (accountId; resolve display name -> account)
//   type/format     -> labels or custom select fields
//   quarter         -> custom field or fixVersion / sprint
//   priorityLevel   -> priority
//   publishedUrl    -> custom field (URL type)
//   jiraKey         -> the issue key itself (read-only)
//
// The trickiest mappings are (a) `stage`, which must go through the issue's
// available transitions rather than a field PUT, and (b) `owner`, which needs a
// display-name -> accountId lookup. We'll resolve the exact customfield IDs by
// calling GET /rest/api/3/field against the live instance.

const NOT_READY =
  "JiraAdapter is not active yet. Set DATA_ADAPTER=jira plus JIRA_* env vars once IT confirms access. See src/lib/adapters/jira.ts for the field mapping.";

export class JiraAdapter implements DataAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async list(_collection: CollectionId): Promise<Record[]> {
    // Planned: JQL search via POST /rest/api/3/search, then map issue fields
    // back into our generic `fields` shape using the mapping above.
    throw new Error(NOT_READY);
  }

  async create(
    _collection: CollectionId,
    _fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    // Planned: POST /rest/api/3/issue with project=JIRA_PROJECT_KEY.
    throw new Error(NOT_READY);
  }

  async update(
    _collection: CollectionId,
    _id: string,
    _fields: { [key: string]: FieldValue }
  ): Promise<Record> {
    // Planned: PUT /rest/api/3/issue/{key} for field edits, and
    // POST /rest/api/3/issue/{key}/transitions for `stage` changes.
    throw new Error(NOT_READY);
  }

  async remove(_collection: CollectionId, _id: string): Promise<void> {
    // Planned: DELETE /rest/api/3/issue/{key} (or transition to a closed state).
    throw new Error(NOT_READY);
  }
}
