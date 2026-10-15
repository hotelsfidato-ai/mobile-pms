import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { OutOfService } from "../../../src/modules/housekeeping/OutOfService";

/* /housekeeping/5EL/out-of-service?room=204 — opened from the Rooms card. */
export default function OutOfServiceRoute() {
  const s = useSession();
  const { code, room } = useLocalSearchParams<{ code: string; room?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <OutOfService
      hotel={hotel}
      room={room ?? ""}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/housekeeping/${hotel.code}`))}
    />
  );
}
