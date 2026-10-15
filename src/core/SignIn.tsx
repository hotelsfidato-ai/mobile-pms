import { Pressable, Text, View } from "react-native";
import { API_URL } from "./api";
import { c, face, space, t } from "./theme";
import { Card, s } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   SIGN IN. Staff sign in with the email and password they use on the
   website (the owner's M-1); Firebase takes the password, the API
   decides what each role may see.

   That part needs the website's public Firebase settings in the app,
   which waits on the owner's yes. Until then a development run signs in
   as the web's test people (src/lib/devIdentities.ts, the same uids),
   against the mobile chat's own local API and its demo data.
   ══════════════════════════════════════════════════════════════════ */

/* The web's development sign-ins (src/lib/devIdentities.ts, the same
   labels): the owner's figures (slice 1), then housekeeping and the desk
   that marks rooms but may not raise a room repair (slice 2). Behind `__DEV__`
   so a release build carries not even their names (MCORE-1). */
const PEOPLE = __DEV__ ? [
  { uid: "dev-owner", label: "Owner", detail: "every property · group admin" },
  { uid: "dev-gm", label: "General Manager", detail: "5 Elements Akkalkot · GM" },
  { uid: "dev-hotel-manager", label: "Hotel Manager", detail: "5 Elements Akkalkot" },
  { uid: "dev-finance", label: "Accountant", detail: "5 Elements Akkalkot · money" },
  { uid: "dev-housekeeping", label: "Housekeeping", detail: "5 Elements Akkalkot · rooms" },
  { uid: "dev-desk", label: "Reception", detail: "5 Elements Akkalkot · front desk" },
  /* The waiter (slice 3, M-9): made in this app's own demo database; the web
     has none yet (R-10). */
  { uid: "dev-pos", label: "Waiter", detail: "5 Elements Akkalkot · the restaurant" },
] : [];

export function SignIn({ onDev, busy, error }: { onDev: (uid: string) => void; busy: boolean; error: string | null }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.grey50, paddingHorizontal: space.side, justifyContent: "center", gap: space.section }}>
      <View style={{ gap: 4 }}>
        <Text style={t.eyebrow}>Fidato Hotels</Text>
        <Text style={t.title} accessibilityRole="header">Sign in</Text>
      </View>

      {error ? (
        <Card style={{ backgroundColor: c.red50, borderColor: c.red50 }}>
          <Text style={[t.label, { color: c.red700 }]} accessibilityRole="alert">{error}</Text>
        </Card>
      ) : null}

      {__DEV__ ? (
        <View style={{ gap: space.tile }}>
          <Text style={[t.caption, { color: c.yellow800, ...face[600] }]}>
            <Text style={{ textTransform: "uppercase", letterSpacing: 1.2 }}>Development only</Text> · {API_URL}
          </Text>
          {PEOPLE.map((p) => (
            <Pressable
              key={p.uid}
              disabled={busy}
              onPress={() => onDev(p.uid)}
              accessibilityRole="button"
              style={({ pressed }) => [s.card, { minHeight: 56, justifyContent: "center", gap: 2 }, pressed && { backgroundColor: c.grey100 }]}
            >
              <Text style={t.heading}>{p.label}</Text>
              <Text style={t.caption}>{p.detail}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={t.label}>Signing in with your email and password is not set up in this build yet.</Text>
        </Card>
      )}

      <Text style={t.caption}>Trouble signing in? Your general manager can reset your password.</Text>
    </View>
  );
}
