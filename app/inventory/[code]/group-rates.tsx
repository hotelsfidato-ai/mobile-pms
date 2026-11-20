import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { GroupRates } from "../../../src/modules/inventory/GroupRates";

/* /inventory/5EL/group-rates — Group rate change, the web's /group-rates
   (Across properties; new in the 16 Nov release). Above any one hotel: the
   code only places the frame. */
export default function GroupRatesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <GroupRates hotel={hotel} role={roleAt(s.who, hotel.code)} who={s.who} />;
}
