import { ArrowLeft, ArrowRight, Camera, ImagePlus, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { outcomeUnknown } from "../../core/api";
import { dataUrl, PHOTO, PHOTO_LONG_SIDE, PHOTO_QUALITY } from "../../core/files";
import { explainPick, pickPhoto } from "../../core/pickers";
import { stops } from "../../core/stop";
import { c, t } from "../../core/theme";
import { notKnown, useRead, useScreenStop } from "../../core/ui";
import { base64For } from "../../core/upload";
import { movedOrder, photosLine, photosStop } from "./config";
import { addTypePhoto, orderTypePhotos, readTypePhoto, readTypePhotos, removeTypePhoto } from "./configData";
import { Btn, Failed, Loading, confirm } from "./configKit";
import { InDialog, body, saidOf, type Said } from "./kit";

/* ══════════════════════════════════════════════════════════════════
   A ROOM TYPE'S PHOTOS on a phone — the web's TypePhotos
   (inventory/pages/RoomSetup.tsx 557-620, c9394cb; D27-258), M-16:
   ten a type, the first shown first; Earlier / Later (the owner's M-16
   "Move up / Move down", as the web's arrows), Delete asked first with
   the phone's own dialog (M-16). A photo from the camera or the library
   (expo-image-picker), sent as base64 JPEG (core base64For with PHOTO).
   The web redraws a photo at 1600 px first; this phone cannot (no image
   library), so a larger one is refused with a plain sentence before it is
   sent (expo-image-manipulator is asked of the owner).
   Changing them is `room_config` edit (SETUP_CHANGE): a refused role sees
   them with the API's sentence. Nothing here is held offline (unlisted).
   ONE TAP, ONE PHOTO: a repeated POST adds a second photo, so an add whose
   reply was lost greys Add until the list is read again (the core stop,
   MEMORY 16, 22); an order or a delete that LANDED greys the arrows until
   a read begun after it (MEMORY 24: the order is the whole list).
   ══════════════════════════════════════════════════════════════════ */

export function TypePhotos({ code, typeId, cannotChange }: { code: string; typeId: string; cannotChange: string | null }) {
  const name = photosStop(code, typeId);
  const stop = useScreenStop(name);
  const fresh = useScreenStop(`${name}/fresh`);
  const q = useRead(stop.watch(fresh.watch(() => readTypePhotos(code, typeId))), ["inventory", code, "type-photos", typeId]);
  const latch = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);

  if (!q.data) {
    return q.error ? <Failed title="The photos did not load" what="The photos" error={q.error} onRetry={q.reload} /> : <Loading words="Reading the photos…" />;
  }
  const { photos, most } = q.data;
  const ids = photos.map((p) => p.id);
  /* A landed change: the list on screen is old until it is read again. */
  const landed = () => { stops.lost(`${name}/fresh`); q.reload(); };
  const run = async (what: string, act: () => Promise<Said | null>) => {
    if (latch.current) return;
    latch.current = true; setBusy(what); setSaid(null);
    try { const s = await act(); if (s) setSaid(s); } finally { latch.current = false; setBusy(null); }
  };

  const add = (camera: boolean) => void run("add", async () => {
    if (stop.isStuck()) return null;
    let picked;
    try { picked = await pickPhoto({ camera, quality: PHOTO_QUALITY }); }
    catch (e) { return explainPick(e) ? null : { title: "Not added", body: "The phone's picker could not be opened. Try again.", tone: "bad" }; }
    if (!picked) return null;
    const read = await base64For(picked, PHOTO);
    if (!read.ok) return { title: "Not added", body: read.reason, tone: "bad" };
    try {
      await stop.guard(() => addTypePhoto(code, typeId, read.data));
      landed();
      return null;
    } catch (e) {
      if (outcomeUnknown(e)) { const n = notKnown("added", "this type's photos, read again", e); return { title: n.title, body: n.body, tone: "bad" }; }
      return saidOf("Not added", e);
    }
  });
  const move = (from: number, to: number) => void run(`move:${from}`, async () => {
    try { await orderTypePhotos(code, typeId, movedOrder(ids, from, to)); landed(); return null; }
    catch (e) { if (outcomeUnknown(e)) landed(); return saidOf("Not moved", e); }
  });
  const remove = (photoId: string) => confirm("Delete this photo?", "It is taken off this room type for good.", "Delete", () => void run(`del:${photoId}`, async () => {
    try { await removeTypePhoto(code, typeId, photoId); landed(); return null; }
    catch (e) { if (outcomeUnknown(e)) landed(); return saidOf("Not deleted", e); }
  }));

  const waiting = fresh.stuck;
  const why = cannotChange ?? (stop.unknown ? notKnown("added", "this type's photos, read again").line : null);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((p, i) => (
          <View key={p.id} style={{ width: "48%", borderRadius: 10, borderWidth: 1, borderColor: c.grey200, overflow: "hidden" }}>
            <Shot code={code} typeId={typeId} photoId={p.id} />
            {!cannotChange ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, paddingVertical: 2 }}>
                <Btn label="" a11y="Earlier" variant="ghost" icon={ArrowLeft} disabled={i === 0 || busy !== null || waiting} onPress={() => move(i, i - 1)} />
                <Btn label="" a11y="Delete this photo" variant="ghost" icon={Trash2} disabled={busy !== null || waiting} onPress={() => remove(p.id)} />
                <Btn label="" a11y="Later" variant="ghost" icon={ArrowRight} disabled={i === photos.length - 1 || busy !== null || waiting} onPress={() => move(i, i + 1)} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <Text style={[body, { color: c.grey600 }]}>{photosLine(photos.length, most)}</Text>
      {photos.length < most ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Btn label={busy === "add" ? "Adding…" : "Take a photo"} icon={Camera} disabled={why !== null || busy !== null} onPress={() => add(true)} />
            <Btn label="Choose a photo" icon={ImagePlus} disabled={why !== null || busy !== null} onPress={() => add(false)} />
          </View>
          <Text style={[t.caption, { color: why ? c.grey600 : c.grey500 }]}>
            {why ?? `A JPEG of at most ${PHOTO_LONG_SIDE} px on its long side: this phone cannot make a photo smaller yet.`}
          </Text>
        </View>
      ) : null}
      {(waiting || stop.unknown) && q.error && !q.loading ? (
        /* The read that would let the stop go failed: said, with a way to read again (the review, 20 Nov). */
        <View style={{ gap: 6 }} accessibilityRole="alert">
          <Text style={[t.caption, { color: c.red700 }]}>{`The photos could not be read again: ${q.error}`}</Text>
          <View style={{ flexDirection: "row" }}><Btn label="Read them again" onPress={q.reload} /></View>
        </View>
      ) : waiting && !stop.unknown ? <Text style={[t.caption, { color: c.grey500 }]}>Reading the photos again…</Text> : null}
      <InDialog said={said} />
    </View>
  );
}

/** One photo (TypePhotoImage): the server's base64 JPEG, 4:3. */
function Shot({ code, typeId, photoId }: { code: string; typeId: string; photoId: string }) {
  const q = useRead(() => readTypePhoto(code, typeId, photoId), ["inventory", code, "type-photo", photoId]);
  return (
    <View style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center" }}>
      {q.data ? <Image source={{ uri: dataUrl(q.data.type, q.data.data) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors />
        : q.error ? <Text style={[t.caption, { color: c.grey500 }]}>Not loaded</Text> : <ActivityIndicator color={c.grey400} />}
    </View>
  );
}
