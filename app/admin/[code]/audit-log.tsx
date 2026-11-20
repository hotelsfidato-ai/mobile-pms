import { AdminRoute } from "../../../src/modules/admin/Route";
import { AuditLog } from "../../../src/modules/admin/Logs";

/* Audit log (the web's /admin/audit-log, Settings → People and security). */
export default function AuditLogRoute() {
  return <AdminRoute screen={AuditLog} />;
}
