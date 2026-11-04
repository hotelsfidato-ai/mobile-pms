import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { StayScreen } from "../../../../src/modules/front-desk/Stay";

/* /front-desk/5EL/stay/<booking id>?offer=1: the web's stay panel. `offer`
   is the list's offerCheckIn: Arrivals' Today and Walk-ins offer Check in. */
export default function StayRoute() {
  const s = useSession();
  const { code, id, offer } = useLocalSearchParams<{ code: string; id: string; offer?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <StayScreen
      hotel={hotel} role={roleAt(s.who, hotel.code)} id={id} offer={offer === "1"}
      onClose={() => (router.canGoBack() ? router.back() : router.replace(`/front-desk/${hotel.code}`))}
    />
  );
}
