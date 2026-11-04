import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { Guard } from "../../../../src/modules/stores/Guard";
import { ItemHistory } from "../../../../src/modules/stores/History";

/* One item's history (the web's History dialog on /h/:code/stores). */
export default function HistoryRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  const onBack = () => (router.canGoBack() ? router.back() : router.replace(`/stores/${hotel.code}`));
  return (
    <Guard hotel={hotel} role={role} path="/h/:code/stores" screen="Store" onBack={onBack}>
      <ItemHistory key={id} hotel={hotel} role={role} id={id} onBack={onBack} />
    </Guard>
  );
}
