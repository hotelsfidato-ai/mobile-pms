import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { ConnectionHealth } from "../../../src/modules/guest-messaging/ConnectionHealth";

/* /connections/5EL: every outside connection's health for one property (the web's
   /settings/connections/connection-health, for the property in the top bar). */
export default function ConnectionHealthRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <ConnectionHealth hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
