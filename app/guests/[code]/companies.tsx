import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Companies } from "../../../src/modules/guests/Companies";

/* Where the business came from, at one property (the web's /companies, read
   for the property in view). */
export default function CompaniesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Companies key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
