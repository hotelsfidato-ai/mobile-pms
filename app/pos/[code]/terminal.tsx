import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Terminal } from "../../../src/modules/pos/Terminal";

/* /pos/5EL/terminal - the till on a fixed screen (the web's /pos/:code/terminal):
   one outlet, kept on this device; no frame (core menu.ts coversTheFrame), so
   its way out is Console, to the Till, as the web's. */
export default function TerminalRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Terminal hotel={hotel} role={roleAt(s.who, hotel.code)} onConsole={() => router.replace(`/pos/${hotel.code}/till`)} />;
}
