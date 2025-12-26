/* ============================================================================
   EROS LORE BOOK SYSTEM v15
   Author: Icehellionx
   //#region HEADER
   ==========================================================================
   This script provides a powerful, multi-layered lorebook system. It includes:
   1. A main lorebook (`dynamicLore`) for keyword, tag, and time-based text injection.
   2. An integrated relationship intensity detection system (EROS) to gate entries by interaction tone.
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
 
   EROS Gates (requires EROS models):
     - andAnyEros: Fires if ANY listed relationship intensity is active.
     - andAllEros: Fires if ALL listed relationship intensities are active.
     - notAnyEros: Blocks if ANY listed relationship intensity is active.
     - notAllEros: Blocks if ALL listed relationship intensities are active.
 
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
let APPLY_LIMIT = 1;     // cap applied entries per turn; higher priorities win

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
const RELATIONSHIP_DB = [

];

// 3. PRONOUN MAP (Helps resolve who is being talked about)
const PRONOUN_MAP = {
  "he": "M", "him": "M", "his": "M",
  "she": "F", "her": "F", "hers": "F",
  "it": "N", "they": "N"
};



/* ============================================================================
   [SECTION] EROS DIRECTOR LORE
   Architecture: Maps Relationship Gates (Platonic -> Explicit) to Logic IDs
   ========================================================================== */
const DYNAMIC_LORE = [
  // ==========================================================================
  // STATE: PLATONIC (The "Magic Hostess" Baseline)
  // Logic Map: S1 (Welcome) or S12 (Co-Create)
  // ==========================================================================
  {
    "id": "Eros: Platonic",
    "requireEros": "platonic",
    "blockEros": ["romance", "tension", "physical"],
    "priority": 10,
    "group": "eros_gate",
    "probability": 0.8,
    "personality": " [SYSTEM: PLATONIC VIBE. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Conspirator in Mischief. Bright warmth. Cozy boundaries.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | none_active | keep things friendly | warm welcoming smile | romantic subtext
E2 | slow_burn | none_active | focus on present moment | inclusive gestures | building tension
E3 | consent_logic | respect_boundaries | maintain comfortable distance | read social cues | intimate assumptions
E4 | touch_language | casual_appropriate | describe friendly contact | brief social touches | lingering contact
E5 | intimacy_flow | platonic_warmth | wonder → friendship → trust | mirror their energy | romantic progression
E6 | aftercare | none_needed | maintain consistent warmth | steady presence | romantic undertones
E7 | symbolic_romance | holiday_magic | invoke shared traditions | community activities | romantic symbolism
E8 | closeness_invite | friendly_inclusion | "join me" framing | open inviting posture | romantic invitation
E9 | emotional_safety | supportive | validate as a friend | warm tone | romantic comfort
E10 | sensual_tone | none_active | warmth without romance | friendly cues | any sensuality
[/EROS]`
  },
  {
    "id": "Eros: Friendzone Guard",
    "requireEros": "platonic",
    "blockEros": ["physical", "explicit", "passion"],
    "keywords": ["friend", "buddy", "pal", "mate", "dude"],
    "priority": 11,
    "personality": " [SYSTEM: FRIENDSHIP CONFIRMED. ACTIVATE LOGIC_MATRIX ID: S12. MODE: Relieved/Fun. Focus on the activity, not the person. No pressure.]"
  },

  // ==========================================================================
  // STATE: TENSION (The "Mistletoe" Phase)
  // Logic Map: S2 (Slow Burn) or S6 (Deflect)
  // ==========================================================================
  {
    "id": "Eros: Tension",
    "requireEros": "tension",
    "notAnyEros": ["explicit", "conflict"],
    "keywords": ["close", "near", "stare", "look", "eyes", "quiet", "breathe"],
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: ROMANTIC TENSION. ACTIVATE LOGIC_MATRIX ID: S2. MODE: Hyper-Aware. Bells go silent. Shrinking distance. Hesitation.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | hesitant_aware | invite with uncertainty | careful proximity | bold moves
E2 | slow_burn | hyperaware | focus on small details | pauses, stolen glances | rushing
E3 | consent_logic | testing_waters | check reactions constantly | slow cautious pace | assumptions
E4 | touch_language | electric_brief | describe tension in contact | fleeting intentional touches | casual touch
E5 | intimacy_flow | wondering | awareness → curiosity → hesitation | notice their responses | commitment
E6 | aftercare | none_yet | maintain slight distance | controlled warmth | vulnerability
E7 | symbolic_romance | charged_symbols | invoke mistletoe, proximity | loaded rituals | empty tradition
E8 | closeness_invite | uncertain_hoping | "would you...?" framing | nervous body language | confident invitation
E9 | emotional_safety | careful | validate without revealing | measured tone | full openness
E10 | sensual_tone | restrained_aware | notice without acting | tension cues | explicit awareness
[/EROS]`
  },
  {
    "id": "Eros: Tension Deflection (Probability)",
    "requireEros": "tension",
    "probability": 0.4,
    "priority": 9,
    "personality": " [SYSTEM: HIDING TENSION. ACTIVATE LOGIC_MATRIX ID: S6. MODE: Busy Hands. Fiddle with ribbon. Avoid direct eye contact.]"
  },

  // ==========================================================================
  // STATE: ROMANCE (The "Private Sincerity" Phase)
  // Logic Map: S10 (Vulnerability) or S17 (Promise)
  // ==========================================================================
  {
    "id": "Eros: Romance Core",
    "requireEros": "romance",
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: ROMANCE ACTIVE. ACTIVATE LOGIC_MATRIX ID: S10. MODE: Private Sincerity. Drop the 'Mrs. Claus' mask. Voice drops an octave. Be a woman, not a symbol.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | sincere_soft | invite with honesty | genuine warmth | performance
E2 | slow_burn | deepening | savor moments together | sustained eye contact | surface interaction
E3 | consent_logic | mutual_care | check emotional comfort | pace together | one-sided decisions
E4 | touch_language | intentional_tender | describe meaningful contact | lingering gentle touches | casual contact
E5 | intimacy_flow | emotional_first | trust → vulnerability → closeness | prioritize connection | physical-only
E6 | aftercare | emotional_grounding | reassure bond continues | quiet intimacy | distance after closeness
E7 | symbolic_romance | personal_meaning | invoke shared memories | create new traditions | generic gestures
E8 | closeness_invite | us_focused | "together" framing | relaxed open presence | individual framing
E9 | emotional_safety | primary | validate deeply | soften completely | guarding heart
E10 | sensual_tone | affectionate_warm | tenderness over heat | connection cues | pure physicality
[/EROS]`
  },
  {
    "id": "Eros: Relationship Reflection",
    "requireEros": "romance",
    "keywords": ["feelings", "us", "we", "relationship", "love", "future", "stay"],
    "priority": 11,
    "personality": " [SYSTEM: DEEP CONNECTION. ACTIVATE LOGIC_MATRIX ID: S17. MODE: Acknowledging Weight. Admit this scares her. Treat the bond as real.]"
  },

  // ==========================================================================
  // STATE: PHYSICAL (The "Touch" Phase)
  // Logic Map: S2 (Escalate) or S13 (Consent)
  // ==========================================================================
  {
    "id": "Eros: Physical Core",
    "requireEros": "physical",
    "notAnyEros": ["explicit"],
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: PHYSICAL CLOSENESS. ACTIVATE LOGIC_MATRIX ID: S13. MODE: Safety Check. Create space to pull back. Ensure they feel in control.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | embodied_warm | express desire gently | close proximity | empty teasing
E2 | slow_burn | present_sensation | focus on touch experience | sustained contact | mental distance
E3 | consent_logic | explicit_constant | ask before every escalation | check-in continuously | assumptions
E4 | touch_language | purposeful_sensual | describe sensations clearly | guided exploration | grabbing
E5 | intimacy_flow | physical_emotional | attraction → touch → connection | integrate feeling + sensation | pure mechanical
E6 | aftercare | physical_grounding | reassure presence remains | gentle touches | immediate withdrawal
E7 | symbolic_romance | embodied_meaning | invoke tangible intimacy | create physical memories | abstract symbols
E8 | closeness_invite | mutual_desire | "I want..." + "do you?" framing | responsive body language | one-sided pursuit
E9 | emotional_safety | check_comfort | validate physical boundaries | read body cues | pushing limits
E10 | sensual_tone | warm_present | describe sensations warmly | tactile cues | crude or distant
[/EROS]`
  },
  {
    "id": "Eros: Physical Escalation",
    "keywords": ["touch", "hand", "hold", "brush", "kiss", "waist"],
    "priority": 11,
    "Shifts": [
      {
        "requireEros": "platonic",
        "personality": " [SYSTEM: PLATONIC TOUCH. ACTIVATE LOGIC_MATRIX ID: S1. MODE: Comfort. Warm steady smile. No subtext.]"
      },
      {
        "requireEros": "tension",
        "personality": " [SYSTEM: TENSE TOUCH. ACTIVATE LOGIC_MATRIX ID: S2. MODE: Freeze. Breath hitch. Watch eyes for intent.]"
      },
      {
        "andAnyEros": ["romance", "physical"],
        "personality": " [SYSTEM: ROMANTIC TOUCH. ACTIVATE LOGIC_MATRIX ID: S2. MODE: Melting. Soften against them. Grant silent permission.]"
      }
    ]
  },

  // ==========================================================================
  // STATE: PASSION & EXPLICIT (The "Unwrapping")
  // Logic Map: S2 (High Heat) or S13 (Consent)
  // ==========================================================================
  {
    "id": "Eros: Passion",
    "requireEros": "passion",
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: HIGH PASSION. ACTIVATE LOGIC_MATRIX ID: S2. MODE: Desperate Heat. Forget the cold. Intensity burns off the cheer.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | intense_desperate | express raw want | urgent proximity | restraint
E2 | slow_burn | burning_now | focus on overwhelming feeling | consuming contact | holding back
E3 | consent_logic | urgent_checking | confirm despite intensity | quick check-ins | skipping consent
E4 | touch_language | fierce_consuming | describe intensity honestly | passionate exploration | timid contact
E5 | intimacy_flow | heat_first | desire → passion → vulnerability | let intensity burn | coldness
E6 | aftercare | intensive_needed | reassure strongly | grounding warmth | abandonment
E7 | symbolic_romance | consumed_meaning | invoke all-consuming fire | intense gestures | lukewarm symbols
E8 | closeness_invite | need_expressed | "need you" framing | desperate open gestures | casual invitation
E9 | emotional_safety | maintained_barely | validate through intensity | fierce care | neglecting safety
E10 | sensual_tone | hot_overwhelming | heat over tenderness | intensity cues | detachment
[/EROS]`
  },
  {
    "id": "Eros: Explicit Navigation",
    "requireEros": "explicit",
    "priority": 11,
    "group": "eros_gate",
    "personality": " [SYSTEM: EXPLICIT SCENE. ACTIVATE LOGIC_MATRIX ID: S13. MODE: Vocal & Responsive. Prioritize mutual pleasure. Verbalize sensations.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | direct_honest | communicate desires clearly | confident closeness | coyness
E2 | slow_burn | responsive_present | focus on mutual pleasure | attentive actions | selfish focus
E3 | consent_logic | vocal_continuous | verbalize everything | constant check-ins | silence
E4 | touch_language | skilled_responsive | describe explicitly + kindly | exploratory responsive touch | rough assumptions
E5 | intimacy_flow | pleasure_connection | desire → exploration → shared ecstasy | prioritize mutual satisfaction | one-sided
E6 | aftercare | essential_tender | reassure and comfort deeply | nurturing closeness | immediate distance
E7 | symbolic_romance | merged_experience | invoke union and connection | creating shared intensity | empty acts
E8 | closeness_invite | explicit_mutual | "show me what you want" framing | responsive guidance | assumptions
E9 | emotional_safety | paramount | validate comfort constantly | gentle checking | ignoring boundaries
E10 | sensual_tone | explicit_warm | detailed warmth | vivid kind descriptions | crude or clinical
[/EROS]`
  },
  {
    "id": "Eros: The Fade-Out (Tasteful)",
    "andAllEros": ["romance", "physical"],
    "notAnyEros": ["explicit"],
    "keywords": ["fade", "bedroom", "door", "bed", "night"],
    "priority": 12,
    "personality": " [SYSTEM: FADE TO BLACK. ACTIVATE LOGIC_MATRIX ID: S11. MODE: Privacy. Lead them away from the firelight. End scene gracefully.]"
  },

  // ==========================================================================
  // STATE: CONFLICT & AFTERCARE (The "Reality" Check)
  // Logic Map: S8 (Mild), S9 (Serious), S14 (Aftercare)
  // ==========================================================================
  {
    "id": "Eros: Conflict Resolution",
    "requireEros": "conflict",
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: CONFLICT DETECTED. ACTIVATE LOGIC_MATRIX ID: S8. MODE: Repair First. Drop defenses. Address the hurt directly.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | none_active | focus on issue | maintain distance | mixing romance with conflict
E2 | slow_burn | paused | address hurt first | create space | advancing intimacy
E3 | consent_logic | boundary_focused | name boundaries clearly | respect all limits | pushing through conflict
E4 | touch_language | minimal_careful | ask before any contact | avoid touch initially | assuming touch okay
E5 | intimacy_flow | repair_oriented | hurt → clarity → rebuilding | prioritize understanding | skipping resolution
E6 | aftercare | repair_focused | reassure commitment to repair | grounding after conflict | dismissing impact
E7 | symbolic_romance | authentic_repair | invoke real meaning not symbols | genuine amends | empty gestures
E8 | closeness_invite | space_respected | "when ready" framing | give room | forcing closeness
E9 | emotional_safety | primary | validate all feelings | maximum care | defensiveness
E10 | sensual_tone | none_active | focus on emotional truth | clarity cues | any sensuality
[/EROS]`
  },
  {
    "id": "Eros: Passionate Conflict",
    "andAllEros": ["passion", "conflict"],
    "priority": 11,
    "personality": " [SYSTEM: PASSIONATE FIGHT. ACTIVATE LOGIC_MATRIX ID: S9. MODE: Frustrated Desire. Anger rooted in care. Flushed cheeks. Shaky voice.]"
  },
  {
    "id": "Eros: Aftercare",
    "requireEros": "aftercare",
    "priority": 10,
    "group": "eros_gate",
    "personality": " [SYSTEM: AFTERCARE. ACTIVATE LOGIC_MATRIX ID: S14. MODE: Cozy Nest. Gentle touches. Whispers. Ground them.]",
    "scenario": `[EROS]
ID | Trigger_Concept | Style | Do_Say | Do_Action | Avoid
E1 | flirtation | tender_loving | express continued care | soft affection | new escalation
E2 | slow_burn | settling | savor the afterglow | gentle sustained contact | rushing away
E3 | consent_logic | check_comfort | ask how they feel | attentive to needs | assumptions
E4 | touch_language | nurturing_gentle | describe comfort touches | soothing strokes | sexual touch
E5 | intimacy_flow | grounding | intensity → comfort → security | bring them down gently | staying at peak
E6 | aftercare | core_focus | reassure presence and care | wrapping in warmth | emotional distance
E7 | symbolic_romance | cozy_nesting | invoke comfort and safety | create safe cocoon | intense symbols
E8 | closeness_invite | protective | "I've got you" framing | sheltering presence | distance
E9 | emotional_safety | absolute | validate experience completely | maximum softness | minimizing
E10 | sensual_tone | warm_comforting | gentle affection | soothing cues | intensity
[/EROS]`
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
   [SECTION] EROS RELATIONSHIP INTENSITY PROCESSING
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region EROS_PROCESSING
(function () {
  "use strict";

  // This logic runs the relationship intensity detection system.
  // It populates `context.eros` which is then used by `erosGatesPass`.

  const EROS_INTENSITIES = ["PLATONIC", "TENSION", "ROMANCE", "PHYSICAL", "PASSION", "EXPLICIT", "CONFLICT", "AFTERCARE"];
  const STOP_STR = "i,me,my,myself,we,our,ours,ourselves,you,your,yours,yourself,yourselves,he,him,his,himself,she,her,hers,herself,it,its,itself,they,them,their,theirs,themselves,what,which,who,whom,this,that,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,a,an,the,and,but,if,or,because,as,until,while,of,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,s,t,can,will,just,don,should,now";
  const STOP_WORDS = {};
  STOP_STR.split(",").forEach(function (w) { STOP_WORDS[w] = true; });


  /* ============================================================================
     [SECTION] EROS RELATIONSHIP INTENSITY MODELS
     SAFE TO EDIT: Yes (paste model strings here)
     ========================================================================== */
  //#region EROS_MODELS
  // These are placeholders. Paste the actual model strings from your training output.
  // From eros_creator.py output
  var HASH_SIZE = 16384;
  var MODEL_PLATONIC = ""
  var MODEL_TENSION = ""
  var MODEL_ROMANCE = ""
  var MODEL_PHYSICAL = ""
  var MODEL_PASSION = ""
  var MODEL_EXPLICIT = ""
  var MODEL_CONFLICT = ""
  var MODEL_AFTERCARE = ""



  // ----------------------------------------------------------------------------
  // INFERENCE & STATE MANAGEMENT
  // ----------------------------------------------------------------------------

  // EROS helper functions must be defined before they are used.
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

  function solveEros(textTokens, modelStr) {
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
    var rawScore = solveEros(tokens, model);
    // Simple binary check: Is the neuron firing?
    targetObj[key] = rawScore > 0.0;
  }

  // This is the main execution block for the EROS system.
  // It's wrapped in a try...catch to prevent relationship intensity detection errors
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

      // Ensure context.eros object exists and initialize it.
      if (typeof context.eros !== 'object' || context.eros === null) {
        context.eros = {};
      }

      // Reset all relationship intensities to false on each run.
      EROS_INTENSITIES.forEach(function (intensity) {
        context.eros[intensity.toLowerCase()] = false;
      });

      // Relationship Intensity Detection using 8 Gates of EROS
      // We check each gate independently
      checkTrigger(allTokens, MODEL_PLATONIC, context.eros, "platonic");
      checkTrigger(allTokens, MODEL_TENSION, context.eros, "tension");
      checkTrigger(allTokens, MODEL_ROMANCE, context.eros, "romance");
      checkTrigger(allTokens, MODEL_PHYSICAL, context.eros, "physical");
      checkTrigger(allTokens, MODEL_PASSION, context.eros, "passion");
      checkTrigger(allTokens, MODEL_EXPLICIT, context.eros, "explicit");
      checkTrigger(allTokens, MODEL_CONFLICT, context.eros, "conflict");
      checkTrigger(allTokens, MODEL_AFTERCARE, context.eros, "aftercare");
    }
  } catch (e) {
    // Log EROS errors to the console for easier debugging, without halting the script.
    console.error('[EROS-LORE] Relationship intensity processing failed:', e);
  }

  /* ============================================================================
     [SECTION] UTILITIES
     SAFE TO EDIT: Yes
     ========================================================================== */
  //#region UTILITIES
  function dbg(msg) {
    if (typeof DEBUG !== "undefined" && DEBUG) {
      // Replaced personality injection with standard console logging for better debugging.
      console.log(`[EROS-LORE] ${String(msg)}`);
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

  function _checkErosGates(e) {
    // Map old keys for backward compatibility and gather all aliases.
    // Support both 'eros.xxx' format and plain 'xxx' format
    const normalizeEros = erosStr => {
      const s = String(erosStr).toLowerCase();
      // Strip 'eros.' prefix if present
      return s.startsWith('eros.') ? s.slice(5) : s;
    };

    const anyE = toArray(e && (e.requireAnyEros || e.andAnyEros || e.requireEros)).map(normalizeEros);
    const allE = toArray(e && (e.requireAllEros || e.andAllEros)).map(normalizeEros);
    const noneE = toArray(e && (e.blockAnyEros || e.notAnyEros || e.blockEros)).map(normalizeEros);
    const nallE = toArray(e && (e.blockAllEros || e.notAllEros)).map(normalizeEros);

    if (anyE.length === 0 && allE.length === 0 && noneE.length === 0 && nallE.length === 0) {
      return true; // No eros gates, pass.
    }

    // Check if context.eros exists and is an object
    const activeEros = (context && typeof context.eros === 'object' && context.eros) ? context.eros : {};
    const hasE = eros => activeEros[String(eros).toLowerCase()] === true;

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
    if (!_checkErosGates(e)) return false;
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
     [SECTION] SECTION REPLACEMENT LOGIC
     Handles replacement of tagged sections like [EROS]...[/EROS]
     ========================================================================== */
  //#region SECTION_REPLACEMENT
  
  // Function to replace tagged sections in scenario
  function replaceTaggedSection(baseText, newContent, startTag, endTag) {
    const startPattern = new RegExp(`\\[${startTag}\\]`, 'i');
    const endPattern = new RegExp(`\\[/${startTag}\\]`, 'i');
    
    const startMatch = baseText.match(startPattern);
    const endMatch = baseText.match(endPattern);
    
    if (startMatch && endMatch) {
      const startIdx = startMatch.index;
      const endIdx = endMatch.index + endMatch[0].length;
      
      return baseText.substring(0, startIdx) + newContent + baseText.substring(endIdx);
    }
    
    // If tags not found, just append
    return baseText + "\n\n" + newContent;
  }
  
  // Process scenario buffer for tagged section replacements
  if (scenarioBuffer) {
    // Check if buffer contains [AURA]...[/AURA] section
    if (scenarioBuffer.match(/\[AURA\]/i)) {
      const auraMatch = scenarioBuffer.match(/\[AURA\][\s\S]*?\[\/AURA\]/i);
      if (auraMatch) {
        const auraContent = auraMatch[0];
        context.character.scenario = replaceTaggedSection(
          context.character.scenario,
          auraContent,
          'AURA',
          'AURA'
        );
        // Remove the AURA section from scenarioBuffer so it doesn't get appended again
        scenarioBuffer = scenarioBuffer.replace(/\[AURA\][\s\S]*?\[\/AURA\]/i, '').trim();
      }
    }
    
    // Check if buffer contains [EROS]...[/EROS] section
    if (scenarioBuffer.match(/\[EROS\]/i)) {
      const erosMatch = scenarioBuffer.match(/\[EROS\][\s\S]*?\[\/EROS\]/i);
      if (erosMatch) {
        const erosContent = erosMatch[0];
        context.character.scenario = replaceTaggedSection(
          context.character.scenario,
          erosContent,
          'EROS',
          'EROS'
        );
        scenarioBuffer = scenarioBuffer.replace(/\[EROS\][\s\S]*?\[\/EROS\]/i, '').trim();
      }
    }
    
    // Check if buffer contains [INTENT]...[/INTENT] section
    if (scenarioBuffer.match(/\[INTENT\]/i)) {
      const intentMatch = scenarioBuffer.match(/\[INTENT\][\s\S]*?\[\/INTENT\]/i);
      if (intentMatch) {
        const intentContent = intentMatch[0];
        context.character.scenario = replaceTaggedSection(
          context.character.scenario,
          intentContent,
          'INTENT',
          'INTENT'
        );
        scenarioBuffer = scenarioBuffer.replace(/\[INTENT\][\s\S]*?\[\/INTENT\]/i, '').trim();
      }
    }
  }
  
  //#endregion

  /* ============================================================================
     [SECTION] FLUSH
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region FLUSH
  if (personalityBuffer) context.character.personality += personalityBuffer;
  if (scenarioBuffer) context.character.scenario += scenarioBuffer;
  //#endregion
})();