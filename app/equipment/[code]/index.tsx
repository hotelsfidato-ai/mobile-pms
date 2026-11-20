import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Register } from "../../../src/modules/equipment/Register";

/* /equipment/5EL - the web's /h/:code/equipment. The server says who may (grants.ts); the screen greys what it would refuse. */
export default function EquipmentRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Register
      key={hotel.code}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`))}
    />
  );
}
