import { AdminRoute } from "../../../src/modules/admin/Route";
import { PaymentMethods } from "../../../src/modules/settings/MoneyLists";

/* /settings/5EL/payment-methods — the web's /settings/money/payment-methods: Payment methods (Settings → Money → Payment methods). Lane m13-set-money. */
export default function PaymentMethodsRoute() {
  return <AdminRoute screen={PaymentMethods} />;
}
