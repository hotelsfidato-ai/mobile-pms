import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { CheckInScreen } from "../../../../src/modules/front-desk/CheckIn";

/* /front-desk/5EL/check-in/<booking id>: the web's check-in dialog. */
export default function CheckInRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <CheckInScreen
      hotel={hotel} role={roleAt(s.who, hotel.code)} id={id}
      onClose={() => (router.canGoBack() ? router.back() : router.replace(`/front-desk/${hotel.code}`))}
    />
  );
}
