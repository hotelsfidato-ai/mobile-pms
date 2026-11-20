import { AdminRoute } from "../../../src/modules/admin/Route";
import { MealPlans } from "../../../src/modules/settings/MoneyPlans";

/* /settings/5EL/meal-plans — the web's /settings/rates/meal-plans: Meal plans (Settings → Rates and tax → Meal plans). Lane m13-set-money. */
export default function MealPlansRoute() {
  return <AdminRoute screen={MealPlans} />;
}
