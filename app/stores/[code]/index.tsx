import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Guard } from "../../../src/modules/stores/Guard";
import { Store } from "../../../src/modules/stores/Store";

/* The Store, the Shelf (the web's /h/:code/stores); the Inventory Manager's landing. */
export default function StoreRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  const onBack = () => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`));
  return (
    <Guard hotel={hotel} role={role} path="/h/:code/stores" screen="Store" onBack={onBack}>
      <Store hotel={hotel} role={role} onBack={onBack} />
    </Guard>
  );
}
