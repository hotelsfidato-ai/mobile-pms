import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Till } from "../../../src/modules/pos/Till";

/* /pos/5EL/till - the restaurant's Till (the web's /pos/:code/till): the
   orders open and settled today; a row opens the order (/pos/:code/order/:id). */
export default function TillRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Till hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
