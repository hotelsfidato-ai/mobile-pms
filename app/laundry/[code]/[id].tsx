import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Docket } from "../../../src/modules/laundry/Docket";

/* One laundry docket (the web's /h/:code/laundry/:id). `collected` names a
   docket just collected, so the screen says so (the web's toast). */
export default function DocketRoute() {
  const s = useSession();
  const { code, id, collected } = useLocalSearchParams<{ code: string; id: string; collected?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Docket
      key={id}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      id={id}
      {...(collected ? { collected } : {})}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/laundry/${hotel.code}`))}
    />
  );
}
