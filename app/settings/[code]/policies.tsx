import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropPolicies } from "../../../src/modules/settings/PropPolicies";

/* Policies (Settings → Property; lane mobile/m13-set-property). */
export default function PoliciesRoute() {
  return <AdminRoute screen={PropPolicies} />;
}
