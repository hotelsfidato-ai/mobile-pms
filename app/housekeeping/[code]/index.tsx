import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Rooms } from "../../../src/modules/housekeeping/Rooms";

/* The housekeeping board for one property. A housekeeper may land here
   with nothing behind it: then the way out is Sign out, not All. */
export default function RoomsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Rooms
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      /* GET /api/hotels sends scope.staffId; the core's type has not named it yet. */
      me={(s.who.scope as { staffId?: string }).staffId ?? null}
      {...(router.canGoBack() ? { onBack: () => router.back() } : { onSignOut: s.signOut })}
    />
  );
}
