# settings — the Settings console's own pages on a phone

Each lane that builds console pages appends its own section below (BRIEF-T4). Route files are
`app/settings/[code]/<slug>.tsx`; `/settings` itself opens the admin console (`/admin/:code`).

## Lane P — mobile/m13-set-property (20 Nov): Settings → Property

### The web twin, mapped (PMS 16 Nov release)

| Page (web address) | Web files | Reads | Writes (roleGate) |
|---|---|---|---|
| Profile `/settings/property/profile` | `admin/pages/property/Profile.tsx`, `flows/CommissioningCard.tsx`, `components/PropertyProfileCard.tsx`, `pages/Properties.tsx` EditPropertyDialog, `pages/Property.tsx` FssaiCard, `pages/property/RegistrationsCard.tsx` | GET `/:code/commissioning` (room_config view; null if refused), GET `/api/admin/hotels/:code` (app.require_hotel_admin; null if refused), GET `/:code/property-profile` (anyone) | PATCH `/api/admin/hotels/:code` (own: app.manages_hotel, the name a group administrator's), PUT `/:code/fssai`, PUT `/:code/registrations` (room_config edit) |
| Set up this hotel `/settings/property/set-up-this-hotel` (and `/h/:code/setup`) | `admin/setup/SetupPage.tsx`, `steps.ts`, `data/setup.ts` | GET `/:code/setup` (setting view; read again each time the page comes into view) | PUT `/:code/setup/:step` (room_config edit + app.manages_hotel) |
| Bring in old data `/settings/property/old-data` | `admin/oldData/OldDataPage.tsx`, `data/oldSystem.ts` | GET `/:code/imports` (own: app.imports_old_data; a 403 is the page's answer) | POST `/:code/imports/:id/undo` (own). The file's check and import: on the website (a file) |
| Logo and photos `/settings/property/photos` | `pages/property/Photos.tsx`, `components/GroupCard.tsx` HotelLogoCard, `components/HotelGalleryCard.tsx` | GET `/:code/group`, `/:code/gallery`, `/:code/gallery/:id` (anyone) | DELETE `/:code/logo`, PATCH/PUT order/DELETE `/:code/gallery…` (room_config edit). Upload and Add photos: on the website (a file) |
| Highlights `/settings/property/highlights` | `pages/property/Highlights.tsx`, `TextEditor.tsx` | GET `/:code/property-profile` | PUT `/:code/texts/:kind` (room_config edit) |
| Amenities `/settings/property/amenities` | `pages/property/Amenities.tsx`, `amenityIcons.ts` | GET `/:code/amenities` (anyone; its `mayKeep`) | PUT `/:code/amenities/:id` {on} (room_config edit); POST, PATCH, PUT order, DELETE (the owner or an Admin: app.keeps_amenities) |
| Group `/settings/property/group` | `pages/ConsolePages.tsx` GroupSettings → `components/GroupCard.tsx` | GET `/:code/group` | PUT `/:code/group/name`, DELETE `/:code/group/logo`, PUT `/:code/group/office` (room_config edit). Upload: on the website |
| Policies `/settings/property/policies` | `pages/property/Policies.tsx`, `components/VoucherSettings.tsx` HousePoliciesCard | GET `/:code/property-profile`, `/api/admin/hotels/:code` | PATCH `/api/admin/hotels/:code` {housePolicies}, PUT `/:code/texts/:kind`, PUT `/:code/child-ages` |
| Documents `/settings/property/documents` | `pages/property/Documents.tsx` | none on the phone (the hotel's deskRules from GET /api/hotels) | none. Print a sample: on the website |

**Who opens a page:** the console's own rule (`menu.ts` CONSOLE_SECTIONS: `setting` access, and Bring in
old data the owner or an Admin, switchesModules); refused, RequireAccess's sentence. **Who changes:**
`room_config` edit (the owner, an Admin, the GM); a page this role may only read draws its fields read
only, with roleGate's sentence under it. Every refusal from the server is shown in its own words.

**Offline:** none of these writes is on the web's list; `send()` refuses each with the web's sentence.
**Keys:** these routes read no idempotency key. After an unknown outcome (`outcomeUnknown`) every write on
the page stays grey until a read of the page that BEGAN after the loss has come back; the doubt is kept
outside React by hotel and page (`propertyRules.ts` `doubt`, checked), and one latch holds the page while a
write is on its way, its sheet unable to close (MEMORY 16, 22). One key keeper per page all the same.

### Files

`propertyRules.ts` (+ `.check.ts`): the texts' kinds, property types, child-age words and the typed age,
moving a row, logos, office fields, the 18 steps word for word, the open step, the summary, the checklist's
line, the documents' lines, the import's words, the doubt. `propertyData.ts`: every call. `PropertyKit.tsx`:
the page hook, the latch, the frame and the four states, links, the text editor, tabs.
`Prop<Page>.tsx`: one per page.

### Picture match (20 Nov; read against code, never seen running)

| Page | Picture | Result |
|---|---|---|
| Profile | `all/70-system-administration-settings` (dev-gm) | MATCHES: the checklist card (yellow, the pill, the line, the link, folded rows), the profile card's pairs in the web's order, FSSAI, the registration numbers and map line. |
| Set up this hotel | `new/n-h-setup` (dev-gm) | MATCHES: the groups with "n of m done" and their notes, each row's disc / title / line / pill, the open step's facts, Open Profile in orange, Next / Later / Remind me. Buttons are 44 px tall (the web's sm is smaller). |
| The other seven | none | Not pictured: built from the web's code. |

8 lines of each picture checked; 2 of 9 pages pictured, both match.

### Differences from the web (each for a reason)

- **Files** (not installed): the hotel's and the group's logo Upload / Replace and Add photos
  (`expo-document-picker ~57.0.3`, `expo-image-picker ~57.0.20`), Bring in old data's file and so its steps
  1 to 3 (`expo-document-picker ~57.0.3`): greyed "On the website for now", said on the card. Set up this
  hotel's step 14 says its logo and photos are files.
- **Remind me on this date** needs a date picker (`@react-native-community/datetimepicker 9.1.0`): greyed;
  Tomorrow, In 3 days and In a week are on the phone.
- **Documents' Print a sample**: greyed; the samples are the website's drawings, and the voucher's PDF needs an
  authenticated file download the core's `api()` does not do (asked of the mobile chat).
- **An SVG logo** is not drawn on the phone (said in words); a PNG is.
- **Asks first where the web does not** (BRIEF-T4): removing a logo, deleting an amenity, turning Off an
  amenity some hotel has on, deleting a photo (the web asks inline "Delete it?"), undoing an import (the web's
  own dialog words).
- **Set up this hotel**: the web's "Back to setup" bar on the opened screen (`?setup=`) is not on the phone;
  the back gesture returns. The open step does not scroll itself into view.
- A page the phone has not built yet opens nothing: its "Open …" button (setup) or link (checklist,
  Documents) is greyed "On the website for now".
- A typed child age that is not a whole number goes as typed, so the server refuses it in its words
  (the web sends null and clears the age: MSET-P1).
