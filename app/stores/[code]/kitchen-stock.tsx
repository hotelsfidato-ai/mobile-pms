import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Guard } from "../../../src/modules/stores/Guard";
import { Inventory } from "../../../src/modules/stores/Sheets";

/* Kitchen stock (the web's /pos/:code/kitchen-stock): the day's sheet and its count. */
export default function KitchenStockRoute() {
  const s = useSession();
  const { code, tab } = useLocalSearchParams<{ code: string; tab?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  const onBack = () => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`));
  return (
    <Guard hotel={hotel} role={role} path="/pos/:code/kitchen-stock" screen="Kitchen stock" onBack={onBack}>
      <Inventory hotel={hotel} role={role} door="kitchen" tab={tab === "restaurant" ? "restaurant" : "bar"} onBack={onBack} />
    </Guard>
  );
}
