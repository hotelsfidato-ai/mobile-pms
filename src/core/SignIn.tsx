import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff, Info, LogIn, TriangleAlert } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View,
  type TextInputProps,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { api, API_URL, send } from "./api";
import { auth, isConfigured, notSetUp } from "./firebase";
import { c, face, t } from "./theme";
import { s } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   SIGN IN — src/pages/SignIn.tsx at phone width (M-11): the group's band,
   then the form. Firebase takes the password; this screen never sees it
   after the call, and Postgres decides everything that happens next.
   Without the public settings the form stands, closed: its fields and
   Sign in off, and a box saying which settings the build lacks and that
   the owner sets them up (./firebase.ts notSetUp).

   PICTURE MATCH (4 Nov): reference/pms-shots holds no picture of the
   sign-in screen (every shot is taken signed in), so nothing was compared
   with a picture. The look and the words are the web's src/pages/SignIn.tsx
   as the 31 Oct helper ported them from the PMS's code; kept as they were.
   Changed since: the "not set up" line is the web's info box and names the
   missing settings; "Development only" is theme.ts's yellow800 (readable on
   white) instead of #ffb600. Read from code only, never seen running.
   ══════════════════════════════════════════════════════════════════ */

/* theme.css's, for this screen only. */
const RED = c.red;
const RED_RING = c.red100;
const GREY400 = c.grey400;

/* The web's development sign-ins (src/lib/devIdentities.ts: the same
   people, labels and order), one per role, for every slice; and the waiter
   the web lacks (R-10). Behind `__DEV__`
   so a release build carries not even their names (MCORE-1). */
const PEOPLE = __DEV__ ? [
  { uid: "dev-owner", label: "Owner", detail: "every property · group admin" },
  { uid: "dev-gm", label: "General Manager", detail: "5 Elements Akkalkot · GM" },
  { uid: "dev-desk", label: "Reception", detail: "5 Elements Akkalkot · front desk" },
  { uid: "dev-admin", label: "Admin", detail: "every property · administrator" },
  { uid: "dev-hotel-manager", label: "Hotel Manager", detail: "5 Elements Akkalkot" },
  { uid: "dev-revenue", label: "Revenue Manager", detail: "5 Elements Akkalkot · rates" },
  { uid: "dev-housekeeping", label: "Housekeeping", detail: "5 Elements Akkalkot · rooms" },
  { uid: "dev-stores", label: "Inventory Manager", detail: "5 Elements Akkalkot · store" },
  { uid: "dev-kitchen", label: "Kitchen Manager", detail: "5 Elements Akkalkot · the pass" },
  { uid: "dev-chef", label: "Chef", detail: "5 Elements Akkalkot · the pass" },
  { uid: "dev-finance", label: "Accountant", detail: "5 Elements Akkalkot · money" },
  /* The waiter (slice 3, M-9): made in this app's own demo database
     (scripts/dev-pos.sql); the web has none yet (R-10). */
  { uid: "dev-pos", label: "Waiter", detail: "5 Elements Akkalkot · the restaurant" },
] : [];

/** src/assets/brand/logo-mark.svg, the group's mark. */
function Mark() {
  return (
    <Svg width={33} height={36} viewBox="0 0 985 1082" accessible={false}>
      <Defs>
        <LinearGradient id="mark" gradientUnits="userSpaceOnUse" x1={-27.62} y1={588.06} x2={983.45} y2={501.73}>
          <Stop offset={0} stopColor="#FE611F" />
          <Stop offset={1} stopColor="#F4BF54" />
        </LinearGradient>
      </Defs>
      <Path fill="url(#mark)" fillRule="evenodd" d="M362 674.17c12.98,-4.99 37.97,-13.52 47.52,-19.22 -1.89,13.34 -23.55,71.31 -30.07,85.42 -37.9,89.67 -93.99,247.45 -191.65,281.61 -92.34,31.66 -133.05,-43.37 -118.18,-111.59 25.27,-115.18 196,-186.8 292.38,-236.22zm-357.21 250.21c3.99,196.99 210.63,205.32 325.21,64.67 85.84,-118.79 111.33,-227.78 156.7,-354.67 103.86,-15.71 173.85,-22.62 264.44,-31.16 66.67,-6.28 216.41,16.73 206.37,-89.73 -145.09,13.67 -311.51,34.53 -456.36,54.71 2.25,-15.28 12.35,-71.38 24.01,-78.34l85.76 -30c69.99,-24.7 133.04,-64.47 194.13,-105.68 97.14,-70.96 206.42,-211.08 98.62,-321.78 -57.01,-50.14 -162.33,-27.12 -217.06,17.03 -95.81,76.37 -130.95,164.31 -176.37,270.17 -7.17,19.18 -35.53,110.94 -41.71,116.67 -14.44,13.35 -301.15,46.48 -332.26,49.41 -61.21,5.77 -145.72,0.66 -137.2,91.05 145.95,-13.75 304.6,-55.37 451.5,-69.21 -3.42,11.28 -6.26,28.68 -8.5,40.55 -12.07,50.47 -1.7,29.62 -60.28,50.56 -116.09,42.69 -380.82,172.85 -377,325.75zm622.53 -706.95c29.36,-55.63 81.99,-123.13 143.6,-142.03 134.09,-43.33 140.23,89.34 69.39,165.12 -68.39,67.36 -198.41,150.03 -298.4,177.18 28.58,-66.58 46.48,-137.88 85.41,-200.27z" />
    </Svg>
  );
}

/** The web's Field and Input under a finger: a 14px label, a 44px box, 16px words. */
function Field({ label, required, hint, trailing, editable = true, ...input }: TextInputProps & {
  label: string; required?: boolean; hint?: string; trailing?: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>
        {label}{required ? <Text style={{ color: RED }}> *</Text> : null}
      </Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={GREY400}
          autoCapitalize="none"
          autoCorrect={false}
          style={[{
            height: 44, paddingLeft: 12, paddingRight: trailing ? 44 : 12, backgroundColor: c.white, borderWidth: 1,
            borderColor: c.grey300, borderRadius: 10, color: c.ink900, fontSize: 16, ...face[500],
          }, editable ? null : { backgroundColor: c.grey50 }]}
          {...input}
        />
        {trailing ? <View style={{ position: "absolute", right: 0, top: 0 }}>{trailing}</View> : null}
      </View>
      {hint ? <Text style={t.caption}>{hint}</Text> : null}
    </View>
  );
}

/** The web's primary Button, large: solid orange, a 44px pill. */
function Primary({ label, onPress, disabled, busy, icon }: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; icon?: ReactNode;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      style={({ pressed }) => ({
        minHeight: 44, paddingHorizontal: 20, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: disabled ? c.grey300 : pressed ? c.orange700 : c.orange600,
        opacity: busy ? 0.7 : 1,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={c.white} /> : icon}
      <Text style={{ fontSize: 16, ...face[500], color: disabled ? c.grey600 : c.white }}>{label}</Text>
    </Pressable>
  );
}

/** A refusal or a notice in the form, as the web's two boxes. */
function Say({ tone, children }: { tone: "red" | "info"; children: string }) {
  const red = tone === "red";
  return (
    <View
      accessibilityRole={red ? "alert" : undefined}
      style={{
        flexDirection: "row", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1,
        backgroundColor: red ? c.red50 : c.info50, borderColor: red ? RED_RING : c.info100,
      }}
    >
      {red ? <TriangleAlert size={16} color={RED} style={{ marginTop: 2 }} /> : <Info size={16} color={c.info} style={{ marginTop: 2 }} />}
      <Text style={[t.label, { flex: 1, color: red ? RED : c.ink900 }]}>{children}</Text>
    </View>
  );
}

export function SignIn({ onSignIn, onDev, busy, error, notice }: {
  onSignIn: (email: string, password: string) => void;
  onDev: (uid: string) => void;
  busy: boolean; error: string | null; notice: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* Showing it is the person's own choice, so it starts off (the web's reason). */
  const [show, setShow] = useState(false);
  const ready = isConfigured && email.trim() !== "" && password !== "";
  const submit = () => { if (ready && !busy) onSignIn(email, password); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, backgroundColor: c.white }}>
        {/* The group's panel: on a phone a band, so the form is above the fold. */}
        <View style={{ backgroundColor: c.ink900, paddingHorizontal: 24, paddingVertical: 28, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Mark />
          <Text style={{ fontSize: 14, ...face[600], letterSpacing: 2.52, textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Fidato Hotels</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingVertical: 40 }}>
          <Text style={t.title} accessibilityRole="header">Sign in</Text>
          <Text style={[t.label, { marginTop: 6 }]}>Use the account your property gave you.</Text>

          <View style={{ gap: 16, marginTop: 28 }}>
            <Field
              label="Email"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="you@fidatohotels.com"
              editable={isConfigured}
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <Field
              label="Password"
              required
              value={password}
              onChangeText={setPassword}
              editable={isConfigured}
              secureTextEntry={!show}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              trailing={(
                <Pressable
                  onPress={() => setShow(!show)}
                  accessibilityRole="button"
                  accessibilityLabel={show ? "Hide password" : "Show password"}
                  accessibilityState={{ selected: show }}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  {show ? <EyeOff size={16} color={c.grey500} /> : <Eye size={16} color={c.grey500} />}
                </Pressable>
              )}
            />

            {notSetUp ? <Say tone="info">{notSetUp}</Say> : null}
            {notice && !error ? <Say tone="info">{notice}</Say> : null}
            {error ? <Say tone="red">{error}</Say> : null}

            <Primary label="Sign in" onPress={submit} disabled={!ready} busy={busy} icon={<LogIn size={16} color={ready ? c.white : c.grey600} />} />
          </View>

          <Text style={[t.label, { color: c.grey500, marginTop: 24 }]}>Trouble signing in? Your general manager can reset your password.</Text>

          {__DEV__ ? (
            <View style={{ marginTop: 32 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <View style={{ height: 1, flex: 1, backgroundColor: c.grey200 }} />
                <Text style={{ fontSize: 12, ...face[600], letterSpacing: 1.2, textTransform: "uppercase", color: c.yellow800 }}>Development only</Text>
                <View style={{ height: 1, flex: 1, backgroundColor: c.grey200 }} />
              </View>
              <View style={{ gap: 8 }}>
                {PEOPLE.map((p) => (
                  <Pressable
                    key={p.uid}
                    disabled={busy}
                    onPress={() => onDev(p.uid)}
                    accessibilityRole="button"
                    style={({ pressed }) => [{
                      minHeight: 44, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12,
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.grey200,
                      backgroundColor: pressed ? c.grey50 : c.white, opacity: busy ? 0.5 : 1,
                    }]}
                  >
                    <Text style={[t.label, { color: c.ink900 }]}>{p.label}</Text>
                    <Text style={[t.caption, { flexShrink: 1 }]}>{p.detail}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[t.caption, { marginTop: 12 }]}>{API_URL}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** While Firebase reads the session it kept (App.tsx). */
export function Checking() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.grey50 }} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
      <Text style={[t.label, { color: c.grey500 }]}>Checking your session…</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   A LONGER PASSWORD, BEFORE GOING ON (D27-245) — src/modules/admin/
   components/PasswordDue.tsx. Somebody given the owner's, an Admin's or a
   GM's role while holding a shorter password sets a new one at their next
   sign-in. The server says whether it is due; this asks once per sign-in
   and cannot be closed until it is set. The route checks the length again.
   Unlisted, so refused offline (./offline.ts): never held, a password does
   not wait in the outbox.
   ══════════════════════════════════════════════════════════════════ */
export function PasswordDue({ staffId, email }: { staffId: string; email: string }) {
  const cache = useQueryClient();
  const due = useQuery({
    queryKey: ["password-due", staffId],
    queryFn: () => api<{ due: boolean; min: number }>("/api/me/password"),
    staleTime: Infinity,
  });
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  if (!due.data?.due) return null;
  const min = due.data.min;

  const submit = async () => {
    setBusy(true);
    setRefused(null);
    try {
      await send("POST", `/api/admin/staff/${staffId}/password`, { password: value });
      /* A password set by the server ends this phone's token (Firebase moves
         the account's "valid since" and the API checks it), so it signs in
         again with what was just typed. If that fails, the next read says so. */
      if (auth?.currentUser) await signInWithEmailAndPassword(auth, email, value).catch(() => undefined);
      setValue("");
      await cache.invalidateQueries({ queryKey: ["password-due"] });
    } catch (e) {
      setRefused(e instanceof Error ? e.message : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: "rgba(3,23,40,0.25)" }}>
        <View style={[s.card, { padding: 0, paddingHorizontal: 0, paddingVertical: 0, overflow: "hidden" }]} accessibilityViewIsModal>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.grey200, gap: 4 }}>
            <Text style={t.heading} accessibilityRole="header">Set a longer password</Text>
            <Text style={[t.label, { color: c.grey500 }]}>
              Your role now reaches more, so your password is at least {min} characters. Set one to go on.
            </Text>
          </View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
            <Field
              label="A new password"
              hint={`At least ${min} characters.`}
              value={value}
              onChangeText={setValue}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              style={{
                height: 48, paddingHorizontal: 12, backgroundColor: c.white, borderWidth: 1, borderColor: c.grey300,
                borderRadius: 10, color: c.ink900, fontSize: 16, ...face[500],
              }}
            />
            {refused ? <Say tone="red">{refused}</Say> : null}
          </View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.grey200, backgroundColor: c.grey50, flexDirection: "row", justifyContent: "flex-end" }}>
            <Primary label="Set it" onPress={() => void submit()} disabled={value.length < min} busy={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
