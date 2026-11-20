import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Marketing } from "../../../src/modules/marketing/Marketing";

/* Marketing for one property (the web's /h/:code/marketing). mobile/m13-sales. */
export default function MarketingRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Marketing key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
