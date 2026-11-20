import { AdminRoute } from "../../../src/modules/admin/Route";
import { MsgReportEmails } from "../../../src/modules/settings/MsgReportEmails";

/* Daily report emails (Settings → Messages: the owner, an administrator and the GM; lane m13-set-messages). */
export default function MsgReportEmailsRoute() {
  return <AdminRoute screen={MsgReportEmails} />;
}
