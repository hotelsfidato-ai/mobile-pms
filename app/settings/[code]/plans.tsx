import { AdminRoute } from "../../../src/modules/admin/Route";
import { RatePlans } from "../../../src/modules/settings/MoneyPlans";

/* /settings/5EL/plans — the web's /settings/rates/plans: Rate plans (Settings → Rates and tax → Rate plans). Lane m13-set-money. */
export default function RatePlansRoute() {
  return <AdminRoute screen={RatePlans} />;
}
