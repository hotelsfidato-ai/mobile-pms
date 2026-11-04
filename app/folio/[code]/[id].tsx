import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { FolioScreen } from "../../../src/modules/finance/Folio";

/* /folio/5EL/<stay id> — a stay's bill: opened from arrivals, in house and
   due out (the desk's screens link here). */
export default function FolioRoute() {
  const s = useSession();
  const { code, stayId } = useLocalSearchParams<{ code: string; stayId: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const out = () => (router.canGoBack() ? router.back() : router.replace(`/front-desk/${hotel.code}/in-house`));
  return <FolioScreen hotel={hotel} stayId={stayId} role={roleAt(s.who, hotel.code)} onBack={out} onLeft={out} />;
}
