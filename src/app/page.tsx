import Workspace from "./Workspace";
import SignIn from "./SignIn";
import { VIEWS } from "@/lib/views";
import { getIdentity, devLoginEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const adapter = (process.env.DATA_ADAPTER ?? "mock").toLowerCase();
  const me = await getIdentity();

  // Okta is on but nobody is signed in -> show the sign-in screen.
  if (me.viaOkta && !me.signedIn) return <SignIn />;

  return (
    <Workspace
      views={VIEWS}
      adapter={adapter}
      me={{ id: me.id, name: me.name, role: me.role, perms: me.perms }}
      devLogin={devLoginEnabled() && !me.viaOkta}
      oktaAuth={me.viaOkta}
    />
  );
}
