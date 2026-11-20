import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropProfile } from "../../../src/modules/settings/PropProfile";

/* Profile (Settings → Property; lane mobile/m13-set-property). */
export default function ProfileRoute() {
  return <AdminRoute screen={PropProfile} />;
}
