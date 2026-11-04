import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { KitchenBoard } from "../../../src/modules/pos/KitchenBoard";

/* The pass for one property. A chef or a kitchen manager lands here with
   nothing behind it: then the way out is Sign out. By stage or By table
   stays in the address, as the web's does. */
export default function KitchenRoute() {
  const s = useSession();
  const { code, by } = useLocalSearchParams<{ code: string; by?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const role = roleAt(s.who, hotel.code);
  /* GET /api/hotels answers it (api/src/routes/hotels.ts); the core's type does not name it yet. */
  const { startHereDismissed } = s.who.scope as { startHereDismissed?: boolean };
  return (
    <KitchenBoard
      hotel={hotel}
      role={role}
      startHere={role === "chef" && !startHereDismissed}
      tableView={by === "table"}
      onView={(table: boolean) => router.setParams({ by: table ? "table" : undefined })}
      onConsole={() => router.push(`/pos/${hotel.code}/tables`)}
      {...(router.canGoBack() ? { onBack: () => router.back() } : { onSignOut: s.signOut })}
    />
  );
}
