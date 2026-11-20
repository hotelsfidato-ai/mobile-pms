import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { WhoMayAsk } from "../../../src/modules/purchasing/WhoMayAsk";

/* Who may ask to buy, for one property (the web's /h/:code/purchasing/who-may-ask). */
export default function WhoMayAskRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <WhoMayAsk
      key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/purchasing/${hotel.code}`))}
    />
  );
}
