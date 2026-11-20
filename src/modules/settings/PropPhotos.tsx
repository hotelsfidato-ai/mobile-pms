import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import { c, face, t } from "../../core/theme";
import { s as core, confirmAct, useRead } from "../../core/ui";
import { Btn, Toast, body, useSaid } from "../admin/kit";
import type { AdminProps } from "../admin/Route";
import { CardHead, NeedsFile, PageFrame, Read, StuckLine, mayEditHere, readOnlyLine, refusedPage, usePage, useWrites, type Writes } from "./PropertyKit";
import { captionPhoto, orderPhotos, photoUri, readPhotos, removeHotelLogo, removePhoto } from "./propertyData";
import { logoOf, moved, type Logo } from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   LOGO AND PHOTOS on a phone — Settings → Property → Logo and photos (the
   web's pages/property/Photos.tsx): this hotel's own logo (components/
   GroupCard.tsx HotelLogoCard, D27-214) and its photo gallery (components/
   HotelGalleryCard.tsx, D27-243): shown to guests on their page, put in
   order, captioned and deleted here.

   Choosing a file is not on the phone yet: the logo's Upload / Replace
   (a PNG or an SVG file: expo-document-picker ~57.0.3) and Add photos
   (expo-image-picker ~57.0.20, and the web's shrink to 1600 px without the
   camera's location) are greyed "On the website for now". Everything else
   is here: Remove the logo, captions, the order, Delete (each asking first).
   An SVG logo is not drawn on the phone (it shows on the website); a PNG is.

   Reads: GET /:code/group (hotelLogo), GET /:code/gallery, GET /:code/
   gallery/:id per photo. Writes (`room_config` edit at this hotel): DELETE
   /:code/logo, PATCH /:code/gallery/:id { caption }, PUT /:code/gallery/
   order, DELETE /:code/gallery/:id. Not pictured.
   ══════════════════════════════════════════════════════════════════ */

export function PropPhotos({ hotel, role }: AdminProps) {
  const code = hotel.code;
  const refused = refusedPage(role, "/settings/property/photos", "Logo and photos");
  const { said, say, close } = useSaid();
  const { q, stop } = usePage(code, "photos", () => (refused ? Promise.resolve(null) : readPhotos(code)));
  const w = useWrites(stop, q.reload, say);
  const [pulled, setPulled] = useState(false);
  const mayEdit = mayEditHere(role);
  return (
    <View style={{ flex: 1 }}>
      <PageFrame hotel={hotel.name} title="Logo and photos" under="The logo prints on this hotel's documents; the photos show to guests after the code."
        refused={refused} refreshing={pulled && q.loading} onRefresh={() => { setPulled(true); q.reload(); }}>
        <Read q={q} what="the logo and photos">
          {(d) => {
            if (!d) return null;
            const [group, gallery] = d;
            const photos = gallery.photos;
            const removeLogo = () => confirmAct("Remove this hotel's logo?", "This hotel's documents print the group's logo.", "Remove", () =>
              void w.write(() => removeHotelLogo(code), {
                ok: () => ({ title: "Logo removed", body: "This hotel's documents print the group's logo.", tone: "ok" }),
                done: "removed", where: "this hotel's logo", no: "Not removed",
              }));
            return (
              <>
                <StuckLine stuck={w.stuck} />
                <View style={[core.card, { gap: 12 }]}>
                  <CardHead title="This hotel's logo" line="On this hotel's bills and documents in place of the group's logo."
                    info="With none, the group's prints. The voucher PDF prints a PNG logo; an SVG logo shows on the bills and the group's logo on the voucher." />
                  <LogoRow logo={group.hotelLogo} alt="This hotel's logo" mayEdit={mayEdit} off={w.off} onRemove={removeLogo} />
                </View>
                <View style={[core.card, { gap: 12 }]}>
                  <CardHead title="Photos" line="Shown to guests on their page during the stay. Never a guest in one."
                    info="Each photo is made 1600 px on its long side and its location taken out as it is sent. Up to 20." />
                  {mayEdit ? <NeedsFile label="Add photos" pkg="expo-image-picker ~57.0.20" /> : null}
                  {photos.length === 0 ? (
                    <Text style={[t.label, { fontSize: 16, color: c.grey500 }]}>No photos yet. Guests' pages show none until one is added.</Text>
                  ) : (
                    <>
                      {photos.map((p, i) => (
                        <Tile key={p.id} code={code} id={p.id} caption={p.caption} n={i + 1} last={i === photos.length - 1} mayEdit={mayEdit} w={w}
                          onMove={(by) => {
                            const ids = moved(photos.map((x) => x.id), i, by);
                            if (ids) void w.write(() => orderPhotos(code, ids), { ok: () => null, done: "moved", where: "the photos", no: "Not moved" });
                          }} />
                      ))}
                      <Text style={t.caption}>{`${photos.length} of ${gallery.most ?? 20} photos`}</Text>
                    </>
                  )}
                </View>
                {!mayEdit ? <Text style={t.caption}>{readOnlyLine("Changing the hotel's photos")}</Text> : null}
              </>
            );
          }}
        </Read>
      </PageFrame>
      <Toast said={said} onClose={close} />
    </View>
  );
}

/** A logo (GroupCard.tsx LogoRow): the picture or "None"; Upload / Replace waits for a file picker; Remove asks first. */
export function LogoRow({ logo, alt, mayEdit, off, onRemove }: { logo: Logo | null | undefined; alt: string; mayEdit: boolean; off: boolean; onRemove: () => void }) {
  const shown = logoOf(logo);
  return (
    <View style={{ gap: 8 }}>
      <Text style={t.caption}>Logo - a PNG or an SVG, 200 KB at most</Text>
      {shown?.kind === "png" ? (
        <Image source={{ uri: shown.uri }} accessibilityLabel={alt} resizeMode="contain" style={{ height: 64, width: "100%", alignSelf: "flex-start" }} />
      ) : shown?.kind === "svg" ? (
        <Text style={[body, { color: c.grey600 }]}>An SVG logo is set. It shows on the website and prints on the documents.</Text>
      ) : <Text style={[t.label, { fontSize: 16, color: c.grey500 }]}>None</Text>}
      {mayEdit ? (
        <>
          <NeedsFile label={shown ? "Replace" : "Upload"} pkg="expo-document-picker ~57.0.3" />
          {shown ? <View style={{ alignSelf: "flex-start" }}><Btn variant="ghost" label="Remove" disabled={off} onPress={onRemove} /></View> : null}
        </>
      ) : null}
    </View>
  );
}

function Tile({ code, id, caption: saved, n, last, mayEdit, w, onMove }: {
  code: string; id: string; caption: string | null; n: number; last: boolean; mayEdit: boolean; w: Writes; onMove: (by: -1 | 1) => void;
}) {
  const src = useRead(() => photoUri(code, id), ["settings", code, "photo", id]);
  const [caption, setCaption] = useState(saved ?? "");
  const dirty = caption.trim() !== (saved ?? "");
  const save = () => void w.write(() => captionPhoto(code, id, caption), { ok: () => null, done: "saved", where: `photo ${n}'s caption`, no: "Caption not saved" });
  const remove = () => confirmAct("Delete it?", undefined, "Delete", () =>
    void w.write(() => removePhoto(code, id), { ok: () => ({ title: "Photo deleted", body: "Guests no longer see it.", tone: "ok" }), done: "deleted", where: "the photos", no: "Not deleted" }), "Keep");
  return (
    <View style={{ gap: 6, paddingTop: 12, borderTopWidth: n === 1 ? 0 : 1, borderColor: c.grey100 }}>
      {src.data ? (
        <Image source={{ uri: src.data }} accessibilityLabel={saved ?? `Photo ${n}`} resizeMode="cover" style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: c.grey100 }} />
      ) : (
        <View style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: c.grey100, alignItems: "center", justifyContent: "center", gap: 6 }}>
          {src.error ? <Text style={[t.caption, { color: c.red700 }]}>{`Photo ${n} could not be read. Pull down to try again.`}</Text> : <ActivityIndicator color={c.grey500} />}
        </View>
      )}
      {mayEdit ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={caption} maxLength={120} placeholder="Caption" placeholderTextColor={c.grey400} accessibilityLabel={`Caption for photo ${n}`}
            onChangeText={setCaption} style={{ flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey300, fontSize: 16, color: c.ink900, ...face[500] }} />
          {dirty ? <Btn label="Save" a11y={`Save caption for photo ${n}`} disabled={w.off} onPress={save} /> : null}
        </View>
      ) : saved ? <Text style={[t.label, { color: c.ink900 }]}>{saved}</Text> : null}
      {mayEdit ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Arrow label={`Move photo ${n} earlier`} disabled={w.off || n === 1} onPress={() => onMove(-1)}><ArrowLeft size={16} color={c.grey700} /></Arrow>
          <Arrow label={`Move photo ${n} later`} disabled={w.off || last} onPress={() => onMove(1)}><ArrowRight size={16} color={c.grey700} /></Arrow>
          <View style={{ flex: 1 }} />
          <Arrow label={`Delete photo ${n}`} disabled={w.off} onPress={remove}><Trash2 size={16} color={c.grey700} /></Arrow>
        </View>
      ) : null}
    </View>
  );
}

const Arrow = ({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: ReactNode }) => (
  <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}>{children}</Pressable>
);
