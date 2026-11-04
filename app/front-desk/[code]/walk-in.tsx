import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { WalkIn } from "../../../src/modules/front-desk/WalkIn";

/* /front-desk/5EL/walk-in?room=306: New booking opened from an empty room, tonight. */
export default function WalkInRoute() {
  const s = useSession();
  const { code, room } = useLocalSearchParams<{ code: string; room?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <WalkIn
      hotel={hotel} role={roleAt(s.who, hotel.code)} room={room ?? ""}
      onClose={() => (router.canGoBack() ? router.back() : router.replace(`/front-desk/${hotel.code}/walk-ins`))}
    />
  );
}
