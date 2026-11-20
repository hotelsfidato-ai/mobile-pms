import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Folios } from "../../../src/modules/finance/Folios";

/* Folios for one property (the web's /h/:code/folios): every open bill. */
export default function FoliosRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Folios hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
