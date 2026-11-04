import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { FolioScreen } from "../../../src/modules/finance/Folio";

/* /folio/5EL/<stay id> — a stay's bill: opened from arrivals, in house and
   due out (the desk's screens link here). The parameter is `[id]`, lower
   case: the gate's route check reads only lower-case names (MFIN-3, MFD-1);
   the address is the same /folio/<code>/<stay id> every link builds. */
export default function FolioRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const out = () => (router.canGoBack() ? router.back() : router.replace(`/front-desk/${hotel.code}/in-house`));
  return <FolioScreen hotel={hotel} stayId={id} role={roleAt(s.who, hotel.code)} onBack={out} onLeft={out} />;
}
