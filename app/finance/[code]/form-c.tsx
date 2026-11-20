import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { FormC } from "../../../src/modules/finance/FormC";

/* /finance/5EL/form-c: the Form III register of foreign guests (the web's /h/:code/form-c). */
export default function FormCRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <FormC hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
