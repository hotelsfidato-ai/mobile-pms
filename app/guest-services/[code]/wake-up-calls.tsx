import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { WakeUpCalls } from "../../../src/modules/guest-services/WakeUpCalls";

/* Wake-up calls for one property (the web's /h/:code/wake-up-calls). */
export default function WakeUpCallsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <WakeUpCalls
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/guest-services/${hotel.code}`))}
    />
  );
}
