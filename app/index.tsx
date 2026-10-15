import { Redirect } from "expo-router";
import { SignIn } from "../src/core/SignIn";
import { roleAt, useSession } from "../src/core/session";

export default function SignInRoute() {
  const s = useSession();
  if (s.who) {
    /* Housekeeping and the waiter have no Dashboard (it carries revenue; the
       owner, 15 September): their first screen is their own work, at the first
       property they work in (the web's WORKING_HOME, src/components/app/navigation.ts). */
    const first = s.who.hotels[0];
    const role = first ? roleAt(s.who, first.code) : null;
    if (first && role === "housekeeping") return <Redirect href={`/housekeeping/${first.code}`} />;
    /* The waiter too: Tables (WORKING_HOME pos, slice 3). */
    if (first && role === "pos") return <Redirect href={`/pos/${first.code}/tables`} />;
    return <Redirect href="/all" />;
  }
  return <SignIn onDev={s.signInAs} busy={s.busy} error={s.error} />;
}
