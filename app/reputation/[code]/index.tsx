import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Reviews } from "../../../src/modules/reputation/Reviews";

/* Reviews for one property (the web's /h/:code/reviews). */
export default function ReviewsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Reviews key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
