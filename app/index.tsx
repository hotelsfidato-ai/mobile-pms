import { Redirect } from "expo-router";
import { Checking, SignIn } from "../src/core/SignIn";
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
    /* The waiter too: Tables (WORKING_HOME pos, slice 3); the chef and the
       kitchen manager: the kitchen (slice 6). */
    if (first && role === "pos") return <Redirect href={`/pos/${first.code}/tables`} />;
    if (first && (role === "chef" || role === "kitchen_manager")) return <Redirect href={`/pos/${first.code}/kitchen`} />;
    return <Redirect href="/all" />;
  }
  /* Firebase is still reading the session it kept: not the form, or it
     flashes before a kept person goes straight in. */
  if (s.starting) return <Checking />;
  return <SignIn onSignIn={s.signIn} onDev={s.signInAs} busy={s.busy} error={s.error} notice={s.notice} />;
}
