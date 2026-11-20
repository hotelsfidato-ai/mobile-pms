import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../core/session";
import { Guard } from "../stores/Guard";
import { StockReportScreen } from "./StockReport";
import { STOCK_REPORTS, webPath, type StockReportKey } from "./stockReports.ts";

/* A store, bar or supplier report's route (app/reports/[code]/<key>.tsx): the
   session's guard, the hotel, then the web's RequireAccess (the report's own
   menu entry, reports/nav.ts) through the stores' Guard - the API refuses the
   read as well, and its sentence is shown if it does. */
export function StockReportRoute({ report }: { report: StockReportKey }) {
  const s = useSession();
  const { code, supplier } = useLocalSearchParams<{ code: string; supplier?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  const onBack = () => (router.canGoBack() ? router.back() : router.replace(`/hotel/${hotel.code}`));
  return (
    <Guard hotel={hotel} role={role} path={webPath(report)} screen={STOCK_REPORTS[report].title} onBack={onBack}>
      <StockReportScreen
        hotel={hotel} report={report} by={s.who.scope.fullName || null} onBack={onBack}
        {...(report === "supplier-statement" ? {
          supplier: supplier || undefined,
          onSupplier: (id: string | null) => router.setParams({ supplier: id ?? "" }),
        } : {})}
      />
    </Guard>
  );
}
