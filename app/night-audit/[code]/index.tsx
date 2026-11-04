import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { NightAudit } from "../../../src/modules/night-audit/NightAudit";

/* /night-audit/5EL: the night audit for one property (the web's /h/:code/night-audit). */
export default function NightAuditRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <NightAudit hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
