import { Printer } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { DownloadButton } from "../../core/Download";
import { ON_THE_WEBSITE } from "../../core/menu";
import { c } from "../../core/theme";
import { s as core } from "../../core/ui";
import { Btn, body } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { CardHead, GoTo, PageFrame, Tabs, refusedPage } from "./PropertyKit";
import { DOCS, docWhen, type Doc } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   DOCUMENTS on a phone — Settings → Property → Documents (the web's
   pages/property/Documents.tsx, D27-344, D27-348): what the hotel prints
   and sends, one tab each - when it is printed (the hotel's own front desk
   rules for the tax invoice: GET /api/hotels' deskRules) and where that is
   set. Nothing here is saved or sent.

   The VOUCHER's sample is the server's PDF (GET /:code/documents/sample-
   voucher.pdf, `setting` view; the web opens it to print): on the phone it
   is downloaded with the sign-in and handed to the share sheet (the core's
   downloadToShare, M-16) - print it, or save it, from there. Offline, the
   web's download sentence; a refusal, the server's. The other four samples
   are the website's own drawings (the tax invoice, the proforma bill, the
   registration card, the restaurant bill) with this hotel's header and a
   made-up guest: "Print a sample" stays greyed "On the website for now"
   on those tabs. Not pictured.
   ══════════════════════════════════════════════════════════════════ */

type Rules = { invoiceAtCheckout?: string; invoiceCopies?: number };

export function PropDocuments({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/documents", "Documents");
  const [doc, setDoc] = useState<Doc>("invoice");
  const rules = (hotel as typeof hotel & { deskRules?: Rules }).deskRules;
  const { when, where } = docWhen(doc, rules, code);
  return (
    <PageFrame title="Documents"
      under="What the hotel prints and sends, as the guest gets it. Each sample has a made-up guest and says SAMPLE · NOT VALID."
      refused={refused} refreshing={false} onRefresh={() => undefined}>
      <Tabs label="Documents" value={doc} onChange={setDoc} options={DOCS} />
      <View style={[core.card, { gap: 12 }]}>
        <CardHead title={DOCS.find(([k]) => k === doc)![1]} line={when} />
        {doc === "voucher" ? (
          <View style={{ gap: 4 }}>
            <DownloadButton label="Print a sample" a11y="Print a sample voucher" path={`/api/hotels/${encodeURIComponent(code)}/documents/sample-voucher.pdf`}
              fileName={`Sample voucher ${code}.pdf`} mimeType="application/pdf" />
            <Text style={[body, { color: c.grey600 }]}>The sample opens in the share sheet: print it from there, or save it as a PDF.</Text>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <View style={{ alignSelf: "flex-start" }}>
              <Btn variant="primary" label="Print a sample" a11y={`Print a sample: ${ON_THE_WEBSITE}`} disabled onPress={() => undefined}
                icon={<Printer size={16} color={c.grey500} />} />
            </View>
            <Text style={[body, { color: c.grey600 }]}>{`${ON_THE_WEBSITE}: the sample is drawn by the website, with this hotel's header. Pick the printer to test it there, or Save as PDF.`}</Text>
          </View>
        )}
        {where ? (
          <View style={{ borderTopWidth: 1, borderColor: c.grey100, paddingTop: 4 }}>
            <GoTo to={where.to} code={code} label={`Change it on ${where.label}`} inline />
          </View>
        ) : null}
      </View>
    </PageFrame>
  );
}
