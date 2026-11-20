import { AdminRoute } from "../../../src/modules/admin/Route";
import { HolidaysScreen } from "../../../src/modules/settings/Lists";

/* Holidays (Settings → Lists). */
export default function HolidaysRoute() {
  return <AdminRoute screen={HolidaysScreen} />;
}
