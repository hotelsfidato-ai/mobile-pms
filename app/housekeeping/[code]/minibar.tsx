import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { Minibar } from "../../../src/modules/housekeeping/Minibar";

/* /housekeeping/5EL/minibar - the web's /h/:code/minibar (16 Nov). `room`
   (optional) opens the take for that room, as the board's card will. The
   server says who may record, keep the list and decide (care.ts). */
export default function MinibarRoute() {
  const s = useSession();
  const { code, room } = useLocalSearchParams<{ code: string; room?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Minibar
      key={hotel.code}
      hotel={hotel}
      {...(room ? { room } : {})}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/housekeeping/${hotel.code}`))}
    />
  );
}
