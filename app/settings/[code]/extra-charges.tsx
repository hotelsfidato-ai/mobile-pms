import { AdminRoute } from "../../../src/modules/admin/Route";
import { ExtraCharges } from "../../../src/modules/settings/MoneyLists";

/* /settings/5EL/extra-charges — the web's /settings/money/extra-charges: Extra charges (Settings → Money → Extra charges). Lane m13-set-money. */
export default function ExtraChargesRoute() {
  return <AdminRoute screen={ExtraCharges} />;
}
