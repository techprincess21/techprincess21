# eero Wi-Fi bridge (optional)

This is the part that flips Wi-Fi on/off based on chores. **The chore chart works
perfectly without it** — this just automates the "pause the kid's Wi-Fi" step you'd
otherwise tap by hand in the eero app.

## The honest truth about the eero "API"

eero (owned by Amazon) does **not** publish an official public API — there's no
developer portal, no OAuth, no documented endpoints. What *does* exist is the
**private API the eero mobile app itself uses**, which the community
reverse-engineered years ago. This bridge speaks that private API.

What that means for you:

- ✅ It genuinely works today, and pausing/unpausing a **Profile** (a kid + their
  devices) is exactly the operation it's good at.
- ⚠️ It can break whenever Amazon changes the app's backend.
- ⚠️ It's arguably against eero's Terms of Service. Use it on your own home
  network, at your own risk.
- 🔐 It requires logging in as *you* (the account owner). Your session token is
  stored locally in `.eero_session` — treat it like a password.

Prior art this is based on / alternatives worth knowing:

- [schmittx/home-assistant-eero](https://github.com/schmittx/home-assistant-eero) —
  the actively maintained **Home Assistant** integration. If you already run Home
  Assistant, that's the sturdier path: it exposes each Profile as a switch, and
  you can automate it however you like.
- [343max/eero-client](https://github.com/343max/eero-client) and
  [jrlucier/eero_tracker](https://github.com/jrlucier/eero_tracker) — the original
  auth/endpoint reverse-engineering this script follows.

### The fully-official option (no code, no risk)

eero Profiles integrate with **Amazon Alexa**. You can say *"Alexa, pause the
internet for Emma"* or build an Alexa Routine to schedule it. It's not a
programmable API, but if you'd rather avoid the unofficial route entirely, you can
have the kids/you trigger a pause through Alexa and keep the chore chart purely as
the tracker. See eero's own docs on Profiles + Alexa.

## How the bridge works

```
Chore chart (Apps Script)                 eero-bridge (this script, on a
  exposes  ?api=state&token=...    ─────▶   home computer / Raspberry Pi / Pi-hole box)
  → per-kid { wifiAllowed: true/false }      every few minutes it:
                                              1. reads that JSON
                                              2. matches each kid to an eero Profile by name
                                              3. Profile.paused = NOT wifiAllowed
```

It needs to run somewhere that's on most of the time — a Raspberry Pi, an
always-on desktop, a home server, etc. (Google Apps Script can't hold the eero
login securely, which is why this piece lives outside it.)

## Setup

1. **Install Python 3 and requests**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create your config**
   ```bash
   cp bridge.config.example.json bridge.config.json
   ```
   Fill in:
   - `chore_chart_url` — your Apps Script `/exec` URL
   - `bridge_token` — from the chore chart's ⚙ → **Settings** tab
   - `eero_login` — the email or phone on your eero account

3. **Log in to eero once** (sends a 6-digit code to your phone/email)
   ```bash
   python3 eero_bridge.py --login
   ```
   It prints the Profile names it can see — put those exact names in each kid's
   **"eero profile name"** field in the chore chart (⚙ → Kids).

4. **Try a dry run** (changes nothing, just shows the plan)
   ```bash
   python3 eero_bridge.py --once --dry-run
   ```

5. **Run it for real**
   ```bash
   python3 eero_bridge.py --once            # one pass
   python3 eero_bridge.py --interval 300    # re-check every 5 min, forever
   ```

### Keep it running (Linux, systemd)

```ini
# /etc/systemd/system/chore-wifi.service
[Unit]
Description=Chore Chart eero Wi-Fi bridge
After=network-online.target

[Service]
WorkingDirectory=/home/pi/chore-chart/eero-bridge
ExecStart=/usr/bin/python3 /home/pi/chore-chart/eero-bridge/eero_bridge.py --interval 300
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now chore-wifi
```

Or, simplest of all, a cron entry that runs one pass every 5 minutes:
```
*/5 * * * * cd /home/pi/chore-chart/eero-bridge && /usr/bin/python3 eero_bridge.py --once >> bridge.log 2>&1
```

## Safety notes

- The bridge only ever sets a Profile's `paused` flag. It doesn't touch network
  settings, devices, or anyone else's Profile.
- Consider making a dedicated Profile per kid in the eero app first, with just
  their devices in it, so pausing them never affects a shared device.
- If a kid's Profile name in eero and in the chore chart don't match, the bridge
  **skips** that kid (and says so) rather than guessing.
- Keep a manual override in mind: you can always un-pause in the eero app.
