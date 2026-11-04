import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Approvals } from "../../../src/modules/approvals/Approvals";

/* Approvals for one property (the web's /h/:code/approvals). */
export default function ApprovalsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Approvals hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
