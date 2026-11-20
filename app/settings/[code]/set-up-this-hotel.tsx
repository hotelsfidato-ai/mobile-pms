import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropSetup } from "../../../src/modules/settings/PropSetup";

/* Set up this hotel (Settings → Property; lane mobile/m13-set-property). */
export default function SetupRoute() {
  return <AdminRoute screen={PropSetup} />;
}
