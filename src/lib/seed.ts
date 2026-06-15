import type { CollectionId, Record } from "@/lib/types";

// The app starts empty — boards are populated by real use (and, once the Jira
// adapter is live, by Jira). Each collection seeds as an empty list.
export const SEED: { [K in CollectionId]: Record[] } = {
  content: [],
  launch: [],
  tickets: [],
  okr: [],
  quarterPlan: [],
  topicOwners: [],
};
