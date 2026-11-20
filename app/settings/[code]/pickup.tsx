import { AdminRoute } from "../../../src/modules/admin/Route";
import { Pickup } from "../../../src/modules/settings/MoneyLists";

/* /settings/5EL/pickup — the web's /settings/money/pickup: Pickup and drop (Settings → Money → Pickup and drop). Lane m13-set-money. */
export default function PickupRoute() {
  return <AdminRoute screen={Pickup} />;
}
