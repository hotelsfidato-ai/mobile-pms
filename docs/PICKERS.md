# Pickers, uploads, dates and downloads: what the next lanes turn on (M-16, 20 Nov 2026)

The owner's M-16: every upload, photo and date control greyed "On the website for now" is turned on
through the phone's own pickers. The core pieces are in `src/core` (lane m16-core). This file lists
every control that is grey (or typed, or stepped) **because** of a picker, an upload, a date picker
or a download, with what it needs. Read in the PMS at `c9394cb` and the app at `6b4c900`, 20 Nov.
Line numbers are the app's at that commit. Nothing here was opened on a screen.

## The core pieces

| Piece | File | Use |
|---|---|---|
| `pickPhoto({ camera?, quality? })` | `src/core/pickers.ts` | The camera or the library; `Picked` or null (cancelled). A refused camera throws `NoPermission`; `explainPick(e)` says it with "Open Settings". |
| `pickFile({ types })` | `src/core/pickers.ts` | The phone's file picker; `types` from the rule (`BILL.types`, `LOGO.types`, `SHEET_TYPES`, `CSV_IMPORT.types`). |
| `BILL`, `PHOTO`, `LOGO`, `OLD_SYSTEM_FILE`, `ROOMING_FILE`, `CSV_IMPORT` | `src/core/files.ts` | `rule.problem(picked)`: the web's or the server's sentence, or null. Check before sending. |
| `sendForm(method, path, parts, keeper?)` | `src/core/upload.ts` | A multipart form (`filePart("file", picked)`, `{ name, value }`). Never held: offline it is ApiError 503 with the route's own web sentence; `outcomeUnknown` is then true, so keep the screen's stop (`useScreenStop`) until the record is read again. |
| `base64For(picked, rule)`, `readBase64`, `readText`, `dataUrl` | `src/core/upload.ts`, `files.ts` | The JSON routes' `data` (sent with `send()` and exactly the web's body); a CSV read on the phone. |
| `DateField`, `TimeField` | `src/core/DateField.tsx` | Each phone's own picker; the value is the API's text (`YYYY-MM-DD`, `HH:MM`, "" for none); `hotel` gives the day it opens on; `min`, `max`, `clearable`, `error`, `hint`. Pure rules in `dateField.ts`. |
| `downloadToShare(path, fileName, mimeType, offline?)`, `DownloadButton` | `src/core/Download.tsx` | A GET file route with the sign-in, to the share sheet; offline, the web's sentence (or the route's own, `offline`); a refusal, the server's. Also the way to OPEN a stored photo or PDF (view controls below). |

Two things the core does NOT have, which a lane may need (ask the mobile chat, a core change):
- **A CSV import's reader**: the web reads the CSV in the browser (`src/lib/importSpec.ts`
  `parseCsv`, each screen's spec, and `downloadTemplate`) and sends `{ rows, dryRun }`. The first
  lane to wire an Import ports `importSpec.ts` (pure) into `src/core`; `CSV_IMPORT.problem` is already
  its `fileProblem`. The template is made on the phone as the exports are (`Export.tsx`'s way).
- **Shrinking a photo**: the web redraws a gallery or room type photo at 1600 px, JPEG 0.85 before it
  is sent; the server refuses more than 1600 px or 600 KB. The phone cannot redraw (no image library):
  `PHOTO.problem` refuses a larger photo with a plain sentence, so most camera photos (4000 px) will be
  refused. `expo-image-manipulator ~57.0.21` (Expo SDK 57's) would do it: a question for the owner.

Columns: **Who** is the API's gate (`api/src/roleGate.ts`, or the module file it names); the phone
shows the control to everyone the web does and lets the server refuse, as today. **Offline**: a form
and a download are refused in the web's sentence (`files.ts`); a JSON write goes through `send()`'s
tiers (`offline.ts`: every route here is unlisted, so refused). A date control on an existing write
changes only the control: its rule and offline tier stay as the screen has them.

## Lane 1 — money, purchasing, stores, reports, repairs (finance, purchasing, stores, reports, housekeeping): 14

| # | Control (file:line) | Web twin | Route and body | Who | Offline | Core piece |
|---|---|---|---|---|---|---|
| 1.1 | Add the bill's photo / Bill photo, on a desk paid-out — `finance/Cashiering.tsx:171` | finance/data/expenses.ts `attachExpensePhoto`, `expensePhoto` | POST `/api/hotels/:code/cashier-shift/movements/:id/photo` multipart `file`; open: GET the same path | add: `payment` create ("Running the cashier's drawer"); open: `payment` or `invoice` see | "The photo needs the connection. Add it when you are back online." | pickPhoto / pickFile(BILL) + sendForm; open: downloadToShare |
| 1.2 | Photo of the bill, in Record (a paid-out) — `finance/Cashiering.tsx:266` | finance/flows/ExpenseFields.tsx:33 | as 1.1, sent after the movement is recorded, to its id | as 1.1 | as 1.1 | as 1.1 |
| 1.3 | Slip photo (open) — `finance/CashDeposits.tsx:143` | finance/data/deposits.ts `slipAddress` | GET `/attachments/:attachmentId/file` | `purchasing`, `equipment` or `room_config` see | the web's download sentence | downloadToShare |
| 1.4 | Add slip photo — `finance/CashDeposits.tsx:144` | deposits.ts `attachSlip` | POST `/attachments` multipart `table=cash_deposits`, `id`, `file` | `purchasing` create ("Attaching a bill"); the screen already greys it with `RECORD_DEPOSIT_REFUSED` when it may not record | "The photo needs the connection. …" | pickPhoto / pickFile(BILL) + sendForm |
| 1.5 | Photo of the slip, in Record a deposit — `finance/CashDeposits.tsx:197` | pages/CashDeposits.tsx:320 | as 1.4, to the new deposit's id | as 1.4 | as 1.4 | as 1.4 |
| 1.6 | Deposited on, typed — `finance/CashDeposits.tsx:189` | pages/CashDeposits.tsx:310 `DatePicker` | unchanged (`depositedOn`) | unchanged | unchanged | DateField |
| 1.7 | Received on, typed — `finance/CityLedger.tsx:182` | flows/CompanyPayments.tsx:70 `DatePicker` | unchanged (`receivedOn`) | unchanged | unchanged | DateField |
| 1.8 | Paid on, a credit note's Date, Bill date, Due on, typed — `finance/SupplierDues.tsx:208, 269, 310, 315` | purchasing/components/SupplierDues.tsx:289, 378, 446, 453 | unchanged | unchanged | unchanged | DateField ×4 |
| 1.9 | The bar's bills (record one with its photo) — `purchasing/Purchasing.tsx:115` (a note, no screen) | purchasing/components/BarBills.tsx:241, 250 (`capture="environment"`), 360 | POST `/bar/purchases` JSON (billDate, dueOn …), then POST `/bar/purchases/:id/photo` multipart `file`; open: GET the same | `BAR_RECORDERS` (purchasingGrants.ts); open `BAR_VIEW` | bill: unlisted (refused); photo: "The photo needs the connection. …" | a new sheet: DateField ×2 + pickPhoto(camera) / pickFile(BILL) + sendForm |
| 1.10 | Download the order — `purchasing/Request.tsx:119` (said at :124) | purchasing/data/purchasing.ts:272 | GET `/purchasing/orders/:id.pdf` | `VIEW_ROLES` (purchasingGrants.ts) | the web's download sentence | downloadToShare / DownloadButton |
| 1.11 | Use by, Bill date, Due on, typed — `purchasing/Delivery.tsx:144, 172, 177` | pages/PurchaseRequest.tsx:785, 829, 837 | unchanged | unchanged | unchanged | DateField ×3 |
| 1.12 | The excise registers (FLR PDFs) — `stores/Sheets.tsx:412` | stores/data/barSheet.ts:103 `downloadRegister` | GET `/reports/flr-daily.pdf?asOn=` and `/reports/flr-monthly.pdf?asOn=&month=` | `stock` export, and the hotel manager and read-only (STORE_REPORTS) | the web's download sentence | downloadToShare ×2 |
| 1.13 | The GSTR-1 file (JSON) — `reports/MoneyReports.tsx:156` (`more`) | reports/data/document.ts:7 | GET `/reports/gstr-1.json?month=` | `report` export (`mayDownloadGstr1`, already ported) | the web's download sentence | downloadToShare |
| 1.14 | See the proof / Record the cost, on a repair — `housekeeping/WorkOrdersScreen.tsx:376, 412` | housekeeping/data/housekeeping.ts:329 `recordRepairCost`, `proofAddress`; flows/RepairCosts.tsx:167 | POST `/repair-costs` multipart `workOrderId`, `amount`, `note`, `file` (the file is required, D17-6); open: GET `/attachments/:id/file` | `COST_RECORDERS` (repairRoles.ts; the screen's `whyNotRecord`); open as 1.3 | "A cost needs the connection: its proof is a photo, …" | pickPhoto / pickFile(BILL) + sendForm (a form with the amount: a keeper per cost); open: downloadToShare |

Stepped today (M-7), the web has a date box — optional, the owner's M-16 allows a picker:
`stores/Sheets.tsx:213, 393` (BarStock.tsx:225, KitchenStock.tsx:168, max the business date);
`reports/OpsReport.tsx:124-125`, `reports/MoneyKit.tsx:72-97` (its `DayStep` / `RangeStep` users),
`reports/MoneyReports.tsx:81`, `reports/GroupReports.tsx:91-92`, `reports/StockReport.tsx:72-73`
(Ledgers.tsx, Voids.tsx, GroupReports.tsx date boxes); `housekeeping/OutOfService.tsx:185, 195`
(OutOfOrderFlow.tsx:187, 197); `housekeeping/ReportRepair.tsx:182, 187` (RepairFlow.tsx:275, 281).
A month (`MonthStep`, GroupReports' Month) stays stepped: DateField picks days.

## Lane 2 — restaurant and set-up (pos, inventory, equipment, banquet, spa): 15

| # | Control (file:line) | Web twin | Route and body | Who | Offline | Core piece |
|---|---|---|---|---|---|---|
| 2.1 | Opening or adding a restaurant paid-out's photo — `pos/DayEnd.tsx:429` | finance/data/expenses.ts (`place: "till"`) | POST `/till/day-end/movements/:id/photo` multipart `file`; open: GET the same | add: `payment` create, with pos, bar, kitchen manager (DAY_END); open: `payment` or `invoice` see, the same three | "The photo needs the connection. …" | pickPhoto / pickFile(BILL) + sendForm; open: downloadToShare |
| 2.2 | Photo of the bill, in the Day end's paid-out — `pos/DayEnd.tsx:500` | finance/flows/ExpenseFields.tsx:77 | as 2.1, to the new movement's id | as 2.1 | as 2.1 | as 2.1 |
| 2.3 | Day (the till's date) — `pos/Till.tsx:270` | pages/Till.tsx:554, max today | a read's day (no write) | as the till | a read | DateField (max the hotel's day) |
| 2.4 | Import the menu, Import sides — `pos/MenuScreen.tsx:82, 81` | components/flows/ImportDialog.tsx; data/till.ts:2174 | the CSV read on the phone; POST `/till/menu/import` and `/till/menu/addon-groups/import` JSON `{ rows, dryRun }` | `menu` edit (MENU) | unlisted (refused) | pickFile(CSV_IMPORT) + readText + the importSpec port (above) |
| 2.5 | A coupon the guest brings (its From and Until) — `pos/MenuSides.tsx:276` | pages/Menu.tsx:567, 570 | POST `/till/promotions` `{ code, name, kind, value, coupon: { from, to, maxUses, minBill } }` (blank limits null) | `menu` edit | unlisted (refused) | DateField ×2 (+ the two limit boxes) |
| 2.6 | A band's dates, kept as they are — `pos/SetupTaxes.tsx:175` (`setup.ts:382`) | finance/flows/TaxRulesCard.tsx:355, 361 | the taxes save already sent, now with `validFrom` and `validTo` = the day AFTER the "Last day" shown (TaxRulesCard.tsx:265-266) | unchanged | unchanged | DateField ×2 per band |
| 2.7 | Time, typed — `pos/TableBookings.tsx:299`; Day typed or stepped — `:296` | pages/TableBookings.tsx:357, 358 (min today) | unchanged | unchanged | unchanged | TimeField, DateField |
| 2.8 | From, To (typed or stepped) — `pos/BillHistory.tsx:82, 83` | pages/BillHistory.tsx:190, 194 (max today) | a read | unchanged | a read | DateField ×2 |
| 2.9 | Import (room types, rooms) — `inventory/RoomTypes.tsx:122` | pages/RoomSetup.tsx:267; data/roomSetup.ts:192 | CSV on the phone; POST `/room-types/import`, `/rooms/import` `{ rows, dryRun }` | SETUP_ADD | unlisted (refused) | pickFile(CSV_IMPORT) + readText + importSpec port |
| 2.10 | A room type's photos: add (and its order, delete) — `inventory/RoomTypes.tsx:245` | pages/RoomSetup.tsx:557-620 | POST `/room-types/:id/photos` `{ data }` (base64 JPEG, ten a type); PUT `…/photos/order` `{ ids }`; DELETE `…/photos/:photoId`; GET `…/photos/:photoId` `{ type, data }` | `room_config` edit (SETUP_CHANGE); see: SETUP | unlisted (refused) | pickPhoto({ quality: PHOTO_QUALITY }) + base64For(PHOTO) + send; shown with dataUrl |
| 2.11 | Import — `equipment/Register.tsx:93` | pages/EquipmentRegister.tsx:322; data/equipment.ts:251 | CSV on the phone; POST `/equipment/import` `{ rows, dryRun }` | equipment/grants.ts | unlisted (refused) | pickFile(CSV_IMPORT) + readText + importSpec port |
| 2.12 | Bought on, Warranty ends, Service contract (AMC) ends, in Add — `equipment/Register.tsx:288` (`register.ts:349` `addBody`) | flows/AddEquipmentDialog.tsx:228, 241, 247 (min the purchase date) | POST `/equipment`: add `purchaseDate?`, `warrantyEnds?`, `amcEnds?` (left out when blank; equipment.ts:154-158) | unchanged | unchanged | DateField ×3, clearable |
| 2.13 | The same three, in Edit — `equipment/ItemDialogs.tsx:115` | flows/ItemDialogs.tsx:151, 160, 164 | PATCH `/equipment/items/:id`, the changes with the three dates (equipment.ts:182) | unchanged | unchanged | DateField ×3, clearable |
| 2.14 | From, Until (day stepped, time typed) — `banquet/Register.tsx:95-96, 103-104` | pages/Banquet.tsx:381, 390 (`datetime-local`) | unchanged: `"YYYY-MM-DDTHH:MM"` built from the two | unchanged | unchanged | DateField + TimeField ×2 |
| 2.15 | What time, typed — `spa/Acts.tsx:127` | pages/SpaDiary.tsx:504 | unchanged | unchanged | unchanged | TimeField |

Stepped today (M-7) — optional: `pos/MenuProfit.tsx:33-34` (DishProfitTab.tsx:72-73);
`inventory/GroupRates.tsx:113, 116` (GroupRates.tsx:130, 133); `inventory/Dialogs.tsx:66, 75, 143`
(Rates.tsx:917, 937, 1160).

## Lane 3 — front office and settings (settings, admin, front-desk, reservations, guest-services, contracts): 15

| # | Control (file:line) | Web twin | Route and body | Who | Offline | Core piece |
|---|---|---|---|---|---|---|
| 3.1 | Add photos (the hotel's) — `settings/PropPhotos.tsx:65` | admin/components/HotelGalleryCard.tsx:46, 72 (several at once) | POST `/gallery` `{ data, caption? }` (base64 JPEG ≤ 1600 px, ≤ 600 KB; 20 a hotel) | `room_config` edit (HOTEL_GALLERY) | unlisted (refused) | pickPhoto({ quality: PHOTO_QUALITY }) + base64For(PHOTO) + send — **done** `afd5a3f` |
| 3.2 | This hotel's logo: Upload / Replace — `settings/PropPhotos.tsx:105` (LogoRow, at :60) | admin/components/GroupCard.tsx:213 (HotelLogoCard) | PUT `/logo` `{ data }` (a PNG or SVG, ≤ 200 KB; the server reads it) | `room_config` edit (HOTEL_LOGO) | unlisted (refused) | pickFile(LOGO) + base64For(LOGO) + send — **done** `afd5a3f` |
| 3.3 | The group's logo: Upload / Replace — `settings/PropGroup.tsx:71` (the same LogoRow) | GroupCard.tsx LogoRow | PUT `/group/logo` `{ data }` | `room_config` edit (GROUP_LOGO) | unlisted (refused) | as 3.2 — **done** `afd5a3f` |
| 3.4 | Choose the file (the old system's), and the voucher switch after it — `settings/PropOldData.tsx:72, 83` | admin/oldData/OldDataPage.tsx:211; data/oldSystem.ts:106 | POST `/imports/:kind/check`, then `/imports/:kind` `{ name, data, system, columns?, choices?, sendVouchers }` | the owner or an administrator (oldSystem.ts) | unlisted (refused) | pickFile(OLD_SYSTEM_FILE) + base64For + send — **done** `4985d15` |
| 3.5 | Print a sample, the Voucher tab — `settings/PropDocuments.tsx:45` | pages/property/Documents.tsx:229 | GET `/documents/sample-voucher.pdf` | `setting` see | the web's download sentence | downloadToShare (the other four samples are the website's drawings: left) — **done** `ae20bbf` |
| 3.6 | Remind me on this date — `settings/PropSetup.tsx:209` | admin/setup/SetupPage.tsx:310 (min `earliest`) | PUT `/setup/:step` `{ choice: "remind", remindOn }` | `room_config` edit (SETUP_CHANGE) | unlisted (refused) | DateField — **done** `ae20bbf` |
| 3.7 | A tax band's dates, kept as they are — `settings/MoneyTaxes.tsx:242` | finance/flows/TaxRulesCard.tsx:355, 361 | as 2.6: `validTo` is the day after the Last day shown | unchanged | unchanged | DateField ×2 per band — **done** `ae20bbf` |
| 3.8 | Holidays: Day, typed — `settings/Lists.tsx:235` | front-desk/settings/ListPages.tsx:125 | unchanged | unchanged | unchanged | DateField — **done** `263e490` |
| 3.9 | Rooms ready from, Check-out by, the audit's hour, typed — `settings/ListsDesk.tsx:319, 320, 323` | inventory/components/FrontDeskCard.tsx:119, 125, 135 | unchanged | unchanged | unchanged | TimeField ×3 — **done** `263e490` |
| 3.10 | From, To, typed — `admin/Logs.tsx:76-77, 155-156` | admin/pages/Admin.tsx:357, 361; Activity.tsx:122, 126 (To min From) | a read | unchanged | a read | DateField ×4, clearable (blank is no filter) — **done** `1954f13` |
| 3.11 | Add a stay / a restaurant bill / cash in or out, Correct — `admin/Backfill.tsx:75` | admin/backfill/BackfillPage.tsx:487, 490, 555, 594 | the forms are not on the phone (a room, an outlet, a returning guest besides the dates) | the owner, an administrator, the GM (`mayWrite`) | as the web | DateField ×4 inside new sheets: the largest item — **done** `5d043a1` |
| 3.12 | View voucher — `front-desk/StayActs.tsx:63`, `reservations/NewBooking.tsx:791` | reservations/data/booking.ts:100 `viewVoucher` | GET `/stays/:id/voucher.pdf` | `reservation` create | "The voucher needs the connection to open." (the web's, passed as `offline`) | downloadToShare — **done** `5091fa6` |
| 3.13 | Expected check-in, Expected check-out, typed — `front-desk/WalkIn.tsx:425, 428`, `reservations/NewBooking.tsx:455, 458` | reservations/pages/BookingPage.tsx:1108, 1115 | unchanged | unchanged | unchanged | TimeField ×4, clearable — **done** `5091fa6` |
| 3.14 | Wake-up call: Day (the next 31), Time typed — `guest-services/WakeUpCalls.tsx:183, 188` | guest-services/pages/WakeUpCalls.tsx:166 (min today), 169 | unchanged | unchanged | unchanged | DateField (min the hotel's day) + TimeField — **done** `f4bffa1` |
| 3.15 | Valid from, Valid to; First night, Last night, typed — `contracts/Dialogs.tsx:171-172, 270-271` | contracts/components/ContractDialog.tsx:120, 124; AllotmentDialog.tsx:125, 130 | unchanged | unchanged | unchanged | DateField ×4 — **done** `16453d2` |

Stepped today (M-7) — optional: `front-desk/WalkIn.tsx:330`; `front-desk/StayActs.tsx:169, 170, 227,
305` (AmendStayFlow.tsx:165, 175; MoveRoomFlow.tsx:217; ExchangeRoomFlow.tsx:150);
`reservations/Waitlist.tsx:212, 216` (WaitlistDialog.tsx:78, 82); `reservations/NewBooking.tsx:369,
372` (BookingPage.tsx:900, 917). They all use `housekeeping/DayStepper.tsx`'s `Day`.
**Done** `e43c557` (lane m16-pick-front): every one of these is the phone's `DateField` now, with the web's bounds.

## Kept on the website, DPDP (not for the lanes, until the owner says otherwise)

- **A photo of the ID** at check-in and on a stay: `front-desk/Companions.tsx:114` (CheckIn.tsx,
  Stay.tsx:114) — the web's AddIdPhotoAtDesk, POST `/stays/:id/id-photo` multipart `front`, `back`,
  `agreed=yes` (online-checkin/data/desk.ts:159).
- **The guest's own ID photos** (the guest page's, online-checkin/data/guestPage.ts:269) and the kept
  photos list (`/id-photos`): not on the phone.
- Typed ID dates, already on the phone, a control swap only on the owner's word: the guest's ID
  fields `front-desk/GuestIdFields.tsx:35` (a document's dates, a birth date), Form C's passport and
  visa dates `finance/FormC.tsx:214`.

## Left out: grey for another reason

Printing a document the website draws (the registration card, the tax invoice, the VAT bill, a
docket, a key card, a stock sheet, the four non-voucher samples); Send voucher (a write, not a file);
Download Fidato Printer for Windows (`pos/SetupKot.tsx:63`: a Windows program); the store's Days,
Reports, Import, Add an item (`stores/Store.tsx:96`: kept as the desk's set-up; its Import would be
POST `/stores/import` like 2.4); the Rooming list (`reservations/Group.tsx:130`: the screen is not on
the phone — when built it needs pickFile(ROOMING_FILE) + base64For for POST `…/rooming-list/read`
`{ name, data }` and downloadToShare for GET `…/rooming-list?as=pdf|xlsx|csv`); a month box
(Marketing, Loyalty, GST, GroupReports' Month: stepped; DateField picks days); a report's server file
where the phone already makes its own (Export.tsx, M-14).
