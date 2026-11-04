import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { Order } from "../../../../src/modules/pos/OrderScreen";

/* /pos/5EL/order/<id> - one order, opened from Tables (the web's Eye) or after a round is sent. */
export default function OrderRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Order
      key={id} hotel={hotel} id={id} role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/pos/${hotel.code}/tables`))}
    />
  );
}
