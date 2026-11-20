import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropGroup } from "../../../src/modules/settings/PropGroup";

/* Group (Settings → Property; lane mobile/m13-set-property). */
export default function GroupRoute() {
  return <AdminRoute screen={PropGroup} />;
}
