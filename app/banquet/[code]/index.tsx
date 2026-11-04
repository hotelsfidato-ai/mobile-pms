import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Diary } from "../../../src/modules/banquet/Diary";

/* The banquet diary for one property (the web's /h/:code/banquet). */
export default function DiaryRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Diary
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`))}
    />
  );
}
