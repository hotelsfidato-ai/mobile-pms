import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropDocuments } from "../../../src/modules/settings/PropDocuments";

/* Documents (Settings → Property; lane mobile/m13-set-property). */
export default function DocumentsRoute() {
  return <AdminRoute screen={PropDocuments} />;
}
