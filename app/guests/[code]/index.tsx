import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Guests } from "../../../src/modules/guests/Guests";

/* Everyone who has stayed at one property, by name (the web's /guests, read
   for the property in view). */
export default function GuestsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Guests key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
