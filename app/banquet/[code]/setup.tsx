import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Setup } from "../../../src/modules/banquet/Setup";

/* Halls and packages for one property (the web's /h/:code/banquet/setup). */
export default function BanquetSetupRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Setup
      key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)}
      onDiary={() => (router.canGoBack() ? router.back() : router.replace(`/banquet/${hotel.code}`))}
    />
  );
}
