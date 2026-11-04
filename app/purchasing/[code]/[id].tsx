import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Request } from "../../../src/modules/purchasing/Request";

/* One purchase request and its order (the web's /h/:code/purchasing/:id). */
export default function RequestRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Request
      key={id}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/purchasing/${hotel.code}`))}
    />
  );
}
