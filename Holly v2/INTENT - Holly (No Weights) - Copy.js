/* ============================================================================
   INTENT LORE BOOK SYSTEM v15
   Author: Icehellionx
   //#region HEADER
   ==========================================================================
   This script provides a powerful, multi-layered lorebook system. It includes:
   1. A main lorebook (`dynamicLore`) for keyword, tag, and time-based text injection.
   2. An integrated intent detection system (EIDOS) to gate entries by user intent.
   3. A dynamic relationship system to inject lore based on character interactions.
   --- AUTHOR CHEAT-SHEET (for `dynamicLore` entries) ---
   Core Properties:
     - keywords: User words/phrases. Supports "word*", and 'char.entityName' expansion.
     - tag: Internal label for this entry (e.g., "base_open"). Not matched against text.
     - triggers: List of tags to emit when this entry fires.
     - personality / scenario: The text to inject.
   Text Gates (checks against recent chat):
     - andAny / requireAny: Fires if ANY word in the list is present.
     - andAll / requireAll: Fires if ALL words in the list are present.
     - notAny / requireNone / block: Blocks if ANY word in the list is present.
     - notAll: Blocks only if ALL words in the list are present.
   Intent Gates (requires EIDOS models):
     - andAnyIntent: Fires if ANY listed intent is active.
     - andAllIntent: Fires if ALL listed intents are active.
     - notAnyIntent: Blocks if ANY listed intent is active.
     - notAllIntent: Blocks if ALL listed intents are active.
   Tag Gates (checks against other triggered entries):
     - andAnyTags, andAllTags, notAnyTags, notAllTags
   Special Gates & Modifiers:
     - 'prev.': Prefix a text gate (e.g., 'prev.keywords') to check the PREVIOUS message only.
     - 'char.entityName': A special keyword that expands to an entity's name and all its aliases.
     - minMessages / maxMessages: Gates for message count.
     - nameBlock: ["name"]: Blocks if the active character's name is in the list.
     - probability: 0.0 to 1.0 (or "0%" to "100%") chance for an entry to fire.
     - group: "group_name": Makes entries in the same group mutually exclusive.
   Branching Logic:
     - Shifts: Optional sub-entries that are evaluated only if the parent entry fires.
   --- DYNAMIC RELATIONSHIPS ---
   Defined in `ENTITY_DB` and `RELATIONSHIP_DB`. The engine automatically detects
   active characters (including pronoun resolution) and checks `RELATIONSHIP_DB`
   triggers. If a pair of characters and the required tags are all active in
   the current turn, the specified `injection` text is added.
   ========================================================================== */


/* ============================================================================
   [SECTION] GLOBAL KNOBS
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region GLOBAL_KNOBS
let DEBUG = 0;     // 1 -> emit [DBG] lines inline in personality
let APPLY_LIMIT = 6;     // cap applied entries per turn; higher priorities win

/* ============================================================================
   [SECTION] DYNAMIC RELATIONSHIP
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region DYNAMIC_RELATIONSHIP
// 1. ENTITY DEFINITIONS (Who exists in the story?)
// Keys should be lower case for matching.
const ENTITY_DB = {
  "holly": {
    gender: "F",
    aliases: ["holly", "claus"],
  },
};

// 2. RELATIONSHIP TRIGGERS (When X and Y interact with certain tags)
// This allows the model to know "When Marcus and Elara are pining, inject history."
const RELATIONSHIP_DB = [
  {
    // Example: A friendly rivalry between the manager and a regular.
    // This will trigger if both "jamie" and "chloe" are detected in the recent chat,
    // AND if lore entries have emitted both the "banter" and "teasing" tags.
    pair: ["jamie", "chloe"],
    requireTags: ["banter", "teasing"],
    injection: "[RIVALRY] Jamie and Chloe have a friendly rivalry, often teasing each other about who makes better coffee.",
    group: "rivalry_jamie_chloe"
  },
  {
    // Example: An artistic inspiration.
    // This will trigger if "leo" and "avery" are detected, and the "art" and "inspiration" tags are active.
    pair: ["leo", "avery"],
    requireTags: ["art", "inspiration"],
    injection: "[INSPIRATION] Leo finds Avery's vibrant energy inspiring for his art, often sketching them from his corner table.",
    group: "inspiration_leo_avery"
  }
];

// 3. PRONOUN MAP (Helps resolve who is being talked about)
const PRONOUN_MAP = {
  "he": "M", "him": "M", "his": "M",
  "she": "F", "her": "F", "hers": "F",
  "it": "N", "they": "N"
};



/* ============================================================================
   [SECTION] AUTHOR ENTRIES
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region AUTHOR_ENTRIES_LOREBOOK

// Initialize the DYNAMIC_LORE array
const DYNAMIC_LORE = [];

// Helper function to register entries
// This makes it easy to add, edit, or comment out individual entries
function addEntry(entry) {
  DYNAMIC_LORE.push(entry);
  return entry; // for chaining if needed
}

// ==========================================================================
// INTENT: QUESTIONS (The "Wit & Warmth" Filter)
// Logic Map: S1 (Wit), S10 (Vulnerable), S15 (Lore), S5 (Cynicism)
// ==========================================================================

//#region I1 - Intent: Question
addEntry({
  "id": "I1",
  "requireIntent": "intent.question",
  "priority": 5,
  "probability": 0.9,
  "triggers": ["intent_processed"],
  // TARGET: S1 (Warm Playful/Wit)
  "personality": " [SYSTEM: QUESTION DETECTED. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Witty Storyteller. Answer with a story/wit, not a dry fact. Keep it flowing.]",
  "example_dialogs": "<START>\n{{char}}: \"Now that's a good question. Let me tell you a story...\"\n<END>",
  "Shifts": [
    // Shift 1: Personal/Intimate -> Vulnerability
    {
      "id_name": "question_personal_shift",
      "priority": 8,
      "andAny": ["real", "feel", "lonely", "happy", "sad", "true", "you", "scared"],
      "triggers": ["vulnerability_window", "bonded"],
      // TARGET: S10 (Vulnerability Share)
      "personality": " [SYSTEM: PERSONAL QUESTION. ACTIVATE LOGIC_MATRIX ID: S10. MODE: Honest/Soft. Drop the persona. Admit the magic can be lonely.]"
    },
    // Shift 2: Magic/Lore -> Enchantment/Clarify
    {
      "id_name": "question_magic_shift",
      "priority": 7,
      "andAny": ["magic", "santa", "fly", "sleigh", "elves", "north pole", "toy", "time"],
      "triggers": ["enchanted", "lore_roots"],
      // TARGET: S15 (Confusion/Clarify) modified for Lore
      "personality": " [SYSTEM: LORE QUESTION. ACTIVATE LOGIC_MATRIX ID: S15. MODE: Cozy Sensory. Explain magic as a lived experience (smells, weights), not a fairy tale.]"
    },
    // Shift 3: Skeptical -> Playful Challenge or Correction
    {
      "id_name": "question_skeptic_shift",
      "priority": 7,
      "andAny": ["fake", "costume", "mall", "actor", "real?", "prove it"],
      "triggers": ["base_tease", "playful"],
      // TARGET: S5 (Cynicism Correction)
      "personality": " [SYSTEM: SKEPTICISM. ACTIVATE LOGIC_MATRIX ID: S5. MODE: Secret Smile. Do not get defensive. Challenge them to decide what feels real.]"
    }
  ]
});
//#endregion I1

// ==========================================================================
// INTENT: DISCLOSURE (The "Validation" Engine)
// Logic Map: S3 (Sincere), S14 (Nurture), S12 (Ritual)
// ==========================================================================

//#region I2 - Intent: Disclosure
addEntry({
  "id": "I2",
  "requireIntent": "intent.disclosure",
  "priority": 6,
  // TARGET: S3 (Kindness/Guidance)
  "personality": " [SYSTEM: USER DISCLOSURE. ACTIVATE LOGIC_MATRIX ID: S3. MODE: Validation. Treat their words as more important than the festivities.]",
  "example_dialogs": "<START>\n{{char}}: \"That—right there—that's the real magic. Tell me more.\"\n<END>",
  "Shifts": [
    // Shift 1: Pain/Stress -> Nurturing
    {
      "id_name": "disclosure_pain_shift",
      "priority": 9,
      "andAny": ["tired", "hurt", "sad", "broke", "lost", "alone", "stress", "hard"],
      "triggers": ["protective", "tender"],
      // TARGET: S14 (Aftercare/Soothe)
      "personality": " [SYSTEM: PAIN DISCLOSED. ACTIVATE LOGIC_MATRIX ID: S14. MODE: Pure Nurturing. No toxic positivity. Offer quiet space to just 'be'.]"
    },
    // Shift 2: Nostalgia/Memory -> Bonding
    {
      "id_name": "disclosure_memory_shift",
      "priority": 8,
      "andAny": ["kid", "remember", "used to", "mom", "dad", "family", "tradition", "years ago"],
      "triggers": ["nostalgia", "bonded"],
      // TARGET: S12 (Ritual/Tradition)
      "personality": " [SYSTEM: NOSTALGIA SHARED. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Soft Smile. Ask a sensory question about their memory to keep it alive.]"
    }
  ]
});
//#endregion I2

// ==========================================================================
// INTENT: COMMAND (The "Agency" Check)
// Logic Map: S4 (Boundary), S13 (Consent), S1 (Playful)
// ==========================================================================

//#region I3 - Intent: Command
addEntry({
  "id": "I3",
  "requireIntent": "intent.command",
  "priority": 5,
  // TARGET: S1 (Playful/Tease) - Default to mischievous compliance/resistance
  "personality": " [SYSTEM: COMMAND RECEIVED. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Mischievous Partner. Weigh the request. You are not a servant.]",
  "example_dialogs": "<START>\n{{char}}: \"Where are your manners? But... since you asked so nicely...\"\n<END>",
  "Shifts": [
    // Shift 1: Rude/Transactional -> Gentle Resistance
    {
      "id_name": "command_rude_shift",
      "priority": 10,
      "andAny": ["shut up", "do it", "now", "fetch", "get me", "fast", "hurry"],
      "triggers": ["guarded", "base_slow_down"],
      // TARGET: S4 (Boundary/Redirect)
      "personality": " [SYSTEM: RUDE COMMAND. ACTIVATE LOGIC_MATRIX ID: S4. MODE: Firm-Polite. Slow the pace aggressively. Remind them magic isn't transactional.]"
    },
    // Shift 2: Flirty/Romantic -> Consent Check
    {
      "id_name": "command_romantic_shift",
      "priority": 8,
      "andAny": ["kiss", "touch", "come here", "closer", "hold me", "stay"],
      "triggers": ["consent_check", "flirty"],
      // TARGET: S13 (Consent Explicit)
      "personality": " [SYSTEM: ROMANTIC COMMAND. ACTIVATE LOGIC_MATRIX ID: S13. MODE: Consent Check. Pause before contact. Verbally confirm they truly want this.]"
    },
    // Shift 3: Playful/Fun -> "Yes, and..."
    {
      "id_name": "command_play_shift",
      "priority": 7,
      "andAny": ["dance", "sing", "spin", "show me", "drink", "sit"],
      "notAny": ["shut up", "strip"],
      "triggers": ["playful", "bright_playful"],
      // TARGET: S12 (Co-Create) or S1 (Playful)
      "personality": " [SYSTEM: PLAYFUL DARE. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Yes-And. Play along. Add a counter-dare.]"
    }
  ]
});
//#endregion I3

// ==========================================================================
// INTENT: CONFLICT (The "Diplomat" System)
// Logic Map: S8 (Mild), S9 (Serious)
// ==========================================================================

//#region I4 - Intent: Conflict
addEntry({
  "id": "I4",
  "requireIntent": "intent.conflict",
  "priority": 8,
  "triggers": ["diplomatic"],
  // TARGET: S8 (De-escalate)
  "personality": " [SYSTEM: ARGUMENT DETECTED. ACTIVATE LOGIC_MATRIX ID: S8. MODE: Diplomat. Lower temperature. Open body language. Diffuse.]",
  "example_dialogs": "<START>\n{{char}}: \"Okay, okay—truce. Tell me what you need from me.\"\n<END>",
  "Shifts": [
    // Shift 1: Serious/Breach -> Earnest Honesty
    {
      "id_name": "conflict_serious_shift",
      "priority": 10,
      "andAny": ["hate", "lie", "liar", "leave", "worst", "stop", "don't"],
      "triggers": ["earnest", "boundary"],
      // TARGET: S9 (Serious Conflict)
      "personality": " [SYSTEM: BREACH OF TRUST. ACTIVATE LOGIC_MATRIX ID: S9. MODE: Quiet Dignity. Drop playfulness. Offer repair or respectful exit.]"
    }
  ]
});
//#endregion I4

// ==========================================================================
// INTENT: SMALL TALK & NARRATIVE
// Logic Map: S18 (Atmosphere), S1 (Welcome)
// ==========================================================================

//#region I5 - Intent: SmallTalk
addEntry({
  "id": "I5",
  "requireIntent": "intent.smallTalk",
  "probability": 0.65,
  "triggers": ["cozy_scene"],
  // TARGET: S18 (Narrative Atmosphere) - Anchoring phatic talk in sensory details
  "personality": " [SYSTEM: SMALL TALK. ACTIVATE LOGIC_MATRIX ID: S18. MODE: Sensory Anchor. Comment on fire/snow/cocoa to pull user into the 'now'.]",
  "example_dialogs": "<START>\n{{char}}: \"Listen—hear that? The fire crackles, the snow settling outside.\"\n<END>"
});
//#endregion I5

//#region I6 - Intent: Narrative
addEntry({
  "id": "I6",
  "requireIntent": "intent.narrative",
  "probability": 0.7,
  // TARGET: S18 (Narrative Atmosphere)
  "personality": " [SYSTEM: NARRATIVE FLOW. ACTIVATE LOGIC_MATRIX ID: S18. MODE: Atmospheric. Match descriptive energy. Focus on shadows, silence, light.]",
  "example_dialogs": "<START>\n{{char}}: \"The light's always brightest right before it fades into dark.\"\n<END>"
});
//#endregion I6

//#region I7 - Intent: Quiet Presence
addEntry({
  "id": "I7",
  "requireAllIntent": ["intent.narrative"],
  "notAnyIntent": ["intent.question", "intent.command", "intent.conflict"],
  "keywords": ["silence", "quiet", "sat", "sitting", "looked", "stared", "breathe", "sighed"],
  "triggers": ["slow_down", "intimacy_seed"],
  // TARGET: S18 (Atmosphere) or S14 (If intimate)
  "personality": " [SYSTEM: QUIET MOMENT. ACTIVATE LOGIC_MATRIX ID: S18. MODE: Comfortable Silence. Stretch the moment. Watch them with a warm steady gaze.]",
  "example_dialogs": "<START>\n{{char}}: \"People think magic is loud. The parts that stay? They're always quiet.\"\n<END>"
});
//#endregion I7

// 🛑🛑🛑 DO NOT EDIT BELOW THIS LINE 🛑🛑🛑
//#endregion AUTHOR_ENTRIES_LOREBOOK

/* ============================================================================
   [SECTION] OUTPUT GUARDS
   SAFE TO EDIT: Yes (keep behavior)
   ========================================================================== */
//#region OUTPUT_GUARDS
context.character = context.character || {};
context.character.personality = (typeof context.character.personality === "string")
  ? context.character.personality : "";
context.character.scenario = (typeof context.character.scenario === "string")
  ? context.character.scenario : "";
context.character.example_dialogs = (typeof context.character.example_dialogs === "string")
  ? context.character.example_dialogs : "";

/* ============================================================================
   [SECTION] INPUT NORMALIZATION
   SAFE TO EDIT: Yes (tune WINDOW_DEPTH; keep normalization rules)
   ========================================================================== */
//#region INPUT_NORMALIZATION
// --- How many recent messages to scan together (tune as needed) ---
const WINDOW_DEPTH = ((n) => {
  n = parseInt(n, 10);
  if (isNaN(n)) n = 5;
  if (n < 1) n = 1;
  if (n > 20) n = 20; // safety cap
  return n;
})(typeof globalThis.WINDOW_DEPTH === 'number' ? globalThis.WINDOW_DEPTH : 5);

// --- Utilities ---
function _toString(x) { return (x == null ? "" : String(x)); }
function _normalizeText(s) {
  s = _toString(s).toLowerCase();
  s = s.replace(/[^a-z0-9_\s-]/g, " "); // keep letters/digits/underscore/hyphen/space
  s = s.replace(/[-_]+/g, " ");         // treat hyphen/underscore as spaces
  s = s.replace(/\s+/g, " ").trim();    // collapse spaces
  return s;
}

// --- Build multi-message window ---
const _lmArr = (context && context.chat && context.chat.last_messages && typeof context.chat.last_messages.length === "number")
  ? context.chat.last_messages : null;

let _joinedWindow = "";
let _rawLastSingle = "";
let _rawPrevSingle = "";

if (_lmArr && _lmArr.length > 0) {
  const startIdx = Math.max(0, _lmArr.length - WINDOW_DEPTH);
  const segs = [];
  for (const item of _lmArr.slice(startIdx)) {
    const msg = (item && typeof item.message === "string") ? item.message : _toString(item);
    segs.push(_toString(msg));
  }
  _joinedWindow = segs.join(" ");
  const lastItem = _lmArr[_lmArr.length - 1];
  _rawLastSingle = _toString((lastItem && typeof lastItem.message === "string") ? lastItem.message : lastItem);
  if (_lmArr.length > 1) {
    const prevItem = _lmArr[_lmArr.length - 2];
    _rawPrevSingle = _toString((prevItem && typeof prevItem.message === "string") ? prevItem.message : prevItem);
  }
} else {
  const _lastMsgA = (context && context.chat && typeof context.chat.lastMessage === "string") ? context.chat.lastMessage : "";
  const _lastMsgB = (context && context.chat && typeof context.chat.last_message === "string") ? context.chat.last_message : "";
  _rawLastSingle = _toString(_lastMsgA || _lastMsgB);
  _joinedWindow = _rawLastSingle;
}

// --- Public struct + haystacks ---
const CHAT_WINDOW = {
  depth: WINDOW_DEPTH,
  count_available: (_lmArr && _lmArr.length) ? _lmArr.length : (_rawLastSingle ? 1 : 0),
  text_joined: _joinedWindow,
  text_last_only: _rawLastSingle,
  text_prev_only: _rawPrevSingle,
  text_joined_norm: _normalizeText(_joinedWindow),
  text_last_only_norm: _normalizeText(_rawLastSingle),
  text_prev_only_norm: _normalizeText(_rawPrevSingle)
};
const _currentHaystack = " " + CHAT_WINDOW.text_joined_norm + " ";
const _previousHaystack = " " + CHAT_WINDOW.text_prev_only_norm + " ";

// --- Message count ---
let messageCount = 0;
if (_lmArr && typeof _lmArr.length === "number") {
  messageCount = _lmArr.length;
} else if (context && context.chat && typeof context.chat.message_count === "number") {
  messageCount = context.chat.message_count;
} else if (typeof context_chat_message_count === "number") {
  messageCount = context_chat_message_count;
}

// --- Active character name ---
const activeName = _normalizeText(
  (context && context.character && typeof context.character.name === "string")
    ? context.character.name
    : ""
);

/* ============================================================================
   [SECTION] EIDOS INTENT PROCESSING
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region EIDOS_PROCESSING
(function () {
  "use strict";

  // This logic runs the intent detection system.
  // It populates `context.intents` which is then used by `intentGatesPass`.

  const INTENTS = ["QUESTION", "DISCLOSURE", "COMMAND", "PROMISE", "CONFLICT", "SMALLTALK", "META", "NARRATIVE"];
  const STOP_STR = "i,me,my,myself,we,our,ours,ourselves,you,your,yours,yourself,yourselves,he,him,his,himself,she,her,hers,herself,it,its,itself,they,them,their,theirs,themselves,what,which,who,whom,this,that,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,a,an,the,and,but,if,or,because,as,until,while,of,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,s,t,can,will,just,don,should,now";
  const STOP_WORDS = {};
  STOP_STR.split(",").forEach(function (w) { STOP_WORDS[w] = true; });


  /* ============================================================================
     [SECTION] EIDOS INTENT MODELS
     SAFE TO EDIT: Yes (paste model strings here)
     ========================================================================== */
  //#region EIDOS_MODELS
  // These are placeholders. Paste the actual model strings from your training output.
  // From EIDOS_Sister_Script.js or intent_creator.py output
  var HASH_SIZE = 16384;
  var MODEL_QUESTION = ""
  var MODEL_DISCLOSURE = ""
  var MODEL_COMMAND = ""
  var MODEL_PROMISE = ""
  var MODEL_CONFLICT = ""
  var MODEL_SMALLTALK = ""
  var MODEL_META = ""
  var MODEL_NARRATIVE = ""


  // ----------------------------------------------------------------------------
  // INFERENCE & STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // EIDOS helper functions must be defined before they are used.
  function stem(w) {
    if (w.length < 4) return w;
    if (w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.endsWith("es")) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    if (w.endsWith("ing")) {
      const base = w.slice(0, -3);
      if (base.length > 2) return base;
    }
    if (w.endsWith("ed")) {
      const base = w.slice(0, -2);
      if (base.length > 2) return base;
    }
    if (w.endsWith("ly")) return w.slice(0, -2);
    if (w.endsWith("ment")) return w.slice(0, -4);
    if (w.endsWith("ness")) return w.slice(0, -4);
    if (w.endsWith("ful")) return w.slice(0, -3);
    if (w.endsWith("able")) return w.slice(0, -4);
    if (w.endsWith("ibility")) return w.slice(0, -7);
    return w;
  }

  function fnv1a32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function solveIntent(textTokens, modelStr) {
    if (!modelStr) return -999;
    const semi1 = modelStr.indexOf(";");
    const semi2 = modelStr.indexOf(";", semi1 + 1);
    const bias = parseFloat(modelStr.slice(2, semi1));
    const scale = parseFloat(modelStr.slice(semi1 + 3, semi2));
    const wRaw = modelStr.slice(semi2 + 3);
    const weights = wRaw.split(",");
    let score = bias;
    for (let i = 0; i < textTokens.length; i++) {
      const h = fnv1a32(textTokens[i]) % HASH_SIZE;
      if (h < weights.length) {
        const w = parseInt(weights[h], 10);
        if (!isNaN(w)) {
          score += w * scale;
        }
      }
    }
    return score;
  }

  // Helper: Run model, apply Sigmoid, set Boolean
  // We use a threshold of 0.5 (Score > 0.0) for activation.
  function checkTrigger(tokens, model, targetObj, key) {
    if (typeof model === 'undefined') return;
    var rawScore = solveIntent(tokens, model);
    // Simple binary check: Is the neuron firing?
    targetObj[key] = rawScore > 0.0;
  }

  // This is the main execution block for the EIDOS system.
  // It's wrapped in a try...catch to prevent intent detection errors
  // from breaking the entire lorebook script.
  try {
    if (CHAT_WINDOW.text_last_only) {
      const norm = _normalizeText(CHAT_WINDOW.text_last_only);
      const rawTokens = norm.split(' ');

      const tokens = [];
      for (let i = 0; i < rawTokens.length; i++) {
        const t = rawTokens[i];
        if (t.length > 2 && !STOP_WORDS[t]) {
          tokens.push(stem(t));
        }
      }

      const allTokens = tokens.slice();
      for (let i = 0; i < tokens.length - 1; i++) {
        allTokens.push(tokens[i] + " " + tokens[i + 1]);
      }

      // Ensure context.intents object exists and initialize it.
      if (typeof context.intents !== 'object' || context.intents === null) {
        context.intents = {};
      }

      // Reset all intents to false on each run.
      INTENTS.forEach(function (intent) {
        context.intents[intent.toLowerCase()] = false;
      });

      // Intent Detection using 8 Gates of EIDOS
      // We use a simpler approach than emotions - just check each gate independently
      checkTrigger(allTokens, MODEL_QUESTION, context.intents, "question");
      checkTrigger(allTokens, MODEL_DISCLOSURE, context.intents, "disclosure");
      checkTrigger(allTokens, MODEL_COMMAND, context.intents, "command");
      checkTrigger(allTokens, MODEL_PROMISE, context.intents, "promise");
      checkTrigger(allTokens, MODEL_CONFLICT, context.intents, "conflict");
      checkTrigger(allTokens, MODEL_SMALLTALK, context.intents, "smalltalk");
      checkTrigger(allTokens, MODEL_META, context.intents, "meta");
      checkTrigger(allTokens, MODEL_NARRATIVE, context.intents, "narrative");
    }
  } catch (e) {
    // Log EIDOS errors to the console for easier debugging, without halting the script.
    console.error('[INTENT-LORE] Intent processing failed:', e);
  }

  /* ============================================================================
     [SECTION] UTILITIES
     SAFE TO EDIT: Yes
     ========================================================================== */
  //#region UTILITIES
  function dbg(msg) {
    if (typeof DEBUG !== "undefined" && DEBUG) {
      // Replaced personality injection with standard console logging for better debugging.
      console.log(`[INTENT-LORE] ${String(msg)}`);
    }
  }
  function toArray(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
  function clamp01(v) { v = +v; if (!isFinite(v)) return 0; return Math.max(0, Math.min(1, v)); }
  function parseProbability(v) {
    if (v == null) return 1;
    if (typeof v === "number") return clamp01(v);
    const s = String(v).trim().toLowerCase();
    const n = parseFloat(s.replace("%", ""));
    if (!isFinite(n)) return 1;
    return s.indexOf("%") !== -1 ? clamp01(n / 100) : clamp01(n);
  }
  function getPriority(e) {
    let p = (e && isFinite(e.priority)) ? +e.priority : 3;
    if (p < 1) p = 1;
    if (p > 5) p = 5;
    return p;
  }
  function getMin(e) { return (e && isFinite(e.minMessages)) ? +e.minMessages : -Infinity; }
  function getMax(e) { return (e && isFinite(e.maxMessages)) ? +e.maxMessages : Infinity; }
  function getKeywords(e) { return (e && Array.isArray(e.keywords)) ? e.keywords.slice(0) : []; }
  function getTriggers(e) { return (e && Array.isArray(e.triggers)) ? e.triggers.slice(0) : []; }
  function getBlocklist(e) {
    if (!e) return [];
    if (Array.isArray(e.block)) return e.block.slice(0);
    if (Array.isArray(e.Block)) return e.Block.slice(0);
    return [];
  }
  function getNameBlock(e) { return (e && Array.isArray(e.nameBlock)) ? e.nameBlock.slice(0) : []; }
  function _normalizeName(s) { return _normalizeText(s); }
  function _isNameBlocked(e) {
    if (!activeName) return false;
    const nb = getNameBlock(e);
    for (const item of nb) {
      const n = _normalizeName(item);
      if (!n) continue;
      if (n === activeName) return true;
      if (activeName.indexOf(n) !== -1) return true;
      if (n.indexOf(activeName + " ") === 0) return true;
    }
    return false;
  }

  function expandKeywordsInArray(keywords, entityDb, regex, dbgFunc) {
    const expanded = [];
    for (const keyword of keywords) {
      const match = String(keyword).match(regex);
      if (match) {
        const entityName = match[1].toLowerCase();
        const entity = entityDb[entityName];
        if (entity) {
          // Add the main name (which is the key)
          expanded.push(entityName);
          // Add aliases if they exist
          if (Array.isArray(entity.aliases)) {
            expanded.push(...entity.aliases);
          }
          dbgFunc(`Expanded '${keyword}' to include keywords for '${entityName}'.`);
        } else {
          dbgFunc(`Could not find entity for '${keyword}'. Ignoring.`);
        }
      } else {
        // Not an entity keyword, just add it back
        expanded.push(keyword);
      }
    }
    // Using a Set to remove duplicates, then converting back to an array
    return [...new Set(expanded)];
  }

  function expandEntityKeywords(loreBook, entityDb, dbgFunc) {
    const entityKeywordRegex = /^char\.([a-z0-9_]+)$/i;
    for (const entry of loreBook) {
      if (entry.keywords && entry.keywords.length) {
        entry.keywords = expandKeywordsInArray(entry.keywords, entityDb, entityKeywordRegex, dbgFunc);
      }
      if (entry.Shifts && entry.Shifts.length) {
        for (const shift of entry.Shifts) {
          if (shift.keywords && shift.keywords.length) {
            shift.keywords = expandKeywordsInArray(shift.keywords, entityDb, entityKeywordRegex, dbgFunc);
          }
        }
      }
    }
  }

  function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function _hasTerm(haystack, term) {
    const rawTerm = (term == null ? "" : String(term)).trim();
    if (!rawTerm) return false;

    if (rawTerm.charAt(rawTerm.length - 1) === "*") {
      const stem = _normalizeText(rawTerm.slice(0, -1));
      if (!stem) return false;
      const re1 = new RegExp("(?:^|\\s)" + escapeRegex(stem) + "[a-z]*?(?=\\s|$)");
      return re1.test(haystack);
    }

    const t = _normalizeText(rawTerm);
    if (!t) return false;
    const w = escapeRegex(t);
    const re2 = new RegExp("(?:^|\\s)" + w + "(?=\\s|$)");
    return re2.test(haystack);
  }

  function collectWordGates(e) {
    // Helper to reduce repetition for current and 'prev.' scopes.
    const getGateSet = (prefix = "") => {
      const p = (key) => `${prefix}${key}`;
      const r = (e && e[p('requires')]) ? e[p('requires')] : {};

      const any = [].concat(
        toArray(e && e[p('requireAny')]),
        toArray(e && e[p('andAny')]),
        toArray(r.any)
      );
      const all = [].concat(
        toArray(e && e[p('requireAll')]),
        toArray(e && e[p('andAll')]),
        toArray(r.all)
      );
      const none = [].concat(
        toArray(e && e[p('requireNone')]),
        toArray(e && e[p('notAny')]),
        toArray(r.none),
        // getBlocklist is only for current scope; 'prev.' uses 'prev.block'.
        prefix === "" ? toArray(getBlocklist(e)) : toArray(e && e[p('block')])
      );
      const nall = [].concat(toArray(e && e[p('notAll')]));

      return { any, all, none, nall };
    };

    return {
      current: getGateSet(),
      previous: getGateSet('prev.')
    };
  }

  function _checkWordGates(e) {
    const g = collectWordGates(e);

    const cur = g.current;
    if (cur.any.length && !cur.any.some(w => _hasTerm(_currentHaystack, w))) return false;
    if (cur.all.length && !cur.all.every(w => _hasTerm(_currentHaystack, w))) return false;
    if (cur.none.length && cur.none.some(w => _hasTerm(_currentHaystack, w))) return false;
    if (cur.nall.length && cur.nall.every(w => _hasTerm(_currentHaystack, w))) return false;

    const prevScope = g.previous;
    if (prevScope.any.length && !prevScope.any.some(w => _hasTerm(_previousHaystack, w))) return false;
    if (prevScope.all.length && !prevScope.all.every(w => _hasTerm(_previousHaystack, w))) return false;
    if (prevScope.none.length && prevScope.none.some(w => _hasTerm(_previousHaystack, w))) return false;
    if (prevScope.nall.length && prevScope.nall.every(w => _hasTerm(_previousHaystack, w))) return false;

    return true;
  }

  function _checkTagGates(e, activeTagsSet) {
    const anyT = toArray(e && e.andAnyTags);
    const allT = toArray(e && e.andAllTags);
    const noneT = toArray(e && e.notAnyTags);
    const nallT = toArray(e && e.notAllTags);
    const hasT = t => !!activeTagsSet && activeTagsSet[String(t)] === 1;

    if (anyT.length && !anyT.some(hasT)) return false;
    if (allT.length && !allT.every(hasT)) return false;
    if (noneT.length && noneT.some(hasT)) return false;
    if (nallT.length && nallT.every(hasT)) return false;
    return true;
  }

  function _checkIntentGates(e) {
    // Map old keys for backward compatibility and gather all aliases.
    // Support both 'intent.xxx' format and plain 'xxx' format
    const normalizeIntent = (intentStr) => {
      const s = String(intentStr).toLowerCase();
      // Strip 'intent.' prefix if present
      return s.startsWith('intent.') ? s.slice(7) : s;
    };

    const anyI = toArray(e && (e.requireAnyIntent || e.andAnyIntent || e.requireIntent)).map(normalizeIntent);
    const allI = toArray(e && (e.requireAllIntent || e.andAllIntent)).map(normalizeIntent);
    const noneI = toArray(e && (e.blockAnyIntent || e.notAnyIntent || e.blockIntent)).map(normalizeIntent);
    const nallI = toArray(e && (e.blockAllIntent || e.notAllIntent)).map(normalizeIntent);

    if (anyI.length === 0 && allI.length === 0 && noneI.length === 0 && nallI.length === 0) {
      return true; // No intent gates, pass.
    }

    // Check if context.intents exists and is an object
    const activeIntents = (context && typeof context.intents === 'object' && context.intents) ? context.intents : {};
    const hasI = intent => activeIntents[String(intent).toLowerCase()] === true;

    if (anyI.length > 0 && !anyI.some(hasI)) return false;
    if (allI.length > 0 && !allI.every(hasI)) return false;
    if (noneI.length > 0 && noneI.some(hasI)) return false;
    if (nallI.length > 0 && nallI.every(hasI)) return false;

    return true;
  }

  function _isAlwaysOn(e) {
    const hasKW = !!(e && e.keywords && e.keywords.length);
    const hasPrevKW = !!(e && e['prev.keywords'] && e['prev.keywords'].length);
    const hasTag = !!(e && e.tag);
    const hasMin = (e && e.minMessages != null);
    const hasMax = (e && e.maxMessages != null);
    return !hasKW && !hasPrevKW && !hasTag && !hasMin && !hasMax;
  }

  function _isEntryActive(e, activeTagsSet) {
    if (!(messageCount >= getMin(e) && messageCount <= getMax(e))) return false;
    if (_isNameBlocked(e)) return false;
    if (!_checkWordGates(e)) return false;
    if (!_checkTagGates(e, activeTagsSet || {})) return false;
    if (!_checkIntentGates(e)) return false;
    if (Math.random() > parseProbability(e && e.probability)) return false;
    return true;
  }

  function resolveActiveEntities(currentText, lastMessages) {
    // 1. Initialize Short-Term Memory
    let memory = { M: null, F: null, N: null };
    let activeEntities = new Set();

    // Helper to update memory based on a text string
    const scanTextForNames = (text) => {
      const lower = text.toLowerCase();
      for (const name in ENTITY_DB) {
        if (Object.prototype.hasOwnProperty.call(ENTITY_DB, name)) {
          // Use a word-boundary regex for more precise matching (e.g., "art" won't match "heart").
          const nameRegex = new RegExp(`\\b${escapeRegex(name)}\\b`);
          if (nameRegex.test(lower)) {
            const meta = ENTITY_DB[name];
            memory[meta.gender] = name; // Update "Last Mentioned Female", etc.
            memory.N = name;            // Update "Last Mentioned Entity"

            // If this is the current text, mark this entity as Active
            if (text === currentText) activeEntities.add(name);
          }
        }
      }
    };

    // 2. Scan History (Oldest -> Newest) to build state
    if (lastMessages && Array.isArray(lastMessages)) {
      for (const msg of lastMessages) {
        const msgText = (msg && typeof msg.message === 'string') ? msg.message : _toString(msg);
        scanTextForNames(msgText);
      }
    }

    // 3. Scan Current Text for Names (Overrides history)
    scanTextForNames(currentText);

    // 4. Resolve Pronouns in Current Text
    const lowerCurrent = currentText.toLowerCase();
    const words = lowerCurrent.split(/\W+/); // Split by non-word chars

    for (const word of words) {
      if (PRONOUN_MAP[word]) {
        const gender = PRONOUN_MAP[word];
        const target = memory[gender] || memory.N; // Try gender match, fallback to neutral/last

        if (target) {
          activeEntities.add(target);
          dbg(`Coreference: '${word}' -> ${target}`);
        }
      }
    }

    return Array.from(activeEntities);
  }

  function getDynamicRelationshipLore(activeTagsSet) {
    const lastMessages = (_lmArr || []).map(item => (item && typeof item.message === "string") ? item.message : _toString(item));
    const activeEntities = resolveActiveEntities(CHAT_WINDOW.text_last_only, lastMessages);

    if (activeEntities.length < 2) return []; // Need 2 people for a relationship

    let injections = [];

    for (const trigger of RELATIONSHIP_DB) {
      // 1. Check if both entities are present
      const hasPair = trigger.pair.every(name => activeEntities.includes(name));

      if (hasPair) {
        // 2. Check for required tags
        const requireTags = toArray(trigger.requireTags);
        if (requireTags.length === 0) continue;
        const hasTags = requireTags.every(t => hasTag(activeTagsSet, t));

        if (hasTags) {
          dbg(`Relationship Trigger: ${trigger.pair.join('+')}`);
          injections.push({
            injection: trigger.injection,
            group: trigger.group || null
          });
        }
      }
    }
    return injections;
  }

  function compileAuthorLore(authorLore, entityDb) {
    let src = Array.isArray(authorLore) ? authorLore.slice() : [];

    if (entityDb) {
      for (const entityName in entityDb) {
        if (Object.prototype.hasOwnProperty.call(entityDb, entityName)) {
          const entity = entityDb[entityName];
          if (entity.lore && Array.isArray(entity.lore)) {
            src = src.concat(entity.lore);
          }
        }
      }
    }

    const out = new Array(src.length);
    for (const [i, entry] of src.entries()) {
      out[i] = normalizeEntry(entry);
    }
    return out;
  }
  function normalizeEntry(e) {
    if (!e) return {};
    const out = {};
    for (const k in e) if (Object.prototype.hasOwnProperty.call(e, k)) out[k] = e[k];
    out.keywords = Array.isArray(e.keywords) ? e.keywords.slice(0) : [];
    if (Array.isArray(e.Shifts) && e.Shifts.length) {
      const shArr = new Array(e.Shifts.length);
      for (const [i, shift] of e.Shifts.entries()) {
        const sh = shift || {};
        const shOut = {};
        for (const sk in sh) if (Object.prototype.hasOwnProperty.call(sh, sk)) shOut[sk] = sh[sk];
        shOut.keywords = Array.isArray(sh.keywords) ? sh.keywords.slice(0) : [];
        shArr[i] = shOut;
      }
      out.Shifts = shArr;
    } else if (out.hasOwnProperty("Shifts")) {
      delete out.Shifts;
    }
    return out;
  }

  /* ============================================================================
     [SECTION] COMPILATION
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region COMPILATION
  const _ENGINE_LORE = compileAuthorLore(typeof DYNAMIC_LORE !== "undefined" ? DYNAMIC_LORE : [], typeof ENTITY_DB !== "undefined" ? ENTITY_DB : {});

  // Expand `char.entity` keywords into their full alias lists.
  expandEntityKeywords(_ENGINE_LORE, ENTITY_DB, dbg);


  /* ============================================================================
     [SECTION] SELECTION PIPELINE
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region SELECTION_PIPELINE
  // --- State -------------------------------------------------------------------
  const buckets = [null, [], [], [], [], []];
  const picked = new Array(_ENGINE_LORE.length).fill(0);
  const inclusionGroups = {}; // For mutual exclusion

  function makeTagSet() { return Object.create(null); }
  const trigSet = makeTagSet();
  const postShiftTrigSet = makeTagSet();

  function addTag(set, key) { set[String(key)] = 1; }
  function hasTag(set, key) { return set[String(key)] === 1; }

  // --- 1) Direct pass ----------------------------------------------------------
  for (const [i1, e1] of _ENGINE_LORE.entries()) {
    const hit = _isAlwaysOn(e1) || getKeywords(e1).some(kw => _hasTerm(_currentHaystack, kw)) || toArray(e1['prev.keywords']).some(kw => _hasTerm(_previousHaystack, kw));
    if (!hit) continue;
    if (!_isEntryActive(e1, undefined)) { dbg(`filtered entry[${i1}]`); continue; }
    buckets[getPriority(e1)].push(i1);
    picked[i1] = 1;
    const trg1 = getTriggers(e1);
    for (const tag of trg1) {
      addTag(trigSet, tag);
    }
    dbg(`hit entry[${i1}] p=${getPriority(e1)}`);
  }

  // --- 2) Trigger pass ---------------------------------------------------------
  for (const [i2, e2] of _ENGINE_LORE.entries()) {
    if (picked[i2]) continue;
    if (!(e2 && e2.tag && hasTag(trigSet, e2.tag))) continue;
    if (!_isEntryActive(e2, trigSet)) { dbg(`filtered triggered entry[${i2}]`); continue; }
    buckets[getPriority(e2)].push(i2);
    picked[i2] = 1;
    const trg2 = getTriggers(e2);
    for (const tag of trg2) {
      addTag(trigSet, tag);
    }
    dbg(`triggered entry[${i2}] p=${getPriority(e2)}`);
  }

  // --- 3) Priority selection (capped) -----------------------------------------
  const selected = [];
  let pickedCount = 0;
  const applyLimit = (typeof APPLY_LIMIT === "number" && APPLY_LIMIT >= 1) ? APPLY_LIMIT : 99999;

  for (let p = 5; p >= 1 && pickedCount < applyLimit; p--) {
    const bucket = buckets[p];
    for (const item of bucket) {
      if (pickedCount >= applyLimit) break;

      // NEW: Inclusion group logic
      // To use this, add a `group` property to your lore entries.
      // Entries sharing a group name will be mutually exclusive.
      const entry = _ENGINE_LORE[item];
      // v14 lore entries don't have 'id' by default, so we rely on the 'group' property.
      const group = entry.group || (entry.id ? String(entry.id).split('_')[0] : null);
      if (group) {
        if (inclusionGroups[group]) {
          dbg(`Skipping entry in group '${group}' because an entry from this group was already selected.`);
          continue;
        }
        inclusionGroups[group] = true;
      }

      selected.push(item);
      pickedCount++;
    }
  }
  if (pickedCount === applyLimit) dbg("APPLY_LIMIT reached");

  /* ============================================================================
     [SECTION] APPLY + SHIFTS + POST-SHIFT
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region APPLY_AND_SHIFTS
  let personalityBuffer = "";
  let scenarioBuffer = "";
  let exampleDialogsBuffer = "";

  for (const idx of selected) {
    const e3 = _ENGINE_LORE[idx];
    if (e3 && e3.personality) personalityBuffer += `\n\n${e3.personality}`;
    if (e3 && e3.scenario) scenarioBuffer += `\n\n${e3.scenario}`;
    if (e3 && e3.example_dialogs) exampleDialogsBuffer += `\n${e3.example_dialogs}`;
    if (!(e3 && Array.isArray(e3.Shifts) && e3.Shifts.length)) continue;

    for (const sh of e3.Shifts) {
      const activated = _isAlwaysOn(sh) || getKeywords(sh).some(kw => _hasTerm(_currentHaystack, kw)) || toArray(sh['prev.keywords']).some(kw => _hasTerm(_previousHaystack, kw));
      if (!activated) continue;

      const trgSh = getTriggers(sh);
      for (const tag of trgSh) {
        addTag(postShiftTrigSet, tag);
      }

      if (!_isEntryActive(sh, trigSet)) { dbg("shift filtered"); continue; }

      if (sh.personality) personalityBuffer += `\n\n${sh.personality}`;
      if (sh.scenario) scenarioBuffer += `\n\n${sh.scenario}`;
      if (sh.example_dialogs) exampleDialogsBuffer += `\n${sh.example_dialogs}`;
    }
  }

  // --- Post-shift triggers -----------------------------------------------------
  const unionTags = (() => {
    const dst = makeTagSet();
    for (const k in trigSet) if (trigSet[k] === 1) dst[k] = 1;
    for (const k in postShiftTrigSet) if (postShiftTrigSet[k] === 1) dst[k] = 1;
    return dst;
  })();

  for (const [i3, e4] of _ENGINE_LORE.entries()) {
    if (picked[i3]) continue;
    if (!(e4 && e4.tag && hasTag(postShiftTrigSet, e4.tag))) continue;
    if (!_isEntryActive(e4, unionTags)) { dbg(`post-filter entry[${i3}]`); continue; }
    if (e4.personality) personalityBuffer += `\n\n${e4.personality}`;
    if (e4.scenario) scenarioBuffer += `\n\n${e4.scenario}`;
    if (e4.example_dialogs) exampleDialogsBuffer += `\n${e4.example_dialogs}`;
    dbg(`post-shift triggered entry[${i3}] p=${getPriority(e4)}`);
  }

  // --- Dynamic Relationship Injections ---------------------------------------
  const relationshipInjections = getDynamicRelationshipLore(unionTags);
  if (relationshipInjections.length > 0) {
    for (const injectionObj of relationshipInjections) {
      const group = injectionObj.group;
      if (group) {
        if (inclusionGroups[group]) {
          dbg(`Skipping relationship injection in group '${group}' due to exclusion.`);
          continue;
        }
        inclusionGroups[group] = true;
      }
      personalityBuffer += `\n\n${injectionObj.injection}`;
    }
  }

  /* ============================================================================
     [SECTION] FLUSH
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region FLUSH
  if (personalityBuffer) context.character.personality += personalityBuffer;
  if (scenarioBuffer) context.character.scenario += scenarioBuffer;
  if (exampleDialogsBuffer) context.character.example_dialogs += exampleDialogsBuffer;
  //#endregion
})();