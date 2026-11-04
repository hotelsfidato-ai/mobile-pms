import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Count } from "../../../src/modules/stores/Count";
import { Guard } from "../../../src/modules/stores/Guard";

/* Count a store (the web's Count a store on /h/:code/stores; `store` the one picked there). */
export default function CountRoute() {
  const s = useSession();
  const { code, store } = useLocalSearchParams<{ code: string; store?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  const onBack = () => (router.canGoBack() ? router.back() : router.replace(`/stores/${hotel.code}`));
  return (
    <Guard hotel={hotel} role={role} path="/h/:code/stores" screen="Store" onBack={onBack}>
      <Count hotel={hotel} role={role} startStoreId={store ?? null} onBack={onBack} />
    </Guard>
  );
}
