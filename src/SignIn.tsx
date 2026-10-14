import { Pressable, Text, View } from "react-native";
import { API_URL } from "./api";
import { c, space, t } from "./theme";
import { Card, s } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   SIGN IN. Staff sign in with the email and password they use on the
   website (the owner's D27-321); Firebase takes the password, the API
   decides what each role may see.

   That part needs the website's public Firebase settings in the app,
   which waits on the owner's yes. Until then a development run signs in
   as the web's test people (src/lib/devIdentities.ts, the same uids),
   against the mobile chat's own local API and its demo data.
   ══════════════════════════════════════════════════════════════════ */

/* The web's development sign-ins whose menu holds the Dashboard - the
   people this first slice, the owner's figures, is for. */
const PEOPLE = [
  { uid: "dev-owner", label: "Owner", detail: "every property · group admin" },
  { uid: "dev-gm", label: "General Manager", detail: "5 Elements Akkalkot · GM" },
  { uid: "dev-hotel-manager", label: "Hotel Manager", detail: "5 Elements Akkalkot" },
  { uid: "dev-finance", label: "Accountant", detail: "5 Elements Akkalkot · money" },
];

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
          <Text style={[t.caption, { color: c.yellow800, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "600" }]}>
            Development only · {API_URL}
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
