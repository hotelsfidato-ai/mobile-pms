import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Feedback } from "../../../src/modules/reputation/Feedback";

/* Guest feedback for one property (the web's /h/:code/feedback). mobile/m13-sales. */
export default function FeedbackRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Feedback key={hotel.code} hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
