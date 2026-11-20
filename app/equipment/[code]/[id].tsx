import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Item } from "../../../src/modules/equipment/Item";

/* /equipment/5EL/<id> - one thing in the register (the web's /h/:code/equipment/:id). */
export default function EquipmentItemRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Item
      key={`${hotel.code}/${id}`}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/equipment/${hotel.code}`))}
    />
  );
}
