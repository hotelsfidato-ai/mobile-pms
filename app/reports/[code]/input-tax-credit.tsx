import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { InputTaxCredit } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/input-tax-credit: input tax credit (the web's /reports/input-tax-credit). */
export default function InputTaxCreditRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <InputTaxCredit hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
