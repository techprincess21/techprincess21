import Workspace from "./Workspace";
import SignIn from "./SignIn";
import { VIEWS } from "@/lib/views";
import { getIdentity, devLoginEnabled } from "@/lib/auth";
import { notifyConfigured } from "@/lib/notify";
import { storageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const adapter = (process.env.DATA_ADAPTER ?? "mock").toLowerCase();
  const me = await getIdentity();

  // Okta is on but nobody is signed in -> show the sign-in screen.
  if (me.viaOkta && !me.signedIn) return <SignIn />;

  // Durability signal for the admin banner: in a deployed (production) context
  // without KV, every config write — added users, role changes, audit entries —
  // is silently dropped on cold start. Surface that loudly instead.
  const storageEphemeral = process.env.NODE_ENV === "production" && storageMode() !== "kv";

  return (
    <Workspace
      views={VIEWS}
      adapter={adapter}
      me={{ id: me.id, name: me.name, role: me.role, perms: me.perms }}
      devLogin={devLoginEnabled() && !me.viaOkta}
      oktaAuth={me.viaOkta}
      slackConfigured={notifyConfigured()}
      storageEphemeral={storageEphemeral}
    />
  );
}
