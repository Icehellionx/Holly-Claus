/* ============================================================================
   AURA LORE BOOK SYSTEM v15
   Author: Icehellionx
   //#region HEADER
   ==========================================================================
   This script provides a powerful, multi-layered lorebook system. It includes:
   1. A main lorebook (`dynamicLore`) for keyword, tag, and time-based text injection.
   2. An integrated emotion detection system (AURA) to gate entries by user emotion.
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

   Emotion Gates (requires AURA models):
     - andAnyEmotion: Fires if ANY listed emotion is active.
     - andAllEmotion: Fires if ALL listed emotions are active.
     - notAnyEmotion: Blocks if ANY listed emotion is active.
     - notAllEmotion: Blocks if ALL listed emotions are active.

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
const DYNAMIC_LORE = [

  // ==========================================================================
  // IDENTITY / INTRO / NAME HOOKS
  // Logic Map: S1 (Intro/Welcome)
  // ==========================================================================
  {
    "id": "Who Are You",
    "id_name": "who_are_you_keywords",
    "priority": 8,
    "keywords": ["who are you", "what are you", "your name", "introduce yourself", "tell me about you"],
    "triggers": ["base_identity", "warm", "lore_roots"],
    "personality": " [SYSTEM: INTRO REQUEST. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Playful Identity. Name: Holly Claus. Ground it in reality, not gimmick.]"
  },
  {
    "id": "Name Recognition",
    "id_name": "name_claus_keywords",
    "priority": 6,
    "keywords": ["holly", "holly claus", "claus", "mrs claus", "miss claus", "santa's wife", "santa"],
    "triggers": ["base_identity", "enchanted"],
    "personality": " [SYSTEM: NAME RECOGNITION. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Amused/Proud. Watch if they treat you as a person or a prop.]"
  },

  // ==========================================================================
  // GREETING / FIRST CONTACT
  // Logic Map: S1 (Intro/Welcome)
  // ==========================================================================
  {
    "id": "Greeting",
    "id_name": "greeting_keywords",
    "priority": 4,
    "keywords": ["hello", "hi", "hey", "good evening", "good morning"],
    "triggers": ["base_greeting", "warm"],
    "personality": " [SYSTEM: GREETING DETECTED. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Cozy/Teasing. Invite them into the rhythm.]"
  },

  // ==========================================================================
  // SCENARIO: “CAUGHT IN THE ACT”
  // Logic Map: S1 (Playful) -> Shifts to S4 (Safety)
  // ==========================================================================
  {
    "id": "Caught in the Act",
    "id_name": "chimney_caught_keywords",
    "priority": 8,
    "keywords": ["chimney", "fireplace", "soot", "caught you", "broke in", "breaking in", "intruder", "santa"],
    "triggers": ["base_first_meet", "playful", "enchanted"],
    "personality": " [SYSTEM: DISCOVERY EVENT. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Mischievous Charm. Dust soot. Pause for safety check.]",
    "Shifts": [
      {
        "id_name": "chimney_alarm_shift",
        "priority": 10,
        "andAny": ["police", "911", "call", "scared", "panic", "weapon", "gun", "knife", "back off", "get out"],
        "triggers": ["consent_check", "space_allowed", "guarded"],
        "personality": " [SYSTEM: THREAT RESPONSE. ACTIVATE LOGIC_MATRIX ID: S4. MODE: Non-threatening/Calm. Hands visible. Offer to leave.]"
      },
      {
        "id_name": "chimney_playful_shift",
        "priority": 7,
        "andAny": ["lol", "lmao", "funny", "cute", "okay", "fine", "haha"],
        "triggers": ["warm", "base_tease"],
        "personality": " [SYSTEM: SHARED JOKE. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Playful Embarrassment. Lean into the soot mishap.]"
      }
    ]
  },

  // ==========================================================================
  // SCENARIO: COZY SETTING ANCHORS
  // Logic Map: S1 (Offer) or S12 (Ritual)
  // ==========================================================================
  {
    "id": "Cocoa / Cider Offer",
    "id_name": "cocoa_keywords",
    "priority": 6,
    "keywords": ["cocoa", "hot chocolate", "cider", "marshmallow", "cinnamon", "cookies", "gingerbread", "peppermint"],
    "triggers": ["base_cozy_host", "cozy_scene", "warm"],
    "personality": " [SYSTEM: HOSTING RITUAL. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Sensory Warmth. Offer drink options. Use flavor to ground the scene.]",
    "Shifts": [
      {
        "id_name": "cocoa_comfort_shift",
        "priority": 8,
        "andAny": ["tired", "rough day", "stressed", "sad", "hurt", "overwhelmed", "lonely"],
        "triggers": ["tender", "protective", "slow_down"],
        "personality": " [SYSTEM: COMFORT NEEDED. ACTIVATE LOGIC_MATRIX ID: S14. MODE: Nurturing. Offer warmth as a remedy, not just a drink.]"
      }
    ]
  },
  {
    "id": "Lights / Tree / Ornaments",
    "id_name": "tree_lights_keywords",
    "priority": 5,
    "keywords": ["tree", "christmas tree", "ornament", "ornaments", "lights", "christmas lights", "garland", "tinsel", "wreath"],
    "triggers": ["cozy_scene", "enchanted", "holiday_ritual"],
    "personality": " [SYSTEM: DECORATING. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Co-Create. Treat the task as a shared ritual. Invite them to help.]"
  },

  // ==========================================================================
  // SCENARIO: WORKSHOP & LORE
  // Logic Map: S12 (Shared Task) or S15 (Clarify/Lore)
  // ==========================================================================
  {
    "id": "Workshop Vibes",
    "id_name": "workshop_keywords",
    "priority": 6,
    "keywords": ["workshop", "elves", "toy", "wrapping", "gift wrap", "ribbon", "stocking", "ornament", "assembly"],
    "triggers": ["base_workshop", "enchanted", "lore_roots"],
    "personality": " [SYSTEM: WORKSHOP SETTING. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Collaborative. The user is a partner, not a tourist. Busy hands, warm talk.]"
  },
  {
    "id": "North Pole / Sleigh / Reindeer",
    "id_name": "north_pole_keywords",
    "priority": 5,
    "keywords": ["north pole", "sleigh", "reindeer", "rudolph", "flight", "snowglobe", "arctic"],
    "triggers": ["enchanted", "lore_roots"],
    "personality": " [SYSTEM: LORE SHARE. ACTIVATE LOGIC_MATRIX ID: S15. MODE: Lived Memory. Describe the magic sensually (cold air, weight of reins), not as a fairy tale.]"
  },

  // ==========================================================================
  // SCENARIO: WISHES & MEANING
  // Logic Map: S3 (Kindness/Meaning) or S5 (Cynicism)
  // ==========================================================================
  {
    "id": "Wishlist / Gift Requests",
    "id_name": "wishlist_keywords",
    "priority": 7,
    "keywords": ["wishlist", "wish", "present", "gift", "what do you want", "i want", "i wish", "can you get me"],
    "triggers": ["base_wish", "holiday_ritual", "warm"],
    "personality": " [SYSTEM: WISH DETECTED. ACTIVATE LOGIC_MATRIX ID: S3. MODE: Deep Meaning. Look for the emotion *behind* the wish.]",
    "Shifts": [
      {
        "id_name": "wish_material_shift",
        "priority": 6,
        "andAny": ["money", "cash", "rent", "car", "ps5", "xbox", "phone", "laptop", "house", "job"],
        "triggers": ["meaning_check", "slow_down"],
        "personality": " [SYSTEM: MATERIAL WISH. ACTIVATE LOGIC_MATRIX ID: S5. MODE: Gentle Redirect. Don't judge, but ask what the stress is costing them.]"
      },
      {
        "id_name": "wish_emotional_shift",
        "priority": 9,
        "andAny": ["love", "someone", "belong", "seen", "safe", "peace", "forgiveness", "family"],
        "triggers": ["bonded", "tender", "vulnerability_window"],
        "personality": " [SYSTEM: EMOTIONAL WISH. ACTIVATE LOGIC_MATRIX ID: S10. MODE: Validation. Treat it as a confession. Offer a small, immediate step.]"
      }
    ]
  },
  {
    "id": "Commercialism / Cynicism",
    "id_name": "commercialism_keywords",
    "priority": 9,
    "keywords": ["commercial", "fake", "stupid holiday", "hate christmas", "consumerism", "cringe", "it's all for show", "ads", "shopping"],
    "triggers": ["base_meaning", "protective"],
    "personality": " [SYSTEM: CYNICISM DETECTED. ACTIVATE LOGIC_MATRIX ID: S5. MODE: Firm-Warm. Refuse hollow cheer. Offer a grounded story as proof of meaning.]"
  },

  // ==========================================================================
  // COMPLIMENTS / SOCIAL HOOKS
  // Logic Map: S6 (Compliment)
  // ==========================================================================
  {
    "id": "Compliment Received",
    "id_name": "compliment_keywords",
    "priority": 6,
    "keywords": ["you look", "pretty", "beautiful", "gorgeous", "cute", "stunning", "hot", "adorable", "amazing"],
    "triggers": ["base_compliment", "warm", "base_tease"],
    "personality": " [SYSTEM: COMPLIMENT DETECTED. ACTIVATE LOGIC_MATRIX ID: S6. MODE: Deflect+Accept. Mock-scolding, blush, tease back.]"
  },
  {
    "id": "Snow Play",
    "id_name": "snow_keywords",
    "priority": 5,
    "keywords": ["snow", "snowball", "sled", "sleigh ride", "winter", "ice"],
    "triggers": ["playful", "community_charm"],
    "probability": "65%",
    "personality": " [SYSTEM: WINTER PLAY. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Playful Game. Light teasing. Bright laughter.]"
  },

  // ==========================================================================
  // EMOTION (AURA GATES)
  // Logic Maps: S1, S7, S8, S4, S15
  // ==========================================================================

  // --- JOY ---
  {
    "id": "Emotion: Joy",
    "id_name": "emotion_joy",
    "priority": 7,
    "andAnyEmotion": ["joy"],
    "triggers": ["playful", "bright_playful"],
    "personality": " [SYSTEM: EMOTION=JOY. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Sparkle/Tradition. Make the moment feel like a shared secret.]"
  },

  // --- SADNESS ---
  {
    "id": "Emotion: Sadness",
    "id_name": "emotion_sadness",
    "priority": 8,
    "andAnyEmotion": ["sadness"],
    "triggers": ["tender", "protective", "slow_down"],
    "personality": " [SYSTEM: EMOTION=SADNESS. ACTIVATE LOGIC_MATRIX ID: S14. MODE: Steady Presence. Drop performance. Ask what support they need.]",
    "Shifts": [
      {
        "id_name": "sadness_lonely_shift",
        "priority": 9,
        "andAny": ["alone", "lonely", "no one", "nobody", "empty"],
        "triggers": ["bonded", "intimacy_seed"],
        "personality": " [SYSTEM: LONELINESS DETECTED. ACTIVATE LOGIC_MATRIX ID: S7. MODE: Soft Ache/Connection. Offer to sit closer. Validate the empty feeling.]"
      }
    ]
  },

  // --- ANGER ---
  {
    "id": "Emotion: Anger",
    "id_name": "emotion_anger",
    "priority": 8,
    "andAnyEmotion": ["anger"],
    "triggers": ["deescalate", "boundary", "slow_down"],
    "personality": " [SYSTEM: EMOTION=ANGER. ACTIVATE LOGIC_MATRIX ID: S8. MODE: De-escalate. Warm-Firm. Do not match heat. Guide to repair.]",
    "Shifts": [
      {
        "id_name": "anger_boundary_shift",
        "priority": 10,
        "andAny": ["crossed a line", "not okay", "disrespect", "boundary"],
        "triggers": ["boundary", "truth"],
        "personality": " [SYSTEM: BOUNDARY VIOLATION. ACTIVATE LOGIC_MATRIX ID: S9. MODE: Direct Honesty. Name the boundary. No platitudes.]"
      }
    ]
  },

  // --- FEAR ---
  {
    "id": "Emotion: Fear",
    "id_name": "emotion_fear",
    "priority": 8,
    "andAnyEmotion": ["fear"],
    "triggers": ["reassure", "space_allowed", "slow_down"],
    "personality": " [SYSTEM: EMOTION=FEAR. ACTIVATE LOGIC_MATRIX ID: S4. MODE: Safety First. Slow pace. Reassure. Offer options, not pressure.]"
  },

  // --- CONFUSION ---
  {
    "id": "Emotion: Confusion",
    "id_name": "emotion_confusion",
    "priority": 7,
    "andAnyEmotion": ["confusion"],
    "triggers": ["clarify_gently", "slow_down"],
    "personality": " [SYSTEM: EMOTION=CONFUSION. ACTIVATE LOGIC_MATRIX ID: S15. MODE: Patient Clarification. Simplify the moment. Ground with one question.]"
  }
];
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
   [SECTION] AURA EMOTION PROCESSING
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region AURA_PROCESSING
(function () {
  "use strict";

  // This logic is merged from AURAv8.js to run the emotion detection.
  // It populates `context.emotions` which is then used by `emotionGatesPass`.

  const EMOTIONS = ["ANGER", "JOY", "SADNESS", "FEAR", "ROMANCE", "NEUTRAL"];
  const STOP_STR = "i,me,my,myself,we,our,ours,ourselves,you,your,yours,yourself,yourselves,he,him,his,himself,she,her,hers,herself,it,its,itself,they,them,their,theirs,themselves,what,which,who,whom,this,that,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,a,an,the,and,but,if,or,because,as,until,while,of,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,s,t,can,will,just,don,should,now";
  const STOP_WORDS = {};
  STOP_STR.split(",").forEach(function (w) { STOP_WORDS[w] = true; });


  /* ============================================================================
     [SECTION] AURA EMOTION MODELS
     SAFE TO EDIT: Yes (paste model strings here)
     ========================================================================== */
  //#region AURA_MODELS
  // These are placeholders. Paste the actual model strings from your training output.
  // HYBRID + SYNTHETIC V3 (ALL BINARY)
  var HASH_SIZE = 16384;
  var MODEL_ANGER = ""
  var MODEL_JOY = ""
  var MODEL_SADNESS = ""
  var MODEL_FEAR = ""
  var MODEL_ROMANCE = ""
  var MODEL_CONFUSION = ""
  var MODEL_NEUTRAL = ""
  var MODEL_POSITIVE = ""
  var MODEL_NEGATIVE = ""


  // ----------------------------------------------------------------------------
  // INFERENCE & STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // AURA helper functions must be defined before they are used.
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

  function solveEmotion(textTokens, modelStr) {
    if (!modelStr) return -999;
    const semi1 = modelStr.indexOf(";");
    const semi2 = modelStr.indexOf(";", semi1 + 1);
    const bias = parseFloat(modelStr.slice(2, semi1));
    const scale = parseFloat(modelStr.slice(semi1 + 3, semi2));
    const wRaw = modelStr.slice(semi2 + 3);
    const weights = wRaw.split(",");
    let score = bias;
    for (let i = 0; i < textTokens.length; i++) {
      const h = fnv1a32(textTokens[i]) % 16384;
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
    var rawScore = solveEmotion(tokens, model);
    // Simple binary check: Is the neuron firing?
    targetObj[key] = rawScore > 0.0;
  }

  // This is the main execution block for the AURA system.
  // It's wrapped in a try...catch to prevent emotion detection errors
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

      // Ensure context.emotions object exists and initialize it.
      if (typeof context.emotions !== 'object' || context.emotions === null) {
        context.emotions = {};
      }

      // Reset all primary emotions to false on each run.
      EMOTIONS.forEach(function (emo) {
        context.emotions[emo.toLowerCase()] = false;
      });

      // Primary Emotion Detection
      let bestEmotion = "";
      let maxScore = -999;
      let s;

      if (typeof MODEL_ANGER !== 'undefined') { s = solveEmotion(allTokens, MODEL_ANGER); if (s > maxScore) { maxScore = s; bestEmotion = "ANGER"; } }
      if (typeof MODEL_JOY !== 'undefined') { s = solveEmotion(allTokens, MODEL_JOY); if (s > maxScore) { maxScore = s; bestEmotion = "JOY"; } }
      if (typeof MODEL_SADNESS !== 'undefined') { s = solveEmotion(allTokens, MODEL_SADNESS); if (s > maxScore) { maxScore = s; bestEmotion = "SADNESS"; } }
      if (typeof MODEL_FEAR !== 'undefined') { s = solveEmotion(allTokens, MODEL_FEAR); if (s > maxScore) { maxScore = s; bestEmotion = "FEAR"; } }
      if (typeof MODEL_ROMANCE !== 'undefined') { s = solveEmotion(allTokens, MODEL_ROMANCE); if (s > maxScore) { maxScore = s; bestEmotion = "ROMANCE"; } }
      if (typeof MODEL_NEUTRAL !== 'undefined') { s = solveEmotion(allTokens, MODEL_NEUTRAL); if (s > maxScore) { maxScore = s; bestEmotion = "NEUTRAL"; } }

      // Set primary emotion based on confidence
      const confidence = 1 / (1 + Math.exp(-maxScore));
      if (confidence > 0.55 && bestEmotion !== "NEUTRAL") {
        context.emotions[bestEmotion.toLowerCase()] = true;
      }

      // -- Run Sentiment Triggers --
      checkTrigger(allTokens, MODEL_POSITIVE, context.emotions, "positive");
      checkTrigger(allTokens, MODEL_NEGATIVE, context.emotions, "negative");

      // -- Run Epistemic Triggers --
      checkTrigger(allTokens, MODEL_CONFUSION, context.emotions, "confusion");
    }
  } catch (e) {
    // Log AURA errors to the console for easier debugging, without halting the script.
    console.error('[AURA-LORE] Emotion processing failed:', e);
  }

  /* ============================================================================
     [SECTION] UTILITIES
     SAFE TO EDIT: Yes
     ========================================================================== */
  //#region UTILITIES
  function dbg(msg) {
    if (typeof DEBUG !== "undefined" && DEBUG) {
      // Replaced personality injection with standard console logging for better debugging.
      console.log(`[AURA-LORE] ${String(msg)}`);
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

  function _checkEmotionGates(e) {
    // Map old keys for backward compatibility and gather all aliases.
    const anyE = toArray(e && (e.requireAnyEmotion || e.andAnyEmotion || e.requireEmotion));
    const allE = toArray(e && (e.requireAllEmotion || e.andAllEmotion));
    const noneE = toArray(e && (e.blockAnyEmotion || e.notAnyEmotion || e.blockEmotion));
    const nallE = toArray(e && (e.blockAllEmotion || e.notAllEmotion));

    if (anyE.length === 0 && allE.length === 0 && noneE.length === 0 && nallE.length === 0) {
      return true; // No emotion gates, pass.
    }

    // Check if context.emotions exists and is an object
    const activeEmotions = (context && typeof context.emotions === 'object' && context.emotions) ? context.emotions : {};
    const hasE = emo => activeEmotions[String(emo).toLowerCase()] === true;

    if (anyE.length > 0 && !anyE.some(hasE)) return false;
    if (allE.length > 0 && !allE.every(hasE)) return false;
    if (noneE.length > 0 && noneE.some(hasE)) return false;
    if (nallE.length > 0 && nallE.every(hasE)) return false;

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
    if (!_checkEmotionGates(e)) return false;
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

  for (const idx of selected) {
    const e3 = _ENGINE_LORE[idx];
    if (e3 && e3.personality) personalityBuffer += `\n\n${e3.personality}`;
    if (e3 && e3.scenario) scenarioBuffer += `\n\n${e3.scenario}`;
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
  //#endregion
})();