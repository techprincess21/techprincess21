/**
 * Chore Chart — a lightweight family chore tracker that runs entirely inside
 * your own Google account as a Google Apps Script Web App. No servers, no
 * Vercel, no monthly bill. State is stored in this script's PropertiesService,
 * so there is nothing else to set up.
 *
 * It also exposes a tiny JSON endpoint (?api=state&token=...) that an optional
 * "eero bridge" can poll to unlock/lock each kid's Wi-Fi based on whether they
 * finished their chores. See eero-bridge/ for that part.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FIRST-TIME SETUP (do this once, in the Apps Script editor):
 *   1. Run  setup()  from the function dropdown and click "Review permissions".
 *      This seeds 3 kid profiles + starter chores and prints your admin PIN
 *      and bridge token to the Execution log (View → Logs).
 *   2. Deploy → New deployment → type "Web app".
 *        Execute as:  Me
 *        Who has access:  Anyone     (so the kids can open it without a Google login)
 *      Copy the /exec URL — that's the app. Bookmark it on each kid's device.
 *   3. (Optional) Wire up Wi-Fi: see eero-bridge/README.md.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Storage keys ────────────────────────────────────────────────────────────
var K_CONFIG = 'config';           // the kids, chores, rules, PINs (JSON)
var K_STATE_PREFIX = 'state:';      // per-day completion map, keyed by date

// ── Entry points ────────────────────────────────────────────────────────────

/**
 * Web app entry. Serves the HTML app for humans, or a JSON blob for the
 * eero bridge when called with ?api=state&token=<bridgeToken>.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};

  if (params.api === 'state') {
    var cfg = getConfig_();
    if (!cfg.bridgeToken || params.token !== cfg.bridgeToken) {
      return jsonOut_({ error: 'unauthorized' });
    }
    return jsonOut_(publicWifiState_(cfg));
  }

  var t = HtmlService.createTemplateFromFile('index');
  return t.evaluate()
    .setTitle('Chore Chart')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Lets index.html pull in shared markup/scripts if we ever split files. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ── Public API used by the front-end (google.script.run) ────────────────────

/** Everything the app needs to render for a normal (kid) view. No secrets. */
function getSnapshot() {
  var cfg = getConfig_();
  var today = todayKey_();
  var state = getState_(today);

  var requireApproval = !!cfg.requireApproval;
  var kids = cfg.kids.map(function (kid) {
    var byKid = state.completions[kid.id] || {};
    var chores = choresForKid_(cfg, kid.id).map(function (ch) {
      var rec = byKid[ch.id];
      var done = !!rec;
      var pending = done && requireApproval && !rec.approved;
      var counts = done && (!requireApproval || rec.approved); // counts toward Wi-Fi
      return { id: ch.id, title: ch.title, points: ch.points,
               requiredForWifi: ch.requiredForWifi,
               done: done, pending: pending, counts: counts };
    });
    var w = computeWifi_(cfg, chores);
    return {
      id: kid.id, name: kid.name, emoji: kid.emoji, color: kid.color,
      hasPin: !!kid.pin,
      chores: chores,
      doneCount: w.doneCount, totalCount: w.totalCount,
      points: w.points, pointsNeeded: w.pointsNeeded,
      wifiAllowed: w.wifiAllowed
    };
  });

  return {
    date: today,
    rule: cfg.rule,
    requireApproval: !!cfg.requireApproval,
    kids: kids
  };
}

/**
 * Toggle a chore for a kid. If the kid has a PIN it must match. If admin
 * approval is required, a kid check-off is marked "pending" until an adult
 * approves it (approvals happen in the admin panel).
 */
function toggleChore(kidId, choreId, pin) {
  var cfg = getConfig_();
  var kid = findById_(cfg.kids, kidId);
  if (!kid) throw new Error('Unknown kid.');
  if (kid.pin && String(pin || '') !== String(kid.pin)) {
    throw new Error('Wrong PIN.');
  }

  // Only real chores for this kid can be toggled.
  var allowed = choresForKid_(cfg, kidId).some(function (c) { return c.id === choreId; });
  if (!allowed) throw new Error('That chore is not assigned to this kid.');

  var today = todayKey_();
  return withStateLock_(function () {
    var state = getState_(today);
    var byKid = state.completions[kidId] || (state.completions[kidId] = {});
    if (byKid[choreId]) {
      delete byKid[choreId];
    } else {
      byKid[choreId] = { ts: nowIso_(), approved: !cfg.requireApproval };
    }
    putState_(today, state);
    return getSnapshot();
  });
}

// ── Admin API (PIN-gated) ───────────────────────────────────────────────────

function adminGetConfig(adminPin) {
  var cfg = requireAdmin_(adminPin);
  // Return a copy that still contains the tokens/PINs — the admin needs them.
  return cfg;
}

/** Replace the editable parts of the config (kids, chores, rule, settings). */
function adminSaveConfig(adminPin, incoming) {
  var cfg = requireAdmin_(adminPin);
  if (incoming.kids) cfg.kids = sanitizeKids_(incoming.kids);
  if (incoming.chores) cfg.chores = sanitizeChores_(incoming.chores, cfg.kids);
  if (incoming.rule) cfg.rule = sanitizeRule_(incoming.rule);
  if (typeof incoming.requireApproval === 'boolean') cfg.requireApproval = incoming.requireApproval;
  if (typeof incoming.adminPin === 'string' && incoming.adminPin.length >= 4) cfg.adminPin = incoming.adminPin;
  putConfig_(cfg);
  return cfg;
}

/** Approve or un-approve a pending completion (only matters if requireApproval). */
function adminSetApproval(adminPin, kidId, choreId, approved) {
  requireAdmin_(adminPin);
  var today = todayKey_();
  return withStateLock_(function () {
    var state = getState_(today);
    var byKid = state.completions[kidId];
    if (byKid && byKid[choreId]) {
      byKid[choreId].approved = !!approved;
      putState_(today, state);
    }
    return getSnapshot();
  });
}

/** Full admin view of today: who's done what, and what's pending approval. */
function adminGetToday(adminPin) {
  requireAdmin_(adminPin);
  return getSnapshot();
}

/** Wipe today's completions (a manual "reset the day"). */
function adminResetToday(adminPin) {
  requireAdmin_(adminPin);
  var today = todayKey_();
  putState_(today, { completions: {} });
  return getSnapshot();
}

// ── Wi-Fi state (for the eero bridge) ───────────────────────────────────────

/** The JSON the bridge polls. Contains no PINs or tokens. */
function publicWifiState_(cfg) {
  var today = todayKey_();
  var state = getState_(today);
  var requireApproval = !!cfg.requireApproval;
  var kids = cfg.kids.map(function (kid) {
    var byKid = state.completions[kid.id] || {};
    var chores = choresForKid_(cfg, kid.id).map(function (ch) {
      var rec = byKid[ch.id];
      var counts = !!rec && (!requireApproval || rec.approved);
      return { requiredForWifi: ch.requiredForWifi, points: ch.points, counts: counts };
    });
    var w = computeWifi_(cfg, chores);
    return {
      id: kid.id,
      name: kid.name,
      eeroProfile: kid.eeroProfile || kid.name, // name of the eero Profile to pause
      wifiAllowed: w.wifiAllowed,
      doneCount: w.doneCount,
      totalCount: w.totalCount
    };
  });
  return { date: today, kids: kids };
}

// ── Rule engine ─────────────────────────────────────────────────────────────

/**
 * Given a kid's chores (with done flags), decide whether Wi-Fi is earned.
 * rule.type === 'all'    → every Wi-Fi-required chore must be done (& approved)
 * rule.type === 'points' → approved points must reach rule.points
 */
function computeWifi_(cfg, chores) {
  var rule = cfg.rule || { type: 'all' };
  var required = chores.filter(function (c) { return c.requiredForWifi; });
  var doneCount = 0, points = 0;
  required.forEach(function (c) {
    // A chore only counts toward Wi-Fi when it's done AND (if approval is on) approved.
    if (c.counts) { doneCount++; points += (c.points || 1); }
  });
  var totalCount = required.length;
  var pointsNeeded = rule.type === 'points' ? (rule.points || 0) : null;

  var wifiAllowed;
  if (rule.type === 'points') {
    wifiAllowed = points >= (rule.points || 0);
  } else {
    // 'all' — if there are no required chores, default to allowed (nothing to do).
    wifiAllowed = totalCount === 0 ? true : doneCount === totalCount;
  }
  return { wifiAllowed: wifiAllowed, doneCount: doneCount, totalCount: totalCount,
           points: points, pointsNeeded: pointsNeeded };
}

function choresForKid_(cfg, kidId) {
  return cfg.chores.filter(function (ch) {
    return ch.kidIds === 'all' || (ch.kidIds || []).indexOf(kidId) !== -1;
  });
}

// ── Config + state persistence ──────────────────────────────────────────────

function getConfig_() {
  var raw = props_().getProperty(K_CONFIG);
  if (!raw) {
    var seeded = defaultConfig_();
    putConfig_(seeded);
    return seeded;
  }
  return JSON.parse(raw);
}
function putConfig_(cfg) { props_().setProperty(K_CONFIG, JSON.stringify(cfg)); }

function getState_(dateKey) {
  var raw = props_().getProperty(K_STATE_PREFIX + dateKey);
  return raw ? JSON.parse(raw) : { completions: {} };
}
function putState_(dateKey, state) {
  props_().setProperty(K_STATE_PREFIX + dateKey, JSON.stringify(state));
}

function props_() { return PropertiesService.getScriptProperties(); }

function withStateLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function requireAdmin_(adminPin) {
  var cfg = getConfig_();
  if (!cfg.adminPin || String(adminPin || '') !== String(cfg.adminPin)) {
    throw new Error('Wrong admin PIN.');
  }
  return cfg;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function todayKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}
function findById_(arr, id) {
  for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
  return null;
}
function slug_(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('id' + Math.floor(Math.random() * 1e6));
}
function randToken_(n) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';
  var out = '';
  for (var i = 0; i < (n || 24); i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

// ── Sanitizers (defend the store against bad admin input) ────────────────────

function sanitizeKids_(kids) {
  return (kids || []).slice(0, 12).map(function (k) {
    return {
      id: k.id || slug_(k.name),
      name: String(k.name || 'Kid').slice(0, 40),
      emoji: String(k.emoji || '🙂').slice(0, 4),
      color: /^#[0-9a-fA-F]{6}$/.test(k.color || '') ? k.color : '#7c9cff',
      pin: k.pin ? String(k.pin).replace(/\D/g, '').slice(0, 8) : '',
      eeroProfile: String(k.eeroProfile || k.name || '').slice(0, 60)
    };
  });
}
function sanitizeChores_(chores, kids) {
  var kidIds = kids.map(function (k) { return k.id; });
  return (chores || []).slice(0, 100).map(function (c) {
    var assigned = c.kidIds === 'all' ? 'all'
      : (Array.isArray(c.kidIds) ? c.kidIds.filter(function (id) { return kidIds.indexOf(id) !== -1; }) : 'all');
    return {
      id: c.id || slug_(c.title) + '-' + randToken_(3),
      title: String(c.title || 'Chore').slice(0, 80),
      points: Math.max(0, Math.min(100, parseInt(c.points, 10) || 1)),
      requiredForWifi: c.requiredForWifi !== false,
      kidIds: assigned
    };
  });
}
function sanitizeRule_(rule) {
  var type = rule && rule.type === 'points' ? 'points' : 'all';
  return { type: type, points: Math.max(0, parseInt(rule && rule.points, 10) || 0) };
}

// ── Seed data ────────────────────────────────────────────────────────────────

function defaultConfig_() {
  var kids = [
    { id: 'kid1', name: 'Kid One',   emoji: '🦊', color: '#7c9cff', pin: '', eeroProfile: 'Kid One' },
    { id: 'kid2', name: 'Kid Two',   emoji: '🐼', color: '#65d6a3', pin: '', eeroProfile: 'Kid Two' },
    { id: 'kid3', name: 'Kid Three', emoji: '🦄', color: '#ff9ec7', pin: '', eeroProfile: 'Kid Three' }
  ];
  var chores = [
    { id: 'bed',     title: 'Make your bed',        points: 1, requiredForWifi: true, kidIds: 'all' },
    { id: 'teeth',   title: 'Brush teeth',          points: 1, requiredForWifi: true, kidIds: 'all' },
    { id: 'dishes',  title: 'Clear your dishes',    points: 1, requiredForWifi: true, kidIds: 'all' },
    { id: 'homework',title: 'Homework / reading',   points: 2, requiredForWifi: true, kidIds: 'all' },
    { id: 'tidy',    title: 'Tidy your room',       points: 1, requiredForWifi: false, kidIds: 'all' }
  ];
  return {
    kids: kids,
    chores: chores,
    rule: { type: 'all', points: 0 },  // "all required chores done" unlocks Wi-Fi
    requireApproval: false,            // set true to make an adult confirm each chore
    adminPin: String(1000 + Math.floor(Math.random() * 9000)), // 4-digit
    bridgeToken: randToken_(28)
  };
}

/**
 * Run this ONCE from the editor to seed defaults and print your secrets.
 * Safe to re-run: it won't overwrite an existing config.
 */
function setup() {
  var existing = props_().getProperty(K_CONFIG);
  var cfg = existing ? JSON.parse(existing) : defaultConfig_();
  if (!existing) putConfig_(cfg);
  Logger.log('Chore Chart is ready.');
  Logger.log('Admin PIN:    %s   (use this to open the ⚙ admin panel)', cfg.adminPin);
  Logger.log('Bridge token: %s   (put this in eero-bridge config; keep it secret)', cfg.bridgeToken);
  Logger.log('Next: Deploy → New deployment → Web app (Execute as: Me, Access: Anyone).');
  return { adminPin: cfg.adminPin, bridgeToken: cfg.bridgeToken };
}

/** Rotate the bridge token (run from the editor if it ever leaks). */
function rotateBridgeToken() {
  var cfg = getConfig_();
  cfg.bridgeToken = randToken_(28);
  putConfig_(cfg);
  Logger.log('New bridge token: %s', cfg.bridgeToken);
  return cfg.bridgeToken;
}
