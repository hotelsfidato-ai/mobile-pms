import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { CompanyStatement } from "../../../src/modules/reports/MoneyReports";

/* /reports/5EL/company-statement?account=…: one account's statement (the web's /reports/company-statement; Company accounts links here with the account). */
export default function CompanyStatementRoute() {
  const s = useSession();
  const { code, account } = useLocalSearchParams<{ code: string; account?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <CompanyStatement hotel={hotel} role={roleAt(s.who, hotel.code)} {...(account ? { account } : {})}
      onAccount={(a) => router.setParams({ account: a })} />
  );
}
