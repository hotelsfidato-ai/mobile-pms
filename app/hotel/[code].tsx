import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useSession } from "../../src/core/session";
import { Dashboard } from "../../src/modules/reports/Dashboard";

export default function DashboardRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  /* Every work tile opens its list, as the picture's arrows say (M-11). The
     front desk's routes are mobile/front-desk's (its in-house route takes
     ?view=due-out; the shell's PHONE_ROUTES maps /h/:code/arrivals and
     /h/:code/in-house to them); they resolve once that branch is merged.
     Each screen answers for its own rights: the API decides (AGENTS rule 1). */
  return (
    <Dashboard
      hotel={hotel}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/all"))}
      onOpenArrivals={() => router.push(`/front-desk/${hotel.code}`)}
      onOpenDueOut={() => router.push(`/front-desk/${hotel.code}/in-house?view=due-out`)}
      onOpenInHouse={() => router.push(`/front-desk/${hotel.code}/in-house`)}
      onOpenRooms={() => router.push(`/housekeeping/${hotel.code}`)}
    />
  );
}
