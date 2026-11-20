import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Contracts } from "../../../src/modules/contracts/Contracts";

/* Contracts at one property (the web's /contracts, read for the property in view). mobile/m13-sales. */
export default function ContractsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Contracts key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
