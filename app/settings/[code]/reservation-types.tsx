import { AdminRoute } from "../../../src/modules/admin/Route";
import { ReservationTypesScreen } from "../../../src/modules/settings/Lists";

/* Reservation types (Settings → Lists). */
export default function ReservationTypesRoute() {
  return <AdminRoute screen={ReservationTypesScreen} />;
}
