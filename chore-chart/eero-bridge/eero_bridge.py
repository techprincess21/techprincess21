#!/usr/bin/env python3
"""
eero_bridge.py — the OPTIONAL Wi-Fi half of the Chore Chart.

It reads each kid's chore status from your Google Apps Script chore chart and
pauses/unpauses that kid's **eero Profile** so Wi-Fi turns on only when chores
are done.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANT — READ THIS FIRST
    eero does NOT publish an official public API. This script talks to the same
    *private* API the eero mobile app uses, which the community reverse-engineered
    (see README). That means:
      • It can break any time Amazon/eero changes their app's backend.
      • It may be against eero's Terms of Service — use on your own network,
        at your own risk. The chore chart itself works fine without this bridge;
        this only automates the "pause Wi-Fi" step you'd otherwise do by hand.
    A more battle-tested alternative is the Home Assistant eero integration
    (schmittx/home-assistant-eero) — see README for when to prefer that.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage:
    # 1) one-time: log in to eero (sends you a 6-digit code by SMS/email)
    python3 eero_bridge.py --login

    # 2) see what it *would* do, without changing anything
    python3 eero_bridge.py --once --dry-run

    # 3) apply once (pause/unpause to match chores)
    python3 eero_bridge.py --once

    # 4) run forever, re-checking every 5 minutes
    python3 eero_bridge.py --interval 300

Config lives in  bridge.config.json  (copy bridge.config.example.json).
Only dependency:  requests   ->   pip install requests
"""

import argparse
import json
import os
import sys
import time
import urllib.request  # only for the chore-chart fetch (no extra dep needed)

try:
    import requests
except ImportError:
    sys.exit("This script needs the 'requests' package:  pip install requests")

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "bridge.config.json")
SESSION_PATH = os.path.join(HERE, ".eero_session")  # stores your eero token (keep private!)

EERO_API = "https://api-user.e2ro.com"


# ── config ──────────────────────────────────────────────────────────────────
def load_config():
    if not os.path.exists(CONFIG_PATH):
        sys.exit(
            "Missing bridge.config.json.\n"
            "  cp bridge.config.example.json bridge.config.json\n"
            "then fill in your chore-chart URL, bridge token, and login."
        )
    with open(CONFIG_PATH) as f:
        return json.load(f)


def load_session_token():
    if os.path.exists(SESSION_PATH):
        with open(SESSION_PATH) as f:
            return f.read().strip()
    return None


def save_session_token(tok):
    with open(SESSION_PATH, "w") as f:
        f.write(tok)
    os.chmod(SESSION_PATH, 0o600)  # readable only by you
    print(f"Saved eero session token to {SESSION_PATH}")


# ── eero private API client ─────────────────────────────────────────────────
class Eero:
    """Minimal client for the private eero API. Cookie-based auth: `s=<token>`."""

    def __init__(self, token=None):
        self.token = token
        self.s = requests.Session()
        self.s.headers.update({"content-type": "application/json"})

    def _cookies(self):
        return {"s": self.token} if self.token else {}

    def _url(self, path):
        # API returns resource paths like "/2.2/networks/123"; make them absolute.
        return path if path.startswith("http") else (EERO_API + path)

    def _get(self, path):
        r = self.s.get(self._url(path), cookies=self._cookies())
        r.raise_for_status()
        return r.json().get("data")

    def _put(self, path, body):
        r = self.s.put(self._url(path), data=json.dumps(body), cookies=self._cookies())
        r.raise_for_status()
        return r.json().get("data")

    # -- login (two steps: request code, then verify) --
    def login_start(self, login):
        r = self.s.post(EERO_API + "/2.2/login", data=json.dumps({"login": login}))
        r.raise_for_status()
        self.token = r.json()["data"]["user_token"]
        return self.token

    def login_verify(self, code):
        r = self.s.post(
            EERO_API + "/2.2/login/verify",
            data=json.dumps({"code": str(code).strip()}),
            cookies=self._cookies(),
        )
        r.raise_for_status()
        return r.json().get("data")

    # -- data --
    def account(self):
        return self._get("/2.2/account")

    def networks(self):
        acct = self.account()
        return (acct.get("networks") or {}).get("data") or []

    def profiles(self, network_url):
        """Return the list of Profiles for a network (each has name + paused + url)."""
        net = self._get(network_url)
        profiles = (net.get("profiles") or {})
        # Some responses inline the profiles; others give just a resource url.
        if profiles.get("data"):
            return profiles["data"]
        return self._get(network_url.rstrip("/") + "/profiles") or []

    def set_profile_paused(self, profile_url, paused):
        return self._put(profile_url, {"paused": bool(paused)})


# ── chore-chart fetch ───────────────────────────────────────────────────────
def fetch_chore_state(base_url, token):
    """GET the Apps Script JSON: {date, kids:[{name, eeroProfile, wifiAllowed,...}]}."""
    sep = "&" if "?" in base_url else "?"
    url = f"{base_url}{sep}api=state&token={token}"
    req = urllib.request.Request(url, headers={"User-Agent": "chore-chart-bridge"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"Chore chart said: {data['error']} (check your bridge token)")
    return data


# ── commands ────────────────────────────────────────────────────────────────
def cmd_login(cfg):
    login = cfg.get("eero_login") or input("eero email or phone number: ").strip()
    eero = Eero()
    eero.login_start(login)
    print(f"A 6-digit verification code was sent to {login}.")
    code = input("Enter the code: ").strip()
    eero.login_verify(code)
    # The user_token from login_start is now a validated session token.
    save_session_token(eero.token)
    # Sanity check + show the profiles you can control.
    try:
        for net in eero.networks():
            name = net.get("name", "network")
            print(f"\nNetwork: {name}")
            for p in eero.profiles(net["url"]):
                print(f"   • Profile: {p.get('name')!r}  (paused={p.get('paused')})")
        print("\nLogin OK. Use these Profile names in your kids' 'eero profile name' field.")
    except Exception as e:
        print(f"Logged in, but couldn't list profiles yet: {e}")


def build_profile_index(eero):
    """Map lowercased profile name -> profile dict (with url), across all networks."""
    index = {}
    for net in eero.networks():
        for p in eero.profiles(net["url"]):
            nm = (p.get("name") or "").strip().lower()
            if nm:
                index[nm] = p
    return index


def cmd_sync(cfg, once, interval, dry_run):
    token = load_session_token()
    if not token:
        sys.exit("Not logged in to eero. Run:  python3 eero_bridge.py --login")
    base_url = cfg["chore_chart_url"]
    bridge_token = cfg["bridge_token"]

    def one_pass():
        state = fetch_chore_state(base_url, bridge_token)
        eero = Eero(token)
        profiles = build_profile_index(eero)
        print(f"[{state.get('date')}] chore chart ->")
        for kid in state.get("kids", []):
            want_wifi = bool(kid.get("wifiAllowed"))
            profile_name = (kid.get("eeroProfile") or kid.get("name") or "").strip()
            p = profiles.get(profile_name.lower())
            status = f"{kid.get('doneCount')}/{kid.get('totalCount')} chores"
            if not p:
                print(f"   ⚠️  {kid.get('name')}: no eero Profile named {profile_name!r} — skipped ({status})")
                continue
            should_pause = not want_wifi  # paused = internet OFF
            currently_paused = bool(p.get("paused"))
            verb = "unlock 📶" if want_wifi else "lock 🚫"
            if should_pause == currently_paused:
                print(f"   ✓ {kid.get('name')}: already {'locked' if currently_paused else 'unlocked'} ({status})")
                continue
            if dry_run:
                print(f"   ~ {kid.get('name')}: WOULD {verb}  [{status}]  (dry-run)")
            else:
                eero.set_profile_paused(p["url"], should_pause)
                print(f"   → {kid.get('name')}: {verb}  [{status}]")

    if once:
        one_pass()
        return
    print(f"Watching every {interval}s. Ctrl-C to stop.")
    while True:
        try:
            one_pass()
        except Exception as e:
            print(f"   (error this pass, will retry: {e})")
        time.sleep(interval)


# ── entry ───────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Tie chore completion to eero Wi-Fi (unofficial).")
    ap.add_argument("--login", action="store_true", help="Log in to eero (one-time).")
    ap.add_argument("--once", action="store_true", help="Do a single sync pass and exit.")
    ap.add_argument("--interval", type=int, default=0, help="Loop forever, N seconds between passes.")
    ap.add_argument("--dry-run", action="store_true", help="Show what would change without changing it.")
    args = ap.parse_args()

    cfg = load_config()
    if args.login:
        cmd_login(cfg)
    elif args.once or args.interval:
        cmd_sync(cfg, once=args.once, interval=args.interval or 300, dry_run=args.dry_run)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
