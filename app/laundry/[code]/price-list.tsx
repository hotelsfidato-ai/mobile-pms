import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { PriceList } from "../../../src/modules/laundry/PriceList";

/* The laundry price list for one property (the web's /h/:code/laundry/price-list). */
export default function PriceListRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <PriceList
      key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/laundry/${hotel.code}`))}
    />
  );
}
