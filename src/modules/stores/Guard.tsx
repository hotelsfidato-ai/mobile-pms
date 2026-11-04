import type { ReactNode } from "react";
import type { Hotel } from "../../core/api";
import { asRole, mayReach } from "../../core/menu";
import { Head, Screen } from "../../core/ui";
import { Back } from "../guest-services/kit";
import { NotYourRole } from "./kit";

/* The web's RequireAccess (src/components/app/RequireAccess.tsx): a route the
   role may reach is the one its menu gives it - the guard asks the
   navigation, so a hidden link and a refused page cannot disagree. The
   API refuses the reads as well; this says so before anything is read. */
export function Guard({ hotel, role, path, screen, onBack, children }: {
  hotel: Hotel; role: string | null; path: string; screen: string; onBack: () => void; children: ReactNode;
}) {
  if (mayReach(asRole(role), path)) return <>{children}</>;
  return (
    <Screen refreshing={false} onRefresh={() => undefined}>
      <Head title={screen} under={hotel.name} action={<Back onPress={onBack} />} />
      <NotYourRole role={role} screen={screen} />
    </Screen>
  );
}
