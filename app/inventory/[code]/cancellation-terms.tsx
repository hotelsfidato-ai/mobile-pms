import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CancellationTerms } from "../../../src/modules/inventory/CancellationTerms";

/* /inventory/5EL/cancellation-terms — the web's /h/:code/cancellation-terms
   (Configuration, and Settings → Property → Cancellation terms). */
export default function CancellationTermsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CancellationTerms hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
