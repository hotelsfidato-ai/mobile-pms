import { Redirect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/core/session";
import { Arrivals } from "../../../src/modules/front-desk/Arrivals";

/* /front-desk/5EL (Today) · /front-desk/5EL?view=upcoming */
export default function ArrivalsRoute() {
  const s = useSession();
  const { code, view } = useLocalSearchParams<{ code: string; view?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Arrivals hotel={hotel} view={view} />;
}
