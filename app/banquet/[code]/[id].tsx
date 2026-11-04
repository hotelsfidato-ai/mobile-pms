import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { FunctionPage } from "../../../src/modules/banquet/Fn";

/* One function (the web's /h/:code/banquet/:id). `registered` names a
   function just registered, and `warning` the server's warning with it,
   so the screen says so (the web's toast before its navigation). */
export default function FunctionRoute() {
  const s = useSession();
  const { code, id, registered, warning } = useLocalSearchParams<{ code: string; id: string; registered?: string; warning?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <FunctionPage
      key={id}
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      id={id}
      {...(registered ? { registered } : {})}
      {...(warning ? { warning } : {})}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/banquet/${hotel.code}`))}
    />
  );
}
