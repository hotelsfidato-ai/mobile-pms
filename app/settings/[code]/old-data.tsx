import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropOldData } from "../../../src/modules/settings/PropOldData";

/* Bring in old data (Settings → Property; lane mobile/m13-set-property). */
export default function OldDataRoute() {
  return <AdminRoute screen={PropOldData} />;
}
