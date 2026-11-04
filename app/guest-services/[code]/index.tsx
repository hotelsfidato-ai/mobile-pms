import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Hub } from "../../../src/modules/guest-services/Hub";

/* The way in to guest services for one property; opened from the Dashboard. */
export default function GuestServicesRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Hub
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`))}
      onOpen={(path) => router.push(`/guest-services/${hotel.code}/${path}`)}
    />
  );
}
