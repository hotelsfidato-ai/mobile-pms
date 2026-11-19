import { Redirect, useLocalSearchParams } from "expo-router";
import type { ComponentType } from "react";
import type { Hotel, HotelsResponse } from "../../core/api";
import { asRole, type Role } from "../../core/menu";
import { roleAt, useSession } from "../../core/session";

/** What every administration screen is given: the property in the address, the person's role there
    (a group administrator is the owner everywhere, the API's roleAt), and who they are. */
export interface AdminProps { hotel: Hotel; role: Role; who: HotelsResponse }

/** A route of app/admin/[code]/…: signed in, and only a property the API listed for this person
    (the pattern of app/approvals/[code]/index.tsx). Not rostered there: All properties. */
export function AdminRoute({ screen: Screen }: { screen: ComponentType<AdminProps> }) {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Screen hotel={hotel} role={asRole(roleAt(s.who, hotel.code))} who={s.who} />;
}
