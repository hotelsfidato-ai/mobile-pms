# Native on both phones — the owner's principles (19 Nov 2026)

"Safe spaces, use native features of both iOS and Android, optimize the design for mobile, use
sufficient padding, use native features allowed by Expo for iPhone and Android users so that it's
seamless. It doesn't feel off and it doesn't feel weird." Every screen follows these, with what is
installed (no new package without the owner's yes).

## Safe areas
- The frame (`app/_layout.tsx`) keeps the top (status bar, notch, Dynamic Island) and the bottom
  (home indicator, Android's gesture bar) clear. A screen never draws under them.
- **Every sheet or dialog** (`Modal`) pads its own content: `useSafeAreaInsets()` — bottom padding
  `Math.max(insets.bottom, 16)` on a bottom sheet, top `insets.top` on a full-screen one; Android
  edge-to-edge too. A `Modal` sets `statusBarTranslucent` on Android and `onRequestClose` (the back
  button / gesture closes it).
- Forms lift over the keyboard: `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ?
  "padding" : "height"}`, and `keyboardShouldPersistTaps="handled"` on the scroll.

## Native controls (from React Native and installed Expo modules)
- **On / off:** `Switch` (each phone's own), with `trackColor` from the theme.
- **Confirm a destructive act** (delete, cancel, close the day, sign out): `Alert.alert` with the
  web's words and a `style: "destructive"` button — each phone's own dialog.
- **Numbers:** `keyboardType="decimal-pad"` for an amount or a price, `"number-pad"` for a count,
  `"phone-pad"` for a phone, `"email-address"` (with `autoCapitalize="none"`) for an email;
  `inputMode` to match; `textContentType` / `autoComplete` where the phone can fill it in.
- **A phone number or an email on screen** opens the dialler or mail (`Linking.openURL("tel:…")`,
  `mailto:`); an address opens the map (`geo:` on Android, `maps:` on iPhone).
- **Export and share:** `src/core/Export.tsx` — the print sheet (save as PDF) and the share sheet.
- **Pull down to read again:** `RefreshControl` (the core's `Screen` has it).
- **Loading:** `ActivityIndicator` (each phone's own spinner), never a custom one.
- **Back:** iPhone's swipe from the edge and Android's back gesture walk the stack (expo-router);
  a screen never blocks them, except while a write is on its way (then it says why).
- **Press feedback:** `android_ripple` on Android, the pressed shade on iPhone (`Pressable`'s style
  `pressed`), never both.
- **Text** follows the phone's text size (`allowFontScaling` stays on); a figure that must fit uses
  `adjustsFontSizeToFit` with `minimumFontScale={0.8}` rather than clipping.
- Not installed, asked of the owner when wanted: haptics (`expo-haptics` ~57.0.3), date and time
  pickers (`@react-native-community/datetimepicker` 9.1.0), photos (`expo-image-picker` ~57.0.20),
  file attachments to a share (`expo-file-system` ~57.0.7 + `expo-sharing` ~57.0.23), copy to the
  clipboard (`expo-clipboard` ~57.0.2).

## Designed for a phone, with room
- The side margin is `space.side` (20); cards `space.cardX` / `space.cardY` (16 / 14); between
  sections `space.section` (20). Nothing touches an edge.
- Touch targets at least 44 × 44 (iPhone) — 48 on Android where the row allows; `hitSlop` to reach
  it without changing the look.
- One column. A wide web table becomes cards of labelled figures in the web's order; a long list
  scrolls with the screen, never inside a fixed box.
- The primary act sits at the bottom within reach of a thumb, above the safe area.
- The web's words, the Type Ladder (`t` in `theme.ts`), Inter by `face`, never `fontWeight`.

## The backend
The app has no data of its own: every read and write goes to the PMS's API through
`src/core/api.ts`. The address is `EXPO_PUBLIC_API_URL` at bundle time (a release falls back to
`https://api.fidatohotels.com`); sign-in is Firebase's (M-10, the owner's public settings).
Connecting a running PMS is setting that one value: nothing else changes.
