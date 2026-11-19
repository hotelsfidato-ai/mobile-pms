import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { Checklists } from "../../../src/modules/housekeeping/Checklists";

/* /housekeeping/5EL/checklists - the web's /h/:code/checklists (16 Nov). The server says who keeps them (care.ts). */
export default function ChecklistsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Checklists
      key={hotel.code}
      hotel={hotel}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/housekeeping/${hotel.code}`))}
    />
  );
}
