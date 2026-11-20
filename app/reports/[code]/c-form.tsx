import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CForm } from "../../../src/modules/reports/MoneyLists";

/* /reports/5EL/c-form: the Form III register (the web's /reports/c-form). */
export default function CFormRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <CForm hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
