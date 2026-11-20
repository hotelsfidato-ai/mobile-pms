import { ImageManipulator, SaveFormat, type ImageRef } from "expo-image-manipulator";
import { fitSize, type Picked, type PhotoRule } from "./files";
import { forgetPicked } from "./pickers";
import { base64For } from "./upload";

/* ══════════════════════════════════════════════════════════════════
   A PHOTO REDRAWN ON THE PHONE BEFORE IT IS SENT (M-18, 20 Nov) — the
   web's online-checkin/shrinkPhoto.ts, which HotelGalleryCard.tsx:46 and
   RoomSetup.tsx:566 call before a hotel's or a room type's photo goes up:
   - upright: the web draws with the camera's own rotation (createImage-
     Bitmap imageOrientation "from-image", :18). expo-image-manipulator
     ~57.0.21 does the same as it loads: iPhone redraws to "up" (its
     ImageFixOrientationTransformer), Android's loader (Glide) applies the
     EXIF rotation. A HEIC or a PNG is read like any photo;
   - the long side brought down to 1600 px, never enlarged, each side
     rounded (:19-22, files.ts fitSize);
   - always saved as a JPEG at 0.85 (:25), whatever was picked, so a PNG
     or a HEIC goes as a JPEG too; the new file carries no camera notes
     and no location (a canvas's, a Bitmap's or a UIImage's JPEG has none);
   - when it cannot be redrawn, the web sends the file as it is (:26-28)
     and the server decides. Here the same file, checked first with the
     rule's `problem` (only a JPEG within 1600 px can be taken) and read.
   The bytes stay the server's to judge: over 600 KB it refuses, and its
   sentence is what the screen shows.
   DPDP (MEMORY 25): the picked copy and the redrawn file are deleted as
   soon as the bytes are read, kept or refused; only the base64 is kept.
   ══════════════════════════════════════════════════════════════════ */

export async function fitPhoto(picked: Picked, rule: PhotoRule): Promise<{ ok: true; data: string } | { ok: false; reason: string }> {
  const refs: { release(): void }[] = [];
  let made: string | null = null;
  try {
    const context = ImageManipulator.manipulate(picked.uri);
    refs.push(context);
    let image: ImageRef = await context.renderAsync();
    refs.push(image);
    const to = fitSize(image.width, image.height, rule.longSide);
    if (to.width !== image.width || to.height !== image.height) {
      image = await context.resize(to).renderAsync();
      refs.push(image);
    }
    const saved = await image.saveAsync({ compress: rule.quality, format: SaveFormat.JPEG, base64: true });
    made = saved.uri;
    if (!saved.base64) throw new Error("no bytes");
    return { ok: true, data: saved.base64 };
  } catch {
    /* Not redrawn: the file as picked, as the web sends it (base64For checks the rule and deletes the copy). */
    return await base64For(picked, rule);
  } finally {
    for (const r of refs.reverse()) { try { r.release(); } catch { /* already let go */ } }
    if (made) forgetPicked({ uri: made });
    forgetPicked(picked);
  }
}
