import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { Guest } from "../../../../src/modules/guests/Guest";

/* One guest across the group (the web's /crm/guests/:id). */
export default function GuestRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Guest
      key={`${hotel.code}/${id}`}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/guests/${hotel.code}/find`))}
    />
  );
}
