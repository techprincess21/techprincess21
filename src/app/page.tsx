import Workspace from "./Workspace";
import { VIEWS } from "@/lib/views";
import { getCurrentUser, getPermissions, devLoginEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const adapter = (process.env.DATA_ADAPTER ?? "mock").toLowerCase();
  const user = getCurrentUser();
  const { role, perms } = await getPermissions(user.id);
  return (
    <Workspace
      views={VIEWS}
      adapter={adapter}
      me={{ id: user.id, name: user.name, role, perms }}
      devLogin={devLoginEnabled()}
    />
  );
}
