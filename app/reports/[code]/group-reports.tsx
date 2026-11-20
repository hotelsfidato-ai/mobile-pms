import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { GroupReports } from "../../../src/modules/reports/GroupReports";

/* /reports/5EL/group-reports: several properties in one report (the web's /group-reports),
   opened from the property in view. */
export default function GroupReportsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <GroupReports hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
