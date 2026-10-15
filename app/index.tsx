import { Redirect } from "expo-router";
import { SignIn } from "../src/core/SignIn";
import { useSession } from "../src/core/session";

export default function SignInRoute() {
  const s = useSession();
  if (s.who) return <Redirect href="/all" />;
  return <SignIn onDev={s.signInAs} busy={s.busy} error={s.error} />;
}
