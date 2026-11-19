import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Leads } from "../../../src/modules/leads/Leads";

/* Leads and WhatsApp for one property (the web's /h/:code/leads). mobile/m13-sales. */
export default function LeadsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Leads key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
