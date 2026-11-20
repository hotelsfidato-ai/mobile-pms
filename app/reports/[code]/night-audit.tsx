import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { NightAuditReport } from "../../../src/modules/reports/OpsReport";

/* /reports/5EL/night-audit: Night audit report for one property (the web's /reports/night-audit). */
export default function Route() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <NightAuditReport hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
