import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Purchasing } from "../../../src/modules/purchasing/Purchasing";

/* Purchasing for one property (the web's /h/:code/purchasing). */
export default function PurchasingRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Purchasing
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`))}
    />
  );
}
