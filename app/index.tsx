import { Redirect } from "expo-router";
import { Checking, SignIn } from "../src/core/SignIn";
import { asRole, landing } from "../src/core/menu";
import { roleAt, useSession } from "../src/core/session";

export default function SignInRoute() {
  const s = useSession();
  if (s.who) {
    /* Each person starts on their own work at the first property they work
       in, else its Dashboard (the web's WORKING_HOME and workingHomeFor, via
       the frame's landing(); roles/r-*-home): housekeeping on Rooms, the
       waiter on Tables, the chef and kitchen manager on the kitchen, the GM,
       the desk, the accountant and revenue on the Dashboard (MRP-1). The
       group's owner starts on All properties (r-owner-home). */
    const first = s.who.hotels[0];
    if (first && !s.who.scope.isGroupAdmin) return <Redirect href={landing(asRole(roleAt(s.who, first.code)), first.code) as never} />;
    return <Redirect href="/all" />;
  }
  /* Firebase is still reading the session it kept: not the form, or it
     flashes before a kept person goes straight in. */
  if (s.starting) return <Checking />;
  return <SignIn onSignIn={s.signIn} onDev={s.signInAs} busy={s.busy} error={s.error} notice={s.notice} />;
}
