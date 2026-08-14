# 🏆 Chore Chart

A lightweight family chore tracker that runs **entirely inside your own Google
account** as a Google Apps Script Web App. No Vercel, no servers, no monthly bill,
no npm. Kids open a link, tap off their chores, and — optionally — **their Wi-Fi
unlocks when they're done**.

- 👧🧒👦 One card per kid (ships with 3, add as many as you want), optional per-kid PIN
- ✅ Big tappable chores; a clear "Wi-Fi locked / unlocked" status per kid
- ⚙️ Grown-up panel (PIN-protected): edit kids & chores, set the unlock rule,
  optionally require a parent to approve each chore, reset the day
- 🔄 Daily auto-reset (chores clear each day, per your Google timezone)
- 📶 Optional **eero Wi-Fi bridge** that pauses/unpauses each kid's eero Profile
  based on chores — see [`eero-bridge/`](eero-bridge/)

Everything is stored in the script's own properties — there's no database or
spreadsheet to set up.

---

## Quick start (about 5 minutes)

### 1. Create the Apps Script project
1. Go to **[script.google.com](https://script.google.com)** → **New project**.
2. Delete the default `Code.gs` content. Copy in the contents of
   [`Code.gs`](Code.gs) from this folder.
3. Click the **+** next to *Files* → **HTML** → name it exactly **`index`** →
   paste in the contents of [`index.html`](index.html).
4. (Optional but nice) Project Settings ⚙ → **Show `appsscript.json`** →
   paste in [`appsscript.json`](appsscript.json) to set your timezone and the
   web-app access. Otherwise the defaults are fine.

> Prefer the command line? You can push all three files with Google's
> [`clasp`](https://github.com/google/clasp) tool instead — this folder is already
> laid out for it (`clasp create --type webapp`, then `clasp push`).

### 2. Seed it and get your PINs
1. In the editor's function dropdown pick **`setup`** and click **Run**.
2. Approve the permission prompt (it's your own account and script).
3. Open **View → Logs** (or Execution log). Copy down:
   - **Admin PIN** — opens the ⚙ grown-up panel
   - **Bridge token** — only needed later for the eero bridge

### 3. Deploy the web app
1. **Deploy → New deployment → Select type → Web app.**
2. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*  ← so kids can open it without a Google login
3. **Deploy**, authorize, and copy the **Web app URL** (ends in `/exec`).
4. Bookmark that URL on each kid's device / add it to the home screen.

That's the whole app. 🎉

### 4. Make it yours
Open the app, tap ⚙, enter the admin PIN, and:
- **Kids** — rename the 3 starter kids (or add more), pick emojis, set optional PINs.
- **Chores** — edit the starter chores, assign to *Everyone* or one kid, mark which
  ones are *required for Wi-Fi* vs. bonus "extra" chores.
- **Settings** — choose the unlock rule (*do all Wi-Fi chores* or *reach a points
  target*), optionally require your approval on each chore, change the admin PIN.

---

## How "earning Wi-Fi" is decided

Each kid earns Wi-Fi when their chores satisfy the **unlock rule**:

| Rule | Wi-Fi unlocks when… |
|------|---------------------|
| **All Wi-Fi chores** (default) | every chore marked *required for Wi-Fi* is done |
| **Points target** | the points from completed Wi-Fi chores reach your target |

"Extra" chores (Wi-Fi box unchecked) still show up and can carry points, but they
don't gate Wi-Fi.

If you turn on **approvals**, a kid's check-off shows as *waiting for grown-up* and
doesn't count toward Wi-Fi until you approve it in ⚙ → **Today**.

---

## Connecting it to real Wi-Fi (eero)

Short version: **eero has no official public API**, but its Profiles *can* be
paused/unpaused through the private API its own app uses, and the optional bridge
in [`eero-bridge/`](eero-bridge/) does exactly that. It reads this app's status
endpoint and flips each kid's eero Profile.

That folder's [README](eero-bridge/README.md) covers the full story — the
reverse-engineered API, the risks and Terms-of-Service caveat, the sturdier Home
Assistant alternative, and the fully-official (no-code) Alexa route. Read it before
wiring up Wi-Fi.

The status endpoint the bridge uses:
```
GET  <your /exec URL>?api=state&token=<bridge token>
→   { "date": "2026-08-14",
      "kids": [ { "name": "...", "eeroProfile": "...", "wifiAllowed": true,
                  "doneCount": 3, "totalCount": 4 }, ... ] }
```
It contains **no PINs and no chore details** — only each kid's name, their eero
Profile name, and whether Wi-Fi is currently earned. It's gated by the bridge
token; rotate the token any time by running `rotateBridgeToken()` in the editor.

---

## FAQ

**Does this cost anything?** No. Google Apps Script web apps are free on a normal
Google account.

**Where's the data stored?** In the script's own `PropertiesService` (part of your
Apps Script project). Nothing leaves your Google account except the Wi-Fi status
the bridge reads, if you set the bridge up.

**Can the kids cheat by editing chores?** Editing anything requires the admin PIN.
Kids can only check/uncheck their own chores (and only enter their own PIN if you
set one).

**How do I reset the day early?** ⚙ → **Today** → *Reset today*. Otherwise it
resets automatically at midnight in the timezone set in `appsscript.json`.

**How do I add a 4th/5th kid?** ⚙ → **Kids** → *Add kid*. No limit that matters
for a household.

**I want to change what a kid sees without code.** That's the whole point — kids,
chores, rules, and PINs are all editable in the ⚙ panel; the code never needs to
change.

---

## Files
```
chore-chart/
├── Code.gs                     the Apps Script backend (paste into script.google.com)
├── index.html                  the app UI (add as an HTML file named "index")
├── appsscript.json             manifest: timezone + web-app access
└── eero-bridge/                optional Wi-Fi automation
    ├── eero_bridge.py          reads chore status, pauses/unpauses eero Profiles
    ├── bridge.config.example.json
    ├── requirements.txt
    └── README.md               the eero reality check + setup
```
