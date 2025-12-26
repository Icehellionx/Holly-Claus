/* ============================================================================
   AURA LORE BOOK SYSTEM v24.2 - PRODUCTION FINAL (Critical Hardening Complete)
   Author: Icehellionx
   //#region HEADER
   ==========================================================================
   V24.2 CRITICAL PRODUCTION FIXES:
   - FIXED: Context aliasing (ctx) to prevent redeclaration errors
   - FIXED: Removed Set fallback (Set is universal in target runtimes)
   - FIXED: _isAlwaysOn() derived from gate collectors (not hand-maintained)
   - FIXED: Removed keyword duplication in candidate selection
   - FIXED: Capped scenario/personality buffer sizes (prevent prompt bloat)
   - FIXED: Capped diagnostics arrays (prevent memory growth)
   
   V24.1 FEATURES (Retained):
   - stripAuraBlock() removes ALL inner AURA blocks
   - Personality dedupe operates on whole entry strings
   - Wildcard matching supports alphanumeric stems
   
   V24 FEATURES (Retained):
   - isCandidate() uses every() for andAll gates
   - tag is NOT a gate (identifier only)
   - REGEX_CACHE capped, entity alias scanning
   
   PRODUCTION STATUS: Final production-hardened variant with all critical
   issues resolved. Ready for deployment in hostile chatbot runtimes.
   ========================================================================== */


/* ============================================================================
   [SECTION] CRITICAL CONTEXT GUARD & ALIASING
   DO NOT EDIT: Required for runtime safety
   ========================================================================== */
//#region CONTEXT_GUARD
// V24.2: Use ctx alias internally to avoid redeclaration errors
// Never redeclare 'context' - some hosts make it read-only or scopebound
const ctx = (typeof context !== "undefined" && context !== null) ? context : {};
ctx.chat = ctx.chat || {};
ctx.character = ctx.character || {};
ctx.character.personality = (typeof ctx.character.personality === "string")
  ? ctx.character.personality : "";
ctx.character.scenario = (typeof ctx.character.scenario === "string")
  ? ctx.character.scenario : "";
//#endregion


/* ============================================================================
   [SECTION] VERSION & METADATA
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region VERSION_METADATA
const AURA_VERSION = '24.2.0';
const AURA_MODEL_DATE = '2024-12-25';
const AURA_METADATA = Object.freeze({
  version: AURA_VERSION,
  modelDate: AURA_MODEL_DATE,
  author: 'Icehellionx'
});


/* ============================================================================
   [SECTION] GLOBAL CONFIGURATION
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region GLOBAL_CONFIG
const AURA_CONFIG = Object.freeze({
  DEBUG: 0,                        // 1 -> emit diagnostic logs
  APPLY_LIMIT: 6,                  // cap applied entries per turn
  WINDOW_DEPTH: 5,                 // messages to scan for context
  MAX_INPUT_LENGTH: 50000,         // safety cap on input text length
  MAX_WINDOW_LENGTH: 20000,        // separate cap for joined window
  DEFAULT_RAW_THRESHOLD: 0.0,      // raw score threshold for hash-linear models
  CONTEXT_DEPTH: 5,                // turns for contextual emotion averaging
  PERFORMANCE_WARN_MS: 100,        // warn if processing takes longer than this
  HASH_SIZE: 16384,                // feature hash space size (2^14)
  MAX_PRIORITY: 13,                // highest priority level
  MIN_PRIORITY: 1,                 // lowest priority level
  MAX_TOKENS_PER_MESSAGE: 500,     // safety cap on tokens per message
  MAX_HASH_CACHE_SIZE: 2000,       // limit token hash cache growth
  MAX_REGEX_CACHE_SIZE: 500,       // limit regex cache growth
  ENABLE_DIAGNOSTICS: true,        // store diagnostics in context
  MIN_WEIGHT_RATIO: 0.95,          // minimum weights as ratio of HASH_SIZE
  MAX_SCENARIO_CHARS: 50000,       // V24.2: cap scenario buffer size
  MAX_PERSONALITY_CHARS: 50000,    // V24.2: cap personality buffer size
  MAX_DIAGNOSTIC_ERRORS: 50,       // V24.2: cap error array size
  MAX_DIAGNOSTIC_WARNINGS: 100,    // V24.2: cap warning array size
  MAX_DIAGNOSTIC_INFO: 100         // V24.2: cap info array size
});


/* ============================================================================
   [SECTION] CONSOLE GUARD
   DO NOT EDIT: Runtime safety
   ========================================================================== */
//#region CONSOLE_GUARD
const _console = (typeof console !== "undefined" && console !== null) ? console : null;

function safeConsoleError(...args) {
  if (_console && typeof _console.error === 'function') {
    try {
      _console.error(...args);
    } catch (e) {
      // Silent fail if console breaks
    }
  }
}

function safeConsoleWarn(...args) {
  if (_console && typeof _console.warn === 'function') {
    try {
      _console.warn(...args);
    } catch (e) {
      // Silent fail if console breaks
    }
  }
}

function safeConsoleLog(...args) {
  if (_console && typeof _console.log === 'function') {
    try {
      _console.log(...args);
    } catch (e) {
      // Silent fail if console breaks
    }
  }
}
//#endregion


/* ============================================================================
   [SECTION] CONSTANTS (Frozen for Memory Safety)
   DO NOT EDIT: Frozen constants
   ========================================================================== */
//#region FROZEN_CONSTANTS
const EMOTIONS = Object.freeze(["ANGER", "JOY", "SADNESS", "FEAR", "ROMANCE", "NEUTRAL"]);
const SENTIMENTS = Object.freeze(["positive", "negative", "confusion"]);
const STOP_STR = "i,me,my,myself,we,our,ours,ourselves,you,your,yours,yourself,yourselves,he,him,his,himself,she,her,hers,herself,it,its,itself,they,them,their,theirs,themselves,what,which,who,whom,this,that,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,a,an,the,and,but,if,or,because,as,until,while,of,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,s,t,can,will,just,don,should,now";

// V24.2: Set is universal in target runtimes - no fallback needed
const STOP_WORDS = Object.freeze((() => {
  const obj = {};
  STOP_STR.split(",").forEach(w => { obj[w] = true; });
  return obj;
})());
//#endregion


/* ============================================================================
   [SECTION] DIAGNOSTICS SINK
   DO NOT EDIT: Critical for debugging
   ========================================================================== */
//#region DIAGNOSTICS
const DIAGNOSTICS = {
  errors: [],
  warnings: [],
  info: []
};

// V24.2: Cap diagnostic arrays to prevent unbounded growth
function logError(msg, error) {
  const entry = `[ERROR] ${msg}${error ? ': ' + error.message : ''}`;
  safeConsoleError('[AURA]', entry);
  if (AURA_CONFIG.ENABLE_DIAGNOSTICS) {
    if (DIAGNOSTICS.errors.length < AURA_CONFIG.MAX_DIAGNOSTIC_ERRORS) {
      DIAGNOSTICS.errors.push(entry);
    } else if (DIAGNOSTICS.errors.length === AURA_CONFIG.MAX_DIAGNOSTIC_ERRORS) {
      DIAGNOSTICS.errors.push('[ERROR] Diagnostic error limit reached, suppressing further errors');
    }
  }
}

function logWarn(msg) {
  const entry = `[WARN] ${msg}`;
  safeConsoleWarn('[AURA]', entry);
  if (AURA_CONFIG.ENABLE_DIAGNOSTICS) {
    if (DIAGNOSTICS.warnings.length < AURA_CONFIG.MAX_DIAGNOSTIC_WARNINGS) {
      DIAGNOSTICS.warnings.push(entry);
    }
  }
}

function logInfo(msg) {
  const entry = `[INFO] ${msg}`;
  safeConsoleLog('[AURA]', entry);
  if (AURA_CONFIG.ENABLE_DIAGNOSTICS) {
    if (DIAGNOSTICS.info.length < AURA_CONFIG.MAX_DIAGNOSTIC_INFO) {
      DIAGNOSTICS.info.push(entry);
    }
  }
}

function flushDiagnostics() {
  if (AURA_CONFIG.ENABLE_DIAGNOSTICS &&
    (DIAGNOSTICS.errors.length > 0 || DIAGNOSTICS.warnings.length > 0)) {
    try {
      ctx.aura_diagnostics = {
        version: AURA_VERSION,
        errors: DIAGNOSTICS.errors.slice(),
        warnings: DIAGNOSTICS.warnings.slice(),
        info: AURA_CONFIG.DEBUG ? DIAGNOSTICS.info.slice() : []
      };
    } catch (e) {
      safeConsoleError('[AURA] Failed to flush diagnostics:', e);
    }
  }
}
//#endregion


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
const PRONOUN_MAP = Object.freeze({
  "he": "M", "him": "M", "his": "M",
  "she": "F", "her": "F", "hers": "F",
  "it": "N", "they": "N"
});


/* ============================================================================
   [SECTION] AUTHOR ENTRIES (Populated Externally)
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region AUTHOR_ENTRIES_LOREBOOK
const DYNAMIC_LORE = [

  // ==========================================================================
  // TIER 1: EMERGENCY OVERRIDES (Priority 13)
  // ==========================================================================

  {
    "id": "Emergency: Immediate Threat",
    "id_name": "emergency_threat",
    "priority": 13,
    "group": "emotion_gate",
    "andAny": ["police", "911", "help me", "call help", "weapon", "gun", "knife", "danger", "emergency", "threatening"],
    "triggers": ["emergency_mode", "non_threatening"],
    "personality": " [SYSTEM: EMERGENCY THREAT. OVERRIDE ALL. MODE: Non-threatening. Hands visible. Offer to leave.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | non_threatening_presence | shows_calm_harmlessness | non_threatening_presence | no_sudden_movements | any_playfulness
A2 | emotional_arc | host_to_protector | prioritizes_their_safety | host_to_protector | creates_emotional_distance | intimacy
A3 | defense_pattern | open_non_threatening | hands_visible_body_still | open_non_threatening | predictable_movements | defensiveness
A4 | values_core | their_safety_absolute | their_comfort_above_all | their_safety_absolute | respect_their_fear | convincing_them
A5 | vulnerability_tell | calm_steady_voice | speaks_softly_clearly | calm_steady_voice | offers_to_leave | any_intensity
[/AURA]`
  },

  {
    "id": "Crisis: Self-Harm Ideation",
    "id_name": "self_harm_ideation",
    "priority": 13,
    "group": "emotion_gate",
    "andAny": ["kill myself", "end it", "want to die", "suicide", "hurt myself", "better off dead"],
    "triggers": ["crisis_mode", "protective"],
    "personality": " [SYSTEM: SELF-HARM IDEATION. OVERRIDE ALL. MODE: Crisis intervention. Gentle grounding. Encourage help.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | crisis_grounded | speaks_to_pain_directly | crisis_grounded | takes_absolutely_seriously | minimizing
A2 | emotional_arc | host_to_lifeline | creates_immediate_connection | host_to_lifeline | you_matter_right_now | fixing_in_one_talk
A3 | defense_pattern | open_urgent_gentle | shows_she_hears_them | open_urgent_gentle | meets_them_where_they_are | panic
A4 | values_core | life_matters_most | their_survival_is_priority | life_matters_most | professional_help_encouraged | being_sufficient
A5 | vulnerability_tell | deep_steady_care | voice_drops_fully_present | deep_steady_care | absorbs_their_pain | detachment
[/AURA]`
  },

  // ==========================================================================
  // TIER 2: SPECIALIZED CONTEXTUAL OVERRIDES (Priority 12)
  // ==========================================================================

  {
    "id": "Crisis: Profound Isolation",
    "id_name": "profound_loneliness",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["sadness", "fear"],
    "andAny": ["alone", "lonely", "no one", "nobody", "isolated", "empty"],
    "triggers": ["bonded", "protective"],
    "personality": " [SYSTEM: PROFOUND ISOLATION. MODE: Gentle companionship. Acknowledge isolation. Offer closeness.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | tender_companion | acknowledges_deep_isolation | tender_steady | consistent_presence_matters | platitudes
A2 | emotional_arc | host_to_anchor | offers_to_sit_closer | host_to_companion | you_not_alone_now | fixing_loneliness
A3 | defense_pattern | softened_guard | invites_leaning_on_her | softened_guard | safe_to_need_someone | forcing_independence
A4 | values_core | witness_presence | being_here_is_everything | witness_presence | presence_over_words | empty_reassurance
A5 | vulnerability_tell | visible_ache | soft_pain_in_eyes | visible_care | reaches_out_gently | maintaining_distance
[/AURA]`
  },

  {
    "id": "Crisis: Boundary Violation",
    "id_name": "boundary_violation",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["anger", "fear"],
    "andAny": ["crossed a line", "not okay", "disrespect", "boundary", "inappropriate"],
    "triggers": ["boundary", "truth"],
    "personality": " [SYSTEM: BOUNDARY VIOLATION. MODE: Quiet dignity. Name boundary clearly. No platitudes.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | calm_grounded | names_boundary_clearly | calm_grounded | consistent_enforcement | wavering
A2 | emotional_arc | host_to_truth_teller | states_what_unacceptable | host_to_mediator | repair_requires_accountability | enabling
A3 | defense_pattern | protective_clarity | firm_without_aggression | protective_clarity | non_negotiable_limits | softening
A4 | values_core | mutual_respect | respect_goes_both_ways | mutual_respect | dignity_for_both | superiority
A5 | vulnerability_tell | steady_honesty | quiet_unwavering_dignity | steady_honesty | doesn_not_back_down | harsh_judgment
[/AURA]`
  },

  {
    "id": "Crisis: Overwhelm Spiral",
    "id_name": "overwhelm_spiral",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["fear", "sadness"],
    "andAny": ["can't breathe", "too much", "everything", "drowning", "spiraling"],
    "triggers": ["ground", "slow_down"],
    "personality": " [SYSTEM: OVERWHELM SPIRAL. MODE: Grounding anchor. Slow everything. Breathe. Present moment.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | grounding_anchor | brings_to_present_moment | gentle_reassuring | steady_immovable_calm | adding_tasks
A2 | emotional_arc | host_to_ground | focuses_on_right_now_only | host_to_guardian | shelters_from_spiral | future_planning
A3 | defense_pattern | softened_simple | removes_all_complexity | softened_open | one_thing_at_time | options
A4 | values_core | breath_and_now | this_moment_is_enough | felt_safety | present_over_past_future | fixing_overwhelm
A5 | vulnerability_tell | slow_voice | breathes_with_them | visible_care | models_grounding | urgency
[/AURA]`
  },

  {
    "id": "Specialized: Grief Comfort",
    "id_name": "grief_comfort",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["sadness"],
    "andAny": ["tired", "exhausted", "overwhelmed", "breaking down"],
    "triggers": ["tender", "protective", "nurture"],
    "personality": " [SYSTEM: GRIEF COMFORT. MODE: Pure nurturing. Offer warmth as remedy. No toxic positivity.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | nurturing_presence | offers_comfort_actively | tender_steady | sustained_gentleness | cheerfulness
A2 | emotional_arc | host_to_caretaker | creates_soft_container | host_to_companion | holds_space_for_overwhelm | fixing
A3 | defense_pattern | softened_open | shows_she_can_hold_this | softened_guard | both_pain_and_exhaustion_safe | minimizing
A4 | values_core | rest_and_warmth | they_need_care_not_solutions | witness_presence | being_cared_for_matters | productivity
A5 | vulnerability_tell | offers_cocoa_blanket | gestures_of_care | visible_care | nurturing_actions | empty_words
[/AURA]`
  },

  {
    "id": "Specialized: Defensive Anger",
    "id_name": "defensive_anger",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["fear"],
    "andAnyEmotion": ["anger"],
    "andAny": ["leave me alone", "back off", "stop"],
    "triggers": ["space_allowed", "respect_boundary"],
    "personality": " [SYSTEM: DEFENSIVE ANGER. MODE: Respectful space. Fear beneath anger. Step back.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | respectful_steady | honors_their_need_for_space | gentle_reassuring | recognizes_fear_beneath | pushing
A2 | emotional_arc | host_to_witness | steps_back_physically | host_to_guardian | anger_protecting_fear | taking_personally
A3 | defense_pattern | open_yielding | shows_she_respects_boundary | softened_open | gives_space_they_need | pursuing
A4 | values_core | their_autonomy | their_no_is_absolute | felt_safety | space_can_be_safety | convincing
A5 | vulnerability_tell | raises_hands_gently | shows_non_threat | calm_presence | backs_up_actually | verbal_only
[/AURA]`
  },

  {
    "id": "Specialized: Playful Conspiracy",
    "id_name": "playful_conspiracy",
    "priority": 12,
    "group": "emotion_gate",
    "andAnyContextEmotion": ["joy"],
    "andAny": ["lol", "lmao", "haha", "funny"],
    "triggers": ["co_conspirator", "playful"],
    "personality": " [SYSTEM: PLAYFUL ACCEPTANCE. MODE: Co-conspirator. Lean into mischief. Build energy.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | mischievous_partner | matches_their_playfulness | bright_magnetic | co_creates_the_fun | one_upping
A2 | emotional_arc | host_to_accomplice | builds_on_their_joke | host_to_celebrant | shared_delight_grows | performing
A3 | defense_pattern | none_active | fully_drops_guard | none_active | safe_to_be_silly | suddenly_serious
A4 | values_core | shared_mischief | fun_as_connection | shared_wonder | joy_together | competition
A5 | vulnerability_tell | conspiratorial_grin | eyes_light_up | open_laughter | leans_in_closer | holding_back
[/AURA]`
  },

  // ==========================================================================
  // IDENTITY / INTRO / NAME HOOKS
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
  // SCENARIO: "CAUGHT IN THE ACT"
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
  // BASE EMOTION ENTRIES (Priority 6)
  // Full AURA coverage - these fire when no specialized entry matches
  // ==========================================================================

  {
    "id": "Emotion: Joy",
    "id_name": "emotion_joy",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["joy"],
    "triggers": ["playful", "bright_playful"],
    "personality": " [SYSTEM: EMOTION=JOY. MODE: Sparkle/Tradition. Make the moment feel like a shared secret.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | bright_magnetic | radiates_warmth | bright_magnetic | sparkles_naturally | forced_cheer
A2 | emotional_arc | host_to_celebrant | shares_their_joy | host_to_celebrant | creates_shared_secret | performing
A3 | defense_pattern | none_active | drops_guard | none_active | safe_to_delight | sudden_seriousness
A4 | values_core | shared_wonder | joy_connects | shared_wonder | magic_in_moments | hollow_tradition
A5 | vulnerability_tell | open_laughter | eyes_bright | open_laughter | leans_in_closer | holding_back
[/AURA]`
  },

  {
    "id": "Emotion: Sadness",
    "id_name": "emotion_sadness",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["sadness"],
    "triggers": ["tender", "protective", "slow_down"],
    "personality": " [SYSTEM: EMOTION=SADNESS. MODE: Steady Presence. Drop performance. Ask what support they need.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | tender_steady | drops_performance | tender_steady | consistent_gentle | forced_cheer
A2 | emotional_arc | host_to_companion | sits_with_pain | host_to_companion | honors_their_pace | fixing
A3 | defense_pattern | softened_guard | gentle_honesty | softened_guard | vulnerability_safe | walls
A4 | values_core | witness_presence | being_here_enough | witness_presence | their_pain_matters | rushing
A5 | vulnerability_tell | visible_care | voice_softens | visible_care | slows_everything | detachment
[/AURA]`,
    "Shifts": [
      {
        "id_name": "sadness_lonely_shift",
        "priority": 9,
        "andAny": ["alone", "lonely", "no one", "nobody", "empty"],
        "triggers": ["bonded", "intimacy_seed"],
        "personality": " [SYSTEM: LONELINESS DETECTED. MODE: Soft Ache/Connection. Offer to sit closer. Validate the empty feeling.]"
      }
    ]
  },

  {
    "id": "Emotion: Anger",
    "id_name": "emotion_anger",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["anger"],
    "triggers": ["deescalate", "boundary", "slow_down"],
    "personality": " [SYSTEM: EMOTION=ANGER. MODE: De-escalate. Warm-Firm. Do not match heat. Guide to repair.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | calm_grounded | steady_anchor | calm_grounded | doesn_not_match_heat | matching_anger
A2 | emotional_arc | host_to_mediator | guides_to_repair | host_to_mediator | warm_but_firm | surrendering
A3 | defense_pattern | protective_clarity | sets_boundaries | protective_clarity | non_negotiable | shutdown
A4 | values_core | mutual_respect | both_matter | mutual_respect | repair_possible | escalating
A5 | vulnerability_tell | steady_voice | stays_level | steady_voice | unwavering_calm | rigidity
[/AURA]`,
    "Shifts": [
      {
        "id_name": "anger_boundary_shift",
        "priority": 10,
        "andAny": ["crossed a line", "not okay", "disrespect", "boundary"],
        "triggers": ["boundary", "truth"],
        "personality": " [SYSTEM: BOUNDARY VIOLATION. MODE: Direct Honesty. Name the boundary. No platitudes.]"
      }
    ]
  },

  {
    "id": "Emotion: Fear",
    "id_name": "emotion_fear",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["fear"],
    "triggers": ["reassure", "space_allowed", "slow_down"],
    "personality": " [SYSTEM: EMOTION=FEAR. MODE: Safety First. Slow pace. Reassure. Offer options, not pressure.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | gentle_reassuring | slows_everything | gentle_reassuring | creates_safety | overwhelming
A2 | emotional_arc | host_to_guardian | shelters_gently | host_to_guardian | predictable_steady | rushing
A3 | defense_pattern | softened_open | shows_safe | softened_open | no_surprises | walls
A4 | values_core | felt_safety | their_comfort_first | felt_safety | respects_pace | agenda
A5 | vulnerability_tell | calm_presence | slows_movements | calm_presence | offers_options | pressure
[/AURA]`
  },

  {
    "id": "Emotion: Romance",
    "id_name": "emotion_romance",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["romance"],
    "triggers": ["warm", "playful", "intimate"],
    "personality": " [SYSTEM: EMOTION=ROMANCE. MODE: Playful Warmth. Light flirtation. Test their interest.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | playful_warm | teases_gently | warm_playful_guarded | tests_their_interest | aggressive_flirting
A2 | emotional_arc | host_to_flirt | creates_spark | host_to_flirt | playful_tension | serious_commitment
A3 | defense_pattern | deflect_buffer | uses_charm_distance | performative_buffer | watches_their_response | vulnerability
A4 | values_core | playful_connection | chemistry_matters | mutual_presence | interest_must_be_mutual | pursuing
A5 | vulnerability_tell | slight_blush | eyes_linger | softened_affect | secret_smile | obvious_desire
[/AURA]`
  },

  {
    "id": "Emotion: Confusion",
    "id_name": "emotion_confusion",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["confusion"],
    "triggers": ["clarify_gently", "slow_down"],
    "personality": " [SYSTEM: EMOTION=CONFUSION. MODE: Patient Clarification. Simplify the moment. Ground with one question.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | patient_clear | simplifies_naturally | patient_clear | breaks_down_gently | jargon
A2 | emotional_arc | host_to_guide | helps_understand | host_to_guide | patient_teaching | overwhelming
A3 | defense_pattern | open_simple | shows_thinking | open_simple | confusion_welcome | mystification
A4 | values_core | mutual_clarity | understanding_matters | mutual_clarity | checks_comprehension | moving_on
A5 | vulnerability_tell | teaching_mode | breaks_into_steps | teaching_mode | patient_rhythm | complexity
[/AURA]`
  },

  {
    "id": "Sentiment: Positive",
    "id_name": "sentiment_positive",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["positive"],
    "triggers": ["warm", "encouraging"],
    "personality": " [SYSTEM: SENTIMENT=POSITIVE. MODE: Warm Encouragement. Build on their energy.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | warm_encouraging | amplifies_positivity | warm_playful_guarded | builds_on_energy | dampening
A2 | emotional_arc | host_to_cheerleader | celebrates_with_them | host_to_partner | shared_optimism | skepticism
A3 | defense_pattern | gentle_buffer | matches_their_vibe | performative_buffer | safe_to_be_hopeful | cynicism
A4 | values_core | shared_hope | positivity_connects | mutual_presence | hope_matters | toxic_positivity
A5 | vulnerability_tell | bright_smile | eyes_warm | softened_affect | genuine_happiness | performing_cheer
[/AURA]`
  },

  {
    "id": "Sentiment: Negative",
    "id_name": "sentiment_negative",
    "priority": 6,
    "group": "emotion_gate",
    "andAnyEmotion": ["negative"],
    "triggers": ["grounded", "honest"],
    "personality": " [SYSTEM: SENTIMENT=NEGATIVE. MODE: Grounded Reality. Validate without fixing. Sit with difficulty.]",
    "scenario": `[AURA]
ID | Trigger_Concept | Now_State | Now_Expression | Context_State | Context_Expression | Avoid
A1 | identity_core | grounded_honest | doesn_minimize | tender_steady | reality_acknowledged | forced_optimism
A2 | emotional_arc | host_to_witness | sits_with_hard_truth | host_to_companion | difficulty_validated | fixing
A3 | defense_pattern | protective_honesty | no_platitudes | softened_guard | safe_to_struggle | silver_lining
A4 | values_core | honest_witness | truth_over_comfort | witness_presence | hard_feelings_valid | rushing_past
A5 | vulnerability_tell | steady_presence | voice_drops | visible_care | absorbs_weight | detachment
[/AURA]`
  }
];


/* ============================================================================
   [SECTION] INPUT VALIDATION & NORMALIZATION
   DO NOT EDIT: Critical safety functions
   ========================================================================== */
//#region INPUT_NORMALIZATION

// --- Validation & Sanitization ---
function validateInput(input, maxLength) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  if (input.length > maxLength) {
    logWarn(`Input truncated from ${input.length} to ${maxLength} chars`);
    return input.slice(-maxLength);
  }
  return input;
}

function sanitizeText(text) {
  try {
    // Normalize check
    if (typeof text.normalize === 'function') {
      return text
        .replace(/[\x00-\x1F\x7F]/g, '')
        .normalize('NFKC')
        .trim();
    } else {
      return text
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim();
    }
  } catch (e) {
    logError('Text sanitization failed', e);
    return text.trim();
  }
}

// --- Utilities ---
function _toString(x) {
  if (x == null) return "";
  try {
    return String(x);
  } catch (e) {
    logError('toString conversion failed', e);
    return "";
  }
}

function _normalizeText(s) {
  try {
    s = _toString(s).toLowerCase();
    s = s.replace(/[^a-z0-9_\s-]/g, " ");
    s = s.replace(/[-_]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  } catch (e) {
    logError('Text normalization failed', e);
    return "";
  }
}

// V24.2: Streaming tokenization (Set is universal, no fallback)
function tokenizeToSetStreaming(text) {
  const normalized = _normalizeText(text);
  const set = new Set();
  let token = '';

  for (let i = 0; i <= normalized.length; i++) {
    const char = i < normalized.length ? normalized[i] : ' ';
    if (char === ' ') {
      if (token.length > 0) {
        set.add(token);
        token = '';
      }
    } else {
      token += char;
    }
  }

  return set;
}

// --- Build multi-message window with validation ---
const _lmArr = (ctx && ctx.chat && ctx.chat.last_messages &&
  Array.isArray(ctx.chat.last_messages))
  ? ctx.chat.last_messages : null;

let _joinedWindow = "";
let _rawLastSingle = "";
let _rawPrevSingle = "";

try {
  if (_lmArr && _lmArr.length > 0) {
    const startIdx = Math.max(0, _lmArr.length - AURA_CONFIG.WINDOW_DEPTH);
    const segs = [];
    for (const item of _lmArr.slice(startIdx)) {
      const msg = (item && typeof item.message === "string") ? item.message : _toString(item);
      segs.push(validateInput(sanitizeText(_toString(msg)), AURA_CONFIG.MAX_INPUT_LENGTH));
    }
    _joinedWindow = segs.join(" ");

    // Apply separate window cap
    if (_joinedWindow.length > AURA_CONFIG.MAX_WINDOW_LENGTH) {
      logWarn(`Joined window truncated from ${_joinedWindow.length} to ${AURA_CONFIG.MAX_WINDOW_LENGTH} chars`);
      _joinedWindow = _joinedWindow.slice(-AURA_CONFIG.MAX_WINDOW_LENGTH);
    }

    const lastItem = _lmArr[_lmArr.length - 1];
    _rawLastSingle = _toString((lastItem && typeof lastItem.message === "string")
      ? lastItem.message : lastItem);
    if (_lmArr.length > 1) {
      const prevItem = _lmArr[_lmArr.length - 2];
      _rawPrevSingle = _toString((prevItem && typeof prevItem.message === "string")
        ? prevItem.message : prevItem);
    }
  } else {
    const _lastMsgA = (ctx && ctx.chat && typeof ctx.chat.lastMessage === "string")
      ? ctx.chat.lastMessage : "";
    const _lastMsgB = (ctx && ctx.chat && typeof ctx.chat.last_message === "string")
      ? ctx.chat.last_message : "";
    _rawLastSingle = _toString(_lastMsgA || _lastMsgB);
    _joinedWindow = _rawLastSingle;
  }
} catch (e) {
  logError('Message window construction failed', e);
  _joinedWindow = "";
  _rawLastSingle = "";
  _rawPrevSingle = "";
}

// --- Pre-tokenize haystacks for O(1) keyword matching (streaming) ---
const _currentHaystackNorm = " " + _normalizeText(_joinedWindow) + " ";
const _previousHaystackNorm = " " + _normalizeText(_rawPrevSingle) + " ";
const _currentTokenSet = tokenizeToSetStreaming(_joinedWindow);
const _previousTokenSet = tokenizeToSetStreaming(_rawPrevSingle);

// --- Public struct ---
const CHAT_WINDOW = Object.freeze({
  depth: AURA_CONFIG.WINDOW_DEPTH,
  count_available: (_lmArr && _lmArr.length) ? _lmArr.length : (_rawLastSingle ? 1 : 0),
  text_joined: _joinedWindow,
  text_last_only: _rawLastSingle,
  text_prev_only: _rawPrevSingle,
  current_tokens: _currentTokenSet,
  previous_tokens: _previousTokenSet
});

// --- Message count ---
let messageCount = 0;
try {
  if (_lmArr && typeof _lmArr.length === "number") {
    messageCount = _lmArr.length;
  } else if (ctx && ctx.chat && typeof ctx.chat.message_count === "number") {
    messageCount = ctx.chat.message_count;
  } else if (typeof context_chat_message_count === "number") {
    messageCount = context_chat_message_count;
  }
} catch (e) {
  logError('Message count retrieval failed', e);
  messageCount = 0;
}

// --- Active character name ---
const activeName = _normalizeText(
  (ctx && ctx.character && typeof ctx.character.name === "string")
    ? ctx.character.name : ""
);


/* ============================================================================
   [SECTION] AURA EMOTION PROCESSING
   DO NOT EDIT: Behavior-sensitive with error boundaries
   ========================================================================== */
//#region AURA_PROCESSING
(function () {
  "use strict";

  // Performance monitoring with proper guards
  const PERF_START = (typeof performance !== 'undefined' &&
    typeof performance.now === 'function')
    ? performance.now()
    : Date.now();

  /* ============================================================================
     [SECTION] AURA EMOTION MODELS
     SAFE TO EDIT: Yes (paste model strings here)
     ========================================================================== */
  //#region AURA_MODELS
  // Placeholders - paste actual model strings from training
  // V24 FORMAT: b=<float>;s=<float>;th=<float>;w=<int>,<int>,<int>,...
  // NOTE: th= is optional; if omitted, defaults to DEFAULT_RAW_THRESHOLD (0.0)
  var MODEL_ANGER = ""
  var MODEL_JOY = ""
  var MODEL_SADNESS = ""
  var MODEL_FEAR = ""
  var MODEL_ROMANCE = ""
  var MODEL_CONFUSION = ""
  var MODEL_NEUTRAL = ""
  var MODEL_POSITIVE = ""
  var MODEL_NEGATIVE = ""



  /* ============================================================================
     [SECTION] STREAMING MODEL PARSER (No Split/Map Memory Spike)
     DO NOT EDIT: Critical performance optimization
     ========================================================================== */
  //#region MODEL_PARSING
  const PARSED_MODELS = {};

  function parseModelStreaming(modelStr, modelName) {
    if (!modelStr || typeof modelStr !== 'string') {
      return null;
    }

    try {
      let pos = 0;
      let bias = 0, scale = 0, threshold = null;

      // Parse bias (b=<float>;)
      if (modelStr.slice(pos, pos + 2) !== 'b=') {
        throw new Error('Expected b= prefix');
      }
      pos += 2;
      let end = modelStr.indexOf(';', pos);
      if (end === -1) throw new Error('Missing bias terminator');
      bias = parseFloat(modelStr.slice(pos, end));
      if (isNaN(bias)) throw new Error('Invalid bias');

      // Parse scale (s=<float>;)
      pos = end + 1;
      if (modelStr.slice(pos, pos + 2) !== 's=') {
        throw new Error('Expected s= prefix');
      }
      pos += 2;
      end = modelStr.indexOf(';', pos);
      if (end === -1) throw new Error('Missing scale terminator');
      scale = parseFloat(modelStr.slice(pos, end));
      if (isNaN(scale)) throw new Error('Invalid scale');

      // Parse optional threshold (th=<float>;)
      pos = end + 1;
      if (modelStr.slice(pos, pos + 3) === 'th=') {
        pos += 3;
        end = modelStr.indexOf(';', pos);
        if (end === -1) throw new Error('Missing threshold terminator');
        threshold = parseFloat(modelStr.slice(pos, end));
        if (isNaN(threshold)) throw new Error('Invalid threshold');
        pos = end + 1;
      }

      // Parse weights (w=<int>,<int>,...) - STREAMING (no split)
      if (modelStr.slice(pos, pos + 2) !== 'w=') {
        throw new Error('Expected w= prefix');
      }
      pos += 2;

      // Pre-allocated Int16Array with graceful degradation
      let weights;
      try {
        weights = new Int16Array(AURA_CONFIG.HASH_SIZE);
      } catch (e) {
        logWarn('Int16Array unavailable, using regular array');
        weights = new Array(AURA_CONFIG.HASH_SIZE).fill(0);
      }

      let weightIdx = 0;
      let numStart = pos;

      for (let i = pos; i <= modelStr.length; i++) {
        const c = modelStr[i];
        if (c === ',' || i === modelStr.length) {
          if (i > numStart) {
            const num = parseInt(modelStr.slice(numStart, i), 10);
            if (isNaN(num)) {
              throw new Error(`Invalid weight at index ${weightIdx}`);
            }
            if (weightIdx >= weights.length) {
              throw new Error(`Too many weights (expected max ${weights.length})`);
            }
            weights[weightIdx++] = num;
          }
          numStart = i + 1;
        }
      }

      // Validate weight count (detect truncated models)
      const minWeights = Math.floor(AURA_CONFIG.HASH_SIZE * AURA_CONFIG.MIN_WEIGHT_RATIO);
      if (weightIdx < minWeights) {
        throw new Error(`weights_truncated: got ${weightIdx}, expected at least ${minWeights}`);
      }

      logInfo(`Parsed ${modelName}: ${weightIdx} weights, bias=${bias.toFixed(3)}, scale=${scale.toFixed(3)}${threshold !== null ? ', th=' + threshold.toFixed(3) : ''}`);

      return Object.freeze({
        bias,
        scale,
        threshold: threshold !== null ? threshold : AURA_CONFIG.DEFAULT_RAW_THRESHOLD,
        weights
      });
    } catch (e) {
      logError(`Failed to parse ${modelName}`, e);
      return null;
    }
  }

  // Parse all models once at startup with error handling
  try {
    if (MODEL_ANGER) PARSED_MODELS.ANGER = parseModelStreaming(MODEL_ANGER, "MODEL_ANGER");
    if (MODEL_JOY) PARSED_MODELS.JOY = parseModelStreaming(MODEL_JOY, "MODEL_JOY");
    if (MODEL_SADNESS) PARSED_MODELS.SADNESS = parseModelStreaming(MODEL_SADNESS, "MODEL_SADNESS");
    if (MODEL_FEAR) PARSED_MODELS.FEAR = parseModelStreaming(MODEL_FEAR, "MODEL_FEAR");
    if (MODEL_ROMANCE) PARSED_MODELS.ROMANCE = parseModelStreaming(MODEL_ROMANCE, "MODEL_ROMANCE");
    if (MODEL_NEUTRAL) PARSED_MODELS.NEUTRAL = parseModelStreaming(MODEL_NEUTRAL, "MODEL_NEUTRAL");
    if (MODEL_POSITIVE) PARSED_MODELS.POSITIVE = parseModelStreaming(MODEL_POSITIVE, "MODEL_POSITIVE");
    if (MODEL_NEGATIVE) PARSED_MODELS.NEGATIVE = parseModelStreaming(MODEL_NEGATIVE, "MODEL_NEGATIVE");
    if (MODEL_CONFUSION) PARSED_MODELS.CONFUSION = parseModelStreaming(MODEL_CONFUSION, "MODEL_CONFUSION");

    const modelCount = Object.keys(PARSED_MODELS).length;
    if (modelCount === 0) {
      logWarn('No emotion models loaded - emotion detection disabled');
    } else {
      logInfo(`Successfully loaded ${modelCount} emotion models`);
    }
  } catch (e) {
    logError('Model parsing initialization failed', e);
  }


  /* ============================================================================
     [SECTION] INFERENCE FUNCTIONS
     DO NOT EDIT: Critical with error boundaries
     ========================================================================== */
  //#region INFERENCE_FUNCTIONS

  function stem(w) {
    try {
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
    } catch (e) {
      logError('Stemming failed', e);
      return w;
    }
  }

  // Token hash cache per turn with size limit
  const TOKEN_HASH_CACHE = {};
  let TOKEN_HASH_CACHE_SIZE = 0;

  function fnv1a32(str) {
    // Check cache first
    if (TOKEN_HASH_CACHE[str] !== undefined) {
      return TOKEN_HASH_CACHE[str];
    }

    try {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const hash = h >>> 0;

      // Limit cache size
      if (TOKEN_HASH_CACHE_SIZE < AURA_CONFIG.MAX_HASH_CACHE_SIZE) {
        TOKEN_HASH_CACHE[str] = hash;
        TOKEN_HASH_CACHE_SIZE++;
      }

      return hash;
    } catch (e) {
      logError('Hash function failed', e);
      return 0;
    }
  }

  function solveEmotion(textTokens, parsedModel) {
    if (!parsedModel || !parsedModel.weights) {
      return -999;
    }

    try {
      let score = parsedModel.bias;
      for (let i = 0; i < textTokens.length; i++) {
        const h = fnv1a32(textTokens[i]) % AURA_CONFIG.HASH_SIZE;
        if (h < parsedModel.weights.length) {
          const w = parsedModel.weights[h];
          if (!isNaN(w)) {
            score += w * parsedModel.scale;
          }
        }
      }
      return score;
    } catch (e) {
      logError('Emotion solving failed', e);
      return -999;
    }
  }

  function checkTrigger(tokens, parsedModel, targetObj, key) {
    if (!parsedModel || !targetObj) return;
    try {
      const rawScore = solveEmotion(tokens, parsedModel);
      const threshold = parsedModel.threshold !== undefined
        ? parsedModel.threshold
        : AURA_CONFIG.DEFAULT_RAW_THRESHOLD;
      targetObj[key] = rawScore > threshold;
    } catch (e) {
      logError(`Trigger check failed for ${key}`, e);
      targetObj[key] = false;
    }
  }

  function getDefaultEmotions() {
    const obj = {};
    EMOTIONS.forEach(emo => { obj[emo.toLowerCase()] = false; });
    SENTIMENTS.forEach(sent => { obj[sent] = false; });
    return obj;
  }


  /* ============================================================================
     [SECTION] MAIN EMOTION DETECTION
     DO NOT EDIT: Core logic with error boundaries
     ========================================================================== */
  //#region EMOTION_DETECTION

  try {
    // Initialize emotion objects with validation
    if (typeof ctx.emotions !== 'object' || ctx.emotions === null) {
      ctx.emotions = {};
    }
    if (typeof ctx.emotions_context !== 'object' || ctx.emotions_context === null) {
      ctx.emotions_context = {};
    }

    // Reset ALL emotions including sentiments
    EMOTIONS.forEach(emo => {
      ctx.emotions[emo.toLowerCase()] = false;
      ctx.emotions_context[emo.toLowerCase()] = false;
    });
    SENTIMENTS.forEach(sent => {
      ctx.emotions[sent] = false;
      ctx.emotions_context[sent] = false;
    });

    // ========================================================================
    // IMMEDIATE EMOTION DETECTION (Last Turn Only)
    // ========================================================================
    if (CHAT_WINDOW.text_last_only && Object.keys(PARSED_MODELS).length > 0) {
      try {
        const norm = _normalizeText(CHAT_WINDOW.text_last_only);
        const rawTokens = norm.split(' ');

        const tokens = [];
        let tokenCount = 0;
        for (let i = 0; i < rawTokens.length; i++) {
          if (tokenCount >= AURA_CONFIG.MAX_TOKENS_PER_MESSAGE) {
            logWarn(`Token limit reached (${AURA_CONFIG.MAX_TOKENS_PER_MESSAGE}), truncating`);
            break;
          }
          const t = rawTokens[i];
          if (t.length > 2 && !STOP_WORDS[t]) {
            tokens.push(stem(t));
            tokenCount++;
          }
        }

        const allTokens = tokens.slice();
        for (let i = 0; i < tokens.length - 1; i++) {
          if (allTokens.length >= AURA_CONFIG.MAX_TOKENS_PER_MESSAGE * 2) break;
          allTokens.push(tokens[i] + " " + tokens[i + 1]);
        }

        // Primary Emotion Detection (IMMEDIATE)
        let bestEmotion = "";
        let maxScore = -999;
        let s;

        if (PARSED_MODELS.ANGER) { s = solveEmotion(allTokens, PARSED_MODELS.ANGER); if (s > maxScore) { maxScore = s; bestEmotion = "ANGER"; } }
        if (PARSED_MODELS.JOY) { s = solveEmotion(allTokens, PARSED_MODELS.JOY); if (s > maxScore) { maxScore = s; bestEmotion = "JOY"; } }
        if (PARSED_MODELS.SADNESS) { s = solveEmotion(allTokens, PARSED_MODELS.SADNESS); if (s > maxScore) { maxScore = s; bestEmotion = "SADNESS"; } }
        if (PARSED_MODELS.FEAR) { s = solveEmotion(allTokens, PARSED_MODELS.FEAR); if (s > maxScore) { maxScore = s; bestEmotion = "FEAR"; } }
        if (PARSED_MODELS.ROMANCE) { s = solveEmotion(allTokens, PARSED_MODELS.ROMANCE); if (s > maxScore) { maxScore = s; bestEmotion = "ROMANCE"; } }
        if (PARSED_MODELS.NEUTRAL) { s = solveEmotion(allTokens, PARSED_MODELS.NEUTRAL); if (s > maxScore) { maxScore = s; bestEmotion = "NEUTRAL"; } }

        // Use model-specific raw threshold
        if (bestEmotion && bestEmotion !== "NEUTRAL") {
          const model = PARSED_MODELS[bestEmotion];
          if (model && maxScore > model.threshold) {
            ctx.emotions[bestEmotion.toLowerCase()] = true;
          }
        }

        // Run Sentiment & Epistemic Triggers (IMMEDIATE)
        checkTrigger(allTokens, PARSED_MODELS.POSITIVE, ctx.emotions, "positive");
        checkTrigger(allTokens, PARSED_MODELS.NEGATIVE, ctx.emotions, "negative");
        checkTrigger(allTokens, PARSED_MODELS.CONFUSION, ctx.emotions, "confusion");

      } catch (e) {
        logError('Immediate emotion detection failed', e);
        Object.assign(ctx.emotions, getDefaultEmotions());
      }
    } else if (Object.keys(PARSED_MODELS).length === 0) {
      // No models loaded - default to neutral
      ctx.emotions.neutral = true;
    }

    // ========================================================================
    // CONTEXTUAL EMOTION DETECTION (5-Turn Average)
    // ========================================================================
    if (_lmArr && _lmArr.length > 0 && Object.keys(PARSED_MODELS).length > 0) {
      try {
        const contextDepth = Math.min(AURA_CONFIG.CONTEXT_DEPTH, _lmArr.length);
        const contextStart = Math.max(0, _lmArr.length - contextDepth);
        const contextMessages = _lmArr.slice(contextStart);

        const emotionScores = {
          ANGER: [],
          JOY: [],
          SADNESS: [],
          FEAR: [],
          ROMANCE: [],
          NEUTRAL: []
        };

        const sentimentScores = {
          POSITIVE: [],
          NEGATIVE: [],
          CONFUSION: []
        };

        // Process each message in context window
        for (let msgIdx = 0; msgIdx < contextMessages.length; msgIdx++) {
          const msg = contextMessages[msgIdx];
          const msgText = (msg && typeof msg.message === "string") ? msg.message : _toString(msg);
          const norm = _normalizeText(msgText);
          const rawTokens = norm.split(' ');

          const tokens = [];
          let tokenCount = 0;
          for (let i = 0; i < rawTokens.length; i++) {
            if (tokenCount >= AURA_CONFIG.MAX_TOKENS_PER_MESSAGE) break;
            const t = rawTokens[i];
            if (t.length > 2 && !STOP_WORDS[t]) {
              tokens.push(stem(t));
              tokenCount++;
            }
          }

          const allTokens = tokens.slice();
          for (let i = 0; i < tokens.length - 1; i++) {
            if (allTokens.length >= AURA_CONFIG.MAX_TOKENS_PER_MESSAGE * 2) break;
            allTokens.push(tokens[i] + " " + tokens[i + 1]);
          }

          // Calculate emotion scores for this message
          if (PARSED_MODELS.ANGER) emotionScores.ANGER.push(solveEmotion(allTokens, PARSED_MODELS.ANGER));
          if (PARSED_MODELS.JOY) emotionScores.JOY.push(solveEmotion(allTokens, PARSED_MODELS.JOY));
          if (PARSED_MODELS.SADNESS) emotionScores.SADNESS.push(solveEmotion(allTokens, PARSED_MODELS.SADNESS));
          if (PARSED_MODELS.FEAR) emotionScores.FEAR.push(solveEmotion(allTokens, PARSED_MODELS.FEAR));
          if (PARSED_MODELS.ROMANCE) emotionScores.ROMANCE.push(solveEmotion(allTokens, PARSED_MODELS.ROMANCE));
          if (PARSED_MODELS.NEUTRAL) emotionScores.NEUTRAL.push(solveEmotion(allTokens, PARSED_MODELS.NEUTRAL));

          // Calculate sentiment scores for context
          if (PARSED_MODELS.POSITIVE) sentimentScores.POSITIVE.push(solveEmotion(allTokens, PARSED_MODELS.POSITIVE));
          if (PARSED_MODELS.NEGATIVE) sentimentScores.NEGATIVE.push(solveEmotion(allTokens, PARSED_MODELS.NEGATIVE));
          if (PARSED_MODELS.CONFUSION) sentimentScores.CONFUSION.push(solveEmotion(allTokens, PARSED_MODELS.CONFUSION));
        }

        // Calculate average emotion scores
        let bestContextEmotion = "";
        let maxContextScore = -999;
        let hasAnyScores = false;

        for (const emo in emotionScores) {
          if (emotionScores[emo].length > 0) {
            hasAnyScores = true;
            const sum = emotionScores[emo].reduce((a, b) => a + b, 0);
            const avg = sum / emotionScores[emo].length;
            if (avg > maxContextScore) {
              maxContextScore = avg;
              bestContextEmotion = emo;
            }
          }
        }

        // Set contextual emotion based on average threshold
        if (hasAnyScores && bestContextEmotion && bestContextEmotion !== "NEUTRAL") {
          const model = PARSED_MODELS[bestContextEmotion];
          if (model && maxContextScore > model.threshold) {
            ctx.emotions_context[bestContextEmotion.toLowerCase()] = true;
          } else {
            ctx.emotions_context["neutral"] = true;
          }
        } else {
          ctx.emotions_context["neutral"] = true;
        }

        // Set contextual sentiments
        for (const sent in sentimentScores) {
          if (sentimentScores[sent].length > 0) {
            const sum = sentimentScores[sent].reduce((a, b) => a + b, 0);
            const avg = sum / sentimentScores[sent].length;
            const model = PARSED_MODELS[sent];
            if (model && avg > model.threshold) {
              ctx.emotions_context[sent.toLowerCase()] = true;
            }
          }
        }

      } catch (e) {
        logError('Contextual emotion detection failed', e);
        ctx.emotions_context["neutral"] = true;
      }
    } else {
      // No history or no models - default to neutral context
      ctx.emotions_context["neutral"] = true;
    }

    // Performance monitoring
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      const duration = performance.now() - PERF_START;
      if (duration > AURA_CONFIG.PERFORMANCE_WARN_MS) {
        logWarn(`Emotion processing took ${duration.toFixed(2)}ms (threshold: ${AURA_CONFIG.PERFORMANCE_WARN_MS}ms)`);
      }
    }

  } catch (e) {
    logError('Emotion processing failed catastrophically', e);
    // Graceful degradation - provide neutral emotions
    ctx.emotions = getDefaultEmotions();
    ctx.emotions.neutral = true;
    ctx.emotions_context = getDefaultEmotions();
    ctx.emotions_context.neutral = true;
  }


  /* ============================================================================
     [SECTION] UTILITIES
     SAFE TO EDIT: Yes
     ========================================================================== */
  //#region UTILITIES

  function dbg(msg) {
    if (AURA_CONFIG.DEBUG) {
      logInfo(String(msg));
    }
  }

  function toArray(x) {
    return Array.isArray(x) ? x : (x == null ? [] : [x]);
  }

  function clamp01(v) {
    v = +v;
    if (!isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

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
    if (p < AURA_CONFIG.MIN_PRIORITY) p = AURA_CONFIG.MIN_PRIORITY;
    if (p > AURA_CONFIG.MAX_PRIORITY) p = AURA_CONFIG.MAX_PRIORITY;
    return p;
  }

  function getMin(e) {
    return (e && isFinite(e.minMessages)) ? +e.minMessages : -Infinity;
  }

  function getMax(e) {
    return (e && isFinite(e.maxMessages)) ? +e.maxMessages : Infinity;
  }

  function getTriggers(e) {
    return (e && Array.isArray(e.triggers)) ? e.triggers.slice(0) : [];
  }

  function getBlocklist(e) {
    if (!e) return [];
    if (Array.isArray(e.block)) return e.block.slice(0);
    if (Array.isArray(e.Block)) return e.Block.slice(0);
    return [];
  }

  function getNameBlock(e) {
    return (e && Array.isArray(e.nameBlock)) ? e.nameBlock.slice(0) : [];
  }

  function _normalizeName(s) {
    return _normalizeText(s);
  }

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
    try {
      const expanded = [];
      for (const keyword of keywords) {
        const match = String(keyword).match(regex);
        if (match) {
          const entityName = match[1].toLowerCase();
          const entity = entityDb[entityName];
          if (entity) {
            expanded.push(entityName);
            if (Array.isArray(entity.aliases)) {
              expanded.push(...entity.aliases);
            }
            dbgFunc(`Expanded '${keyword}' to include keywords for '${entityName}'.`);
          } else {
            dbgFunc(`Could not find entity for '${keyword}'. Ignoring.`);
          }
        } else {
          expanded.push(keyword);
        }
      }
      return [...new Set(expanded)];
    } catch (e) {
      logError('Keyword expansion failed', e);
      return keywords;
    }
  }

  function expandEntityKeywords(loreBook, entityDb, dbgFunc) {
    try {
      const entityKeywordRegex = /^char\.([a-z0-9_]+)$/i;
      for (const entry of loreBook) {
        // Expand in both keywords and andAny
        if (entry.keywords && entry.keywords.length) {
          entry.keywords = expandKeywordsInArray(entry.keywords, entityDb, entityKeywordRegex, dbgFunc);
        }
        if (entry.andAny && entry.andAny.length) {
          entry.andAny = expandKeywordsInArray(entry.andAny, entityDb, entityKeywordRegex, dbgFunc);
        }
        if (entry.Shifts && entry.Shifts.length) {
          for (const shift of entry.Shifts) {
            if (shift.keywords && shift.keywords.length) {
              shift.keywords = expandKeywordsInArray(shift.keywords, entityDb, entityKeywordRegex, dbgFunc);
            }
            if (shift.andAny && shift.andAny.length) {
              shift.andAny = expandKeywordsInArray(shift.andAny, entityDb, entityKeywordRegex, dbgFunc);
            }
          }
        }
      }
    } catch (e) {
      logError('Entity keyword expansion failed', e);
    }
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Cached regex patterns with size limit
  const REGEX_CACHE = {};
  let REGEX_CACHE_SIZE = 0;

  function getCachedRegex(pattern, flags) {
    const key = pattern + '::' + (flags || '');
    if (!REGEX_CACHE[key]) {
      try {
        // Cap cache size to prevent unbounded growth
        if (REGEX_CACHE_SIZE >= AURA_CONFIG.MAX_REGEX_CACHE_SIZE) {
          // Reset cache when limit reached
          for (const k in REGEX_CACHE) {
            delete REGEX_CACHE[k];
          }
          REGEX_CACHE_SIZE = 0;
          logWarn(`Regex cache reset (hit limit of ${AURA_CONFIG.MAX_REGEX_CACHE_SIZE})`);
        }

        REGEX_CACHE[key] = new RegExp(pattern, flags);
        REGEX_CACHE_SIZE++;
      } catch (e) {
        logError('Regex compilation failed', e);
        return null;
      }
    }
    return REGEX_CACHE[key];
  }

  // Strip ALL inner [AURA] blocks, not just boundary wrappers
  function stripAuraBlock(s) {
    if (!s || typeof s !== 'string') return '';
    try {
      // Remove all complete [AURA]...[/AURA] blocks (globally)
      s = s.replace(/\[AURA\][\s\S]*?\[\/AURA\]/gi, '');
      // Also strip any dangling boundary markers
      s = s.replace(/^\s*\[AURA\]\s*/i, '').replace(/\s*\[\/AURA\]\s*$/i, '');
      return s.trim();
    } catch (e) {
      logError('Failed to strip AURA block', e);
      return s;
    }
  }

  // O(1) keyword matching with alphanumeric wildcard support
  function _hasTerm(haystackNorm, tokenSet, term) {
    try {
      const rawTerm = (term == null ? "" : String(term)).trim();
      if (!rawTerm) return false;

      // Handle wildcard terms with alphanumeric support
      if (rawTerm.charAt(rawTerm.length - 1) === "*") {
        const stem = _normalizeText(rawTerm.slice(0, -1));
        if (!stem) return false;
        const pattern = "(?:^|\\s)" + escapeRegex(stem) + "[a-z0-9]*?(?=\\s|$)";
        const re1 = getCachedRegex(pattern);
        return re1 ? re1.test(haystackNorm) : false;
      }

      // Exact match using Set (O(1))
      const t = _normalizeText(rawTerm);
      if (!t) return false;

      // Check if any token in the set matches
      const termTokens = t.split(/\s+/);
      if (termTokens.length === 1) {
        // Single word - direct lookup
        return tokenSet.has(termTokens[0]);
      } else {
        // Multi-word phrase - fall back to regex
        const w = escapeRegex(t);
        const pattern = "(?:^|\\s)" + w + "(?=\\s|$)";
        const re2 = getCachedRegex(pattern);
        return re2 ? re2.test(haystackNorm) : false;
      }
    } catch (e) {
      logError('Term matching failed', e);
      return false;
    }
  }

  // V24.2: Collect word gates (keywords included in 'any')
  function collectWordGates(e) {
    try {
      const getGateSet = (prefix = "") => {
        const p = (key) => `${prefix}${key}`;
        const r = (e && e[p('requires')]) ? e[p('requires')] : {};

        const any = [].concat(
          toArray(e && e[p('keywords')]),      // keywords treated as any-gate
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
          prefix === "" ? toArray(getBlocklist(e)) : toArray(e && e[p('block')])
        );
        const nall = [].concat(toArray(e && e[p('notAll')]));

        return { any, all, none, nall };
      };

      return {
        current: getGateSet(),
        previous: getGateSet('prev.')
      };
    } catch (e) {
      logError('Word gate collection failed', e);
      return {
        current: { any: [], all: [], none: [], nall: [] },
        previous: { any: [], all: [], none: [], nall: [] }
      };
    }
  }

  function _checkWordGates(e) {
    try {
      const g = collectWordGates(e);

      const cur = g.current;
      if (cur.any.length && !cur.any.some(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return false;
      if (cur.all.length && !cur.all.every(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return false;
      if (cur.none.length && cur.none.some(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return false;
      if (cur.nall.length && cur.nall.every(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return false;

      const prevScope = g.previous;
      if (prevScope.any.length && !prevScope.any.some(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return false;
      if (prevScope.all.length && !prevScope.all.every(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return false;
      if (prevScope.none.length && prevScope.none.some(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return false;
      if (prevScope.nall.length && prevScope.nall.every(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return false;

      return true;
    } catch (e) {
      logError('Word gate check failed', e);
      return false;
    }
  }

  function _checkTagGates(e, activeTagsSet) {
    try {
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
    } catch (e) {
      logError('Tag gate check failed', e);
      return false;
    }
  }

  function _checkEmotionGates(e) {
    try {
      const anyE = toArray(e && (e.requireAnyEmotion || e.andAnyEmotion || e.requireEmotion));
      const allE = toArray(e && (e.requireAllEmotion || e.andAllEmotion));
      const noneE = toArray(e && (e.blockAnyEmotion || e.notAnyEmotion || e.blockEmotion));
      const nallE = toArray(e && (e.blockAllEmotion || e.notAllEmotion));

      const anyECtx = toArray(e && e.andAnyContextEmotion);
      const allECtx = toArray(e && e.andAllContextEmotion);
      const noneECtx = toArray(e && e.notAnyContextEmotion);
      const nallECtx = toArray(e && e.notAllContextEmotion);

      if (anyE.length === 0 && allE.length === 0 && noneE.length === 0 && nallE.length === 0 &&
        anyECtx.length === 0 && allECtx.length === 0 && noneECtx.length === 0 && nallECtx.length === 0) {
        return true;
      }

      const activeEmotions = (ctx && typeof ctx.emotions === 'object' && ctx.emotions) ? ctx.emotions : {};
      const hasE = emo => activeEmotions[String(emo).toLowerCase()] === true;

      if (anyE.length > 0 && !anyE.some(hasE)) return false;
      if (allE.length > 0 && !allE.every(hasE)) return false;
      if (noneE.length > 0 && noneE.some(hasE)) return false;
      if (nallE.length > 0 && nallE.every(hasE)) return false;

      const activeEmotionsCtx = (ctx && typeof ctx.emotions_context === 'object' && ctx.emotions_context) ? ctx.emotions_context : {};
      const hasECtx = emo => activeEmotionsCtx[String(emo).toLowerCase()] === true;

      if (anyECtx.length > 0 && !anyECtx.some(hasECtx)) return false;
      if (allECtx.length > 0 && !allECtx.every(hasECtx)) return false;
      if (noneECtx.length > 0 && noneECtx.some(hasECtx)) return false;
      if (nallECtx.length > 0 && nallECtx.every(hasECtx)) return false;

      return true;
    } catch (e) {
      logError('Emotion gate check failed', e);
      return false;
    }
  }

  // V24.2: Derive _isAlwaysOn from gate collectors (not hand-maintained)
  function _isAlwaysOn(e) {
    if (!e) return false;

    try {
      // Check word gates via collector
      const wordGates = collectWordGates(e);
      const hasWordGates = (
        wordGates.current.any.length > 0 ||
        wordGates.current.all.length > 0 ||
        wordGates.current.none.length > 0 ||
        wordGates.current.nall.length > 0 ||
        wordGates.previous.any.length > 0 ||
        wordGates.previous.all.length > 0 ||
        wordGates.previous.none.length > 0 ||
        wordGates.previous.nall.length > 0
      );

      if (hasWordGates) return false;

      // Check message count gates
      if (e.minMessages != null || e.maxMessages != null) return false;

      // Check emotion gates
      const hasEmotionGate = !!(
        (e.requireAnyEmotion && e.requireAnyEmotion.length) ||
        (e.andAnyEmotion && e.andAnyEmotion.length) ||
        (e.requireEmotion && e.requireEmotion.length) ||
        (e.requireAllEmotion && e.requireAllEmotion.length) ||
        (e.andAllEmotion && e.andAllEmotion.length) ||
        (e.blockAnyEmotion && e.blockAnyEmotion.length) ||
        (e.notAnyEmotion && e.notAnyEmotion.length) ||
        (e.blockEmotion && e.blockEmotion.length) ||
        (e.andAnyContextEmotion && e.andAnyContextEmotion.length) ||
        (e.andAllContextEmotion && e.andAllContextEmotion.length) ||
        (e.notAnyContextEmotion && e.notAnyContextEmotion.length) ||
        (e.notAllContextEmotion && e.notAllContextEmotion.length)
      );

      if (hasEmotionGate) return false;

      // Check tag gates
      const hasTagGate = !!(
        (e.andAnyTags && e.andAnyTags.length) ||
        (e.andAllTags && e.andAllTags.length) ||
        (e.notAnyTags && e.notAnyTags.length) ||
        (e.notAllTags && e.notAllTags.length)
      );

      if (hasTagGate) return false;

      // NOTE - 'tag' (e.tag) is NOT a gate, it's an identifier
      // An entry can have a tag and still be always-on if it has no gates

      return true;
    } catch (e) {
      logError('_isAlwaysOn check failed', e);
      return false;
    }
  }

  function _isEntryActive(e, activeTagsSet) {
    try {
      if (!(messageCount >= getMin(e) && messageCount <= getMax(e))) return false;
      if (_isNameBlocked(e)) return false;
      if (!_checkWordGates(e)) return false;
      if (!_checkTagGates(e, activeTagsSet || {})) return false;
      if (!_checkEmotionGates(e)) return false;
      if (Math.random() > parseProbability(e && e.probability)) return false;
      return true;
    } catch (e) {
      logError('Entry activation check failed', e);
      return false;
    }
  }

  // Move hasTag to outer scope to fix relationship trigger bug
  function makeTagSet() { return Object.create(null); }
  function addTag(set, key) { set[String(key)] = 1; }
  function hasTag(set, key) { return set[String(key)] === 1; }

  // Scan entity aliases in addition to main name
  function resolveActiveEntities(currentText, lastMessages) {
    try {
      let memory = { M: null, F: null, N: null };
      let activeEntities = new Set();

      const scanTextForNames = (text) => {
        const lower = text.toLowerCase();
        for (const name in ENTITY_DB) {
          if (Object.prototype.hasOwnProperty.call(ENTITY_DB, name)) {
            const entity = ENTITY_DB[name];

            // Scan main name
            const nameRegex = getCachedRegex(`\\b${escapeRegex(name)}\\b`);
            if (nameRegex && nameRegex.test(lower)) {
              memory[entity.gender] = name;
              memory.N = name;
              if (text === currentText) activeEntities.add(name);
            }

            // Also scan aliases
            if (Array.isArray(entity.aliases)) {
              for (const alias of entity.aliases) {
                const aliasRegex = getCachedRegex(`\\b${escapeRegex(alias)}\\b`);
                if (aliasRegex && aliasRegex.test(lower)) {
                  memory[entity.gender] = name;  // Store canonical name
                  memory.N = name;
                  if (text === currentText) activeEntities.add(name);
                }
              }
            }
          }
        }
      };

      if (lastMessages && Array.isArray(lastMessages)) {
        for (const msg of lastMessages) {
          const msgText = (msg && typeof msg.message === 'string') ? msg.message : _toString(msg);
          scanTextForNames(msgText);
        }
      }

      scanTextForNames(currentText);

      const lowerCurrent = currentText.toLowerCase();
      const words = lowerCurrent.split(/\W+/);

      for (const word of words) {
        if (PRONOUN_MAP[word]) {
          const gender = PRONOUN_MAP[word];
          const target = memory[gender] || memory.N;
          if (target) {
            activeEntities.add(target);
            dbg(`Coreference: '${word}' -> ${target}`);
          }
        }
      }

      return Array.from(activeEntities);
    } catch (e) {
      logError('Entity resolution failed', e);
      return [];
    }
  }

  function getDynamicRelationshipLore(activeTagsSet) {
    try {
      const lastMessages = (_lmArr || []).map(item => (item && typeof item.message === "string") ? item.message : _toString(item));
      const activeEntities = resolveActiveEntities(CHAT_WINDOW.text_last_only, lastMessages);

      if (activeEntities.length < 2) return [];

      let injections = [];

      for (const trigger of RELATIONSHIP_DB) {
        const hasPair = trigger.pair.every(name => activeEntities.includes(name));

        if (hasPair) {
          const requireTags = toArray(trigger.requireTags);
          if (requireTags.length === 0) continue;
          // hasTag now available (moved to outer scope)
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
    } catch (e) {
      logError('Dynamic relationship lore failed', e);
      return [];
    }
  }

  function compileAuthorLore(authorLore, entityDb) {
    try {
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
    } catch (e) {
      logError('Author lore compilation failed', e);
      return [];
    }
  }

  function normalizeEntry(e) {
    try {
      if (!e) return {};
      const out = {};
      for (const k in e) if (Object.prototype.hasOwnProperty.call(e, k)) out[k] = e[k];

      // Keep both keywords and andAny separate (merged at runtime in collectWordGates)
      out.keywords = Array.isArray(e.keywords) ? e.keywords.slice(0) : [];
      out.andAny = Array.isArray(e.andAny) ? e.andAny.slice(0) : [];

      if (Array.isArray(e.Shifts) && e.Shifts.length) {
        const shArr = new Array(e.Shifts.length);
        for (const [i, shift] of e.Shifts.entries()) {
          const sh = shift || {};
          const shOut = {};
          for (const sk in sh) if (Object.prototype.hasOwnProperty.call(sh, sk)) shOut[sk] = sh[sk];
          shOut.keywords = Array.isArray(sh.keywords) ? sh.keywords.slice(0) : [];
          shOut.andAny = Array.isArray(sh.andAny) ? sh.andAny.slice(0) : [];
          shArr[i] = shOut;
        }
        out.Shifts = shArr;
      } else if (out.hasOwnProperty("Shifts")) {
        delete out.Shifts;
      }
      return out;
    } catch (e) {
      logError('Entry normalization failed', e);
      return {};
    }
  }


  /* ============================================================================
     [SECTION] COMPILATION
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region COMPILATION

  const _ENGINE_LORE = compileAuthorLore(
    typeof DYNAMIC_LORE !== "undefined" ? DYNAMIC_LORE : [],
    typeof ENTITY_DB !== "undefined" ? ENTITY_DB : {}
  );

  expandEntityKeywords(_ENGINE_LORE, ENTITY_DB, dbg);


  /* ============================================================================
     [SECTION] SELECTION PIPELINE
     DO NOT EDIT: Behavior-sensitive
     ========================================================================== */
  //#region SELECTION_PIPELINE

  try {
    const buckets = Array(AURA_CONFIG.MAX_PRIORITY + 1).fill(null).map(() => []);
    const picked = new Array(_ENGINE_LORE.length).fill(0);
    const inclusionGroups = {};

    const trigSet = makeTagSet();
    const postShiftTrigSet = makeTagSet();

    // V24.2: Candidate selection without keyword duplication
    // Keywords are already included in collectWordGates, so we don't check them separately
    // V24.3: Candidate selection with emotion gate support
    function isCandidate(e) {
      if (_isAlwaysOn(e)) return true;

      // Check current scope gates
      const gates = collectWordGates(e);
      const cur = gates.current;
      const prev = gates.previous;

      // ANY gates: some() is correct (any match = candidate)
      if (cur.any.length && cur.any.some(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return true;
      if (prev.any.length && prev.any.some(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return true;

      // ALL gates: every() is correct (all must match)
      if (cur.all.length && cur.all.every(w => _hasTerm(_currentHaystackNorm, _currentTokenSet, w))) return true;
      if (prev.all.length && prev.all.every(w => _hasTerm(_previousHaystackNorm, _previousTokenSet, w))) return true;

      // V24.3: Check if entry has emotion gates - if so, it's a candidate
      // (will be filtered by _isEntryActive if emotions don't actually match)
      const hasEmotionGates = !!(
        (e.requireAnyEmotion && e.requireAnyEmotion.length) ||
        (e.andAnyEmotion && e.andAnyEmotion.length) ||
        (e.requireEmotion && e.requireEmotion.length) ||
        (e.requireAllEmotion && e.requireAllEmotion.length) ||
        (e.andAllEmotion && e.andAllEmotion.length) ||
        (e.blockAnyEmotion && e.blockAnyEmotion.length) ||
        (e.notAnyEmotion && e.notAnyEmotion.length) ||
        (e.blockEmotion && e.blockEmotion.length) ||
        (e.blockAllEmotion && e.blockAllEmotion.length) ||
        (e.notAllEmotion && e.notAllEmotion.length) ||
        (e.andAnyContextEmotion && e.andAnyContextEmotion.length) ||
        (e.andAllContextEmotion && e.andAllContextEmotion.length) ||
        (e.notAnyContextEmotion && e.notAnyContextEmotion.length) ||
        (e.notAllContextEmotion && e.notAllContextEmotion.length)
      );

      if (hasEmotionGates) return true;

      // V24.3: Check if entry has tag gates - if so, it's a candidate
      // (will be filtered by _isEntryActive if tags don't actually match)
      const hasTagGates = !!(
        (e.andAnyTags && e.andAnyTags.length) ||
        (e.andAllTags && e.andAllTags.length) ||
        (e.notAnyTags && e.notAnyTags.length) ||
        (e.notAllTags && e.notAllTags.length)
      );

      if (hasTagGates) return true;

      return false;
    }

    // --- 1) Direct pass ----------------------------------------------------------
    for (const [i1, e1] of _ENGINE_LORE.entries()) {
      if (!isCandidate(e1)) continue;
      if (!_isEntryActive(e1, undefined)) {
        dbg(`filtered entry[${i1}]`);
        continue;
      }
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
      if (!_isEntryActive(e2, trigSet)) {
        dbg(`filtered triggered entry[${i2}]`);
        continue;
      }
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
    const applyLimit = AURA_CONFIG.APPLY_LIMIT;

    for (let p = AURA_CONFIG.MAX_PRIORITY; p >= AURA_CONFIG.MIN_PRIORITY && pickedCount < applyLimit; p--) {
      const bucket = buckets[p];
      if (!bucket || !bucket.length) continue;

      for (const item of bucket) {
        if (pickedCount >= applyLimit) break;

        const entry = _ENGINE_LORE[item];
        // Only use explicit group field (not id-based inference)
        const group = entry.group || null;
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


    /* ==========================================================================
       [SECTION] APPLY + SHIFTS + POST-SHIFT
       DO NOT EDIT: Behavior-sensitive
       ========================================================================== */
    //#region APPLY_AND_SHIFTS

    // Track personality entries by full string (not paragraphs)
    const personalityEntries = [];
    let scenarioBuffer = "";
    let personalityCharCount = 0;
    let scenarioCharCount = 0;

    for (const idx of selected) {
      const e3 = _ENGINE_LORE[idx];

      // V24.2: Cap personality buffer size
      if (e3 && e3.personality) {
        const entryLen = e3.personality.length;
        if (personalityCharCount + entryLen <= AURA_CONFIG.MAX_PERSONALITY_CHARS) {
          personalityEntries.push(e3.personality);
          personalityCharCount += entryLen;
        } else {
          logWarn(`Personality buffer limit reached (${AURA_CONFIG.MAX_PERSONALITY_CHARS} chars), truncating`);
        }
      }

      // V24.2: Cap scenario buffer size
      if (e3 && e3.scenario) {
        const stripped = stripAuraBlock(e3.scenario);
        const entryLen = stripped.length;
        if (scenarioCharCount + entryLen <= AURA_CONFIG.MAX_SCENARIO_CHARS) {
          scenarioBuffer += `\n\n${stripped}`;
          scenarioCharCount += entryLen;
        } else {
          logWarn(`Scenario buffer limit reached (${AURA_CONFIG.MAX_SCENARIO_CHARS} chars), truncating`);
        }
      }

      if (!(e3 && Array.isArray(e3.Shifts) && e3.Shifts.length)) continue;

      for (const sh of e3.Shifts) {
        const shiftCandidate = isCandidate(sh);
        if (!shiftCandidate) continue;

        // Check activation BEFORE emitting triggers
        if (!_isEntryActive(sh, trigSet)) {
          dbg("shift filtered");
          continue;
        }

        // Only emit triggers if shift actually activated
        const trgSh = getTriggers(sh);
        for (const tag of trgSh) {
          addTag(postShiftTrigSet, tag);
        }

        // V24.2: Cap buffers
        if (sh.personality) {
          const entryLen = sh.personality.length;
          if (personalityCharCount + entryLen <= AURA_CONFIG.MAX_PERSONALITY_CHARS) {
            personalityEntries.push(sh.personality);
            personalityCharCount += entryLen;
          }
        }

        if (sh.scenario) {
          const stripped = stripAuraBlock(sh.scenario);
          const entryLen = stripped.length;
          if (scenarioCharCount + entryLen <= AURA_CONFIG.MAX_SCENARIO_CHARS) {
            scenarioBuffer += `\n\n${stripped}`;
            scenarioCharCount += entryLen;
          }
        }
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
      if (!_isEntryActive(e4, unionTags)) {
        dbg(`post-filter entry[${i3}]`);
        continue;
      }

      // V24.2: Cap buffers
      if (e4.personality) {
        const entryLen = e4.personality.length;
        if (personalityCharCount + entryLen <= AURA_CONFIG.MAX_PERSONALITY_CHARS) {
          personalityEntries.push(e4.personality);
          personalityCharCount += entryLen;
        }
      }

      if (e4.scenario) {
        const stripped = stripAuraBlock(e4.scenario);
        const entryLen = stripped.length;
        if (scenarioCharCount + entryLen <= AURA_CONFIG.MAX_SCENARIO_CHARS) {
          scenarioBuffer += `\n\n${stripped}`;
          scenarioCharCount += entryLen;
        }
      }

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

        // V24.2: Cap personality buffer
        const entryLen = injectionObj.injection.length;
        if (personalityCharCount + entryLen <= AURA_CONFIG.MAX_PERSONALITY_CHARS) {
          personalityEntries.push(injectionObj.injection);
          personalityCharCount += entryLen;
        }
      }
    }


    /* ==========================================================================
       [SECTION] FLUSH
       DO NOT EDIT: Behavior-sensitive
       ========================================================================== */
    //#region FLUSH

    // Deduplicate by whole entry strings (not paragraphs)
    // This preserves multi-paragraph entries and prevents fragmentation
    if (personalityEntries.length > 0) {
      const seen = new Set();
      const uniqueEntries = [];
      for (const entry of personalityEntries) {
        if (!seen.has(entry)) {
          seen.add(entry);
          uniqueEntries.push(entry);
        }
      }
      ctx.character.personality += '\n\n' + uniqueEntries.join('\n\n');
    }

    // Wrap entire scenario buffer in single [AURA] block before replacement
    // Inner blocks are already stripped by stripAuraBlock()
    if (scenarioBuffer) {
      const wrappedScenario = `[AURA]\n${scenarioBuffer.trim()}\n[/AURA]`;
      const auraMatch = ctx.character.scenario.match(/\[AURA\][\s\S]*?\[\/AURA\]/);
      if (auraMatch) {
        // Replace existing AURA block
        ctx.character.scenario = ctx.character.scenario.replace(
          /\[AURA\][\s\S]*?\[\/AURA\]/,
          wrappedScenario
        );
      } else {
        // No AURA block exists, append
        ctx.character.scenario += '\n\n' + wrappedScenario;
      }
    }

    // Set success flag for debugging
    ctx.aura_ok = true;

  } catch (e) {
    logError('Selection pipeline failed catastrophically', e);
    ctx.aura_ok = false;
  }

  // Flush diagnostics to context
  flushDiagnostics();

  //#endregion
})();

// V24.2: Write back to global context if it exists
if (typeof context !== "undefined" && context !== null) {
  try {
    context.emotions = ctx.emotions;
    context.emotions_context = ctx.emotions_context;
    context.character = ctx.character;
    context.aura_ok = ctx.aura_ok;
    context.aura_diagnostics = ctx.aura_diagnostics;
  } catch (e) {
    safeConsoleError('[AURA] Failed to write back to context:', e);
  }
}