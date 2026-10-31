import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { OnlineCheckin } from "../../../src/modules/guest-services/OnlineCheckin";

/* Online check-in, the desk's side (the web's /h/:code/online-checkin). */
export default function OnlineCheckinRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <OnlineCheckin
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/guest-services/${hotel.code}`))}
    />
  );
}
