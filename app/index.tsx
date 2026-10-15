import { Redirect } from "expo-router";
import { SignIn } from "../src/core/SignIn";
import { roleAt, useSession } from "../src/core/session";

export default function SignInRoute() {
  const s = useSession();
  if (s.who) {
    /* Housekeeping has no Dashboard (it carries revenue; the owner, 15
       September): its first screen is its own board, at the first property
       it works in (the web's WORKING_HOME, src/components/app/navigation.ts). */
    const first = s.who.hotels[0];
    if (first && roleAt(s.who, first.code) === "housekeeping") return <Redirect href={`/housekeeping/${first.code}`} />;
    return <Redirect href="/all" />;
  }
  return <SignIn onDev={s.signInAs} busy={s.busy} error={s.error} />;
}
