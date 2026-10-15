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
  return (
    <Dashboard
      hotel={hotel}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/all"))}
      onOpenRooms={() => router.push(`/housekeeping/${hotel.code}`)}
    />
  );
}
