import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Diary } from "../../../src/modules/spa/Diary";

/* The spa diary for one property (the web's /h/:code/spa). */
export default function SpaDiaryRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Diary key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
