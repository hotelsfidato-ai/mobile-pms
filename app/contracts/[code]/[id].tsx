import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Company } from "../../../src/modules/contracts/Company";

/* One company's contracts at one property (the web's /contracts/:companyId). mobile/m13-sales. */
export default function CompanyRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Company key={`${hotel.code}/${id}`} hotel={hotel} role={roleAt(s.who, hotel.code)} id={id} />;
}
