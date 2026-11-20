import { AdminRoute } from "../../../src/modules/admin/Route";
import { Commission } from "../../../src/modules/settings/MoneyCommission";

/* /settings/5EL/commission — the web's /settings/money/commission: Commission (Settings → Money → Commission). Lane m13-set-money. */
export default function CommissionRoute() {
  return <AdminRoute screen={Commission} />;
}
