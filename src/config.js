// ── STATIC DATA / CONFIGURATION ───────────────────

export const LAYERS = {
  external:  { label: 'External Services', color: '#F3F5FB', colorActive: '#E7ECFA', dot: '#2563EB', stroke: '#2563EB' },
  pipeline:  { label: 'Pipeline (Edge Functions)', color: '#F2FAF7', colorActive: '#E2F5EE', dot: '#059669', stroke: '#059669' },
  module:    { label: 'Sub-modules & RPCs', color: '#F6F3FC', colorActive: '#EDE6FA', dot: '#7C3AED', stroke: '#7C3AED' },
  data:      { label: 'Data Layer', color: '#FDF6EE', colorActive: '#FAEDDD', dot: '#D97706', stroke: '#D97706' },
  devops:    { label: 'DevOps / Tooling', color: '#FBF4ED', colorActive: '#F7EADB', dot: '#B45309', stroke: '#B45309' },
};

export const CONN_TYPES = {
  'data-flow':  { label: 'Data Flow (blocking)', color: '#2563EB', dash: '', marker: 'arrow-blue' },
  'fire-forget': { label: 'Fire & Forget', color: '#D97706', dash: '8,4', marker: 'arrow-orange' },
  'tool-call':  { label: 'External API Call', color: '#059669', dash: '6,3', marker: 'arrow-green' },
  'event':      { label: 'Async / Event', color: '#DC2626', dash: '4,4', marker: 'arrow-red' },
  'dependency': { label: 'Import / Dependency', color: '#6B7280', dash: '2,4', marker: 'arrow-gray' },
  'rpc':        { label: 'RPC / DB Function', color: '#7C3AED', dash: '5,3', marker: 'arrow-purple' },
};

export const ROW_LABELS = [
  { text: 'EXTERNAL SERVICES', x: 10, y: 18 },
  { text: 'INGESTION', x: 10, y: 108 },
  { text: 'SEGMENTATION', x: 10, y: 198 },
  { text: 'CONTEXT ASSEMBLY', x: 10, y: 288 },
  { text: 'ATTRIBUTION ENGINE', x: 10, y: 378 },
  { text: 'PERCEPTION + JOURNAL HOOKS', x: 10, y: 468 },
  { text: 'ADMIN / UTILITY', x: 10, y: 623 },
  { text: 'ALIAS + EMBEDDING', x: 10, y: 713 },
  { text: 'DATABASE \u2014 CORE + SPANS', x: 10, y: 813 },
  { text: 'DATABASE \u2014 JOURNAL + CONTEXT + ALIAS', x: 10, y: 903 },
  { text: 'RPCs + TRIGGERS', x: 10, y: 993 },
  { text: 'DEVOPS + CI/CD', x: 10, y: 1083 },
];

export const CONNECTION_LABEL_DESC_MAP = {
  'admin-reseed\u2192ai-router|reroute': 'Reseed reruns routing on existing spans to test new router versions/config without silently overriding human locks.',
  'admin-reseed\u2192context-assembly|reroute': 'Reseed reruns context assembly to refresh candidates and retrieved facts for existing spans.',
  'admin-reseed\u2192db-review|cleanup+override_log': 'Cleans up review state and records reseed actions so human workflows stay coherent.',
  'admin-reseed\u2192db-spans|supersede+insert spans': 'Supersedes old spans and inserts regenerated ones during reseed, preserving lineage and preventing mixed-span states.',
  'admin-reseed\u2192journal-extract|reextract': 'Reseed re-extracts journal claims for spans to backfill new claim types or improved prompts.',
  'admin-reseed\u2192segment-llm|reseg': 'Reseed tooling reruns segmentation to rebuild spans when logic changes, while respecting locks that protect human decisions.',
  'admin-reseed\u2192striking-detect|redetect': 'Reseed re-scores striking signals for existing spans to keep urgency metrics consistent after model/prompt updates.',
  'ai-router\u2192db-review|review_queue+alias_suggestions': 'Creates review_queue items when attribution is uncertain and records potential alias suggestions discovered during routing.',
  'ai-router\u2192db-spans|upsert attributions': 'Writes span_attributions as the system-of-record for which project each span belongs to, including lock state and confidence.',
  'ai-router\u2192journal-extract|belt & suspenders': 'As a backup, ai-router also triggers journal-extract when it assigns a project, ensuring claim extraction still happens even if an earlier hook was skipped.',
  'ai-router\u2192journal-extract|belt_and_suspenders': 'As a backup, ai-router also triggers journal-extract when it assigns a project, ensuring claim extraction still happens even if an earlier hook was skipped.',
  'ai-router\u2192review-triage|queue if review': 'When routing is uncertain or blocked by guardrails, ai-router enqueues an item for human review rather than guessing.',
  'ai-router\u2192review-triage|queue_if_flagged': 'When routing is uncertain or blocked by guardrails, ai-router enqueues an item for human review rather than guessing.',
  'alias-hygiene\u2192db-alias|retire+expire': 'Retires aliases for closed/inactive projects to reduce drift and false matches.',
  'alias-review\u2192db-alias|approve/reject': 'Applies human decisions on alias suggestions, promoting good aliases and rejecting noisy ones.',
  'alias-scout\u2192db-alias|suggested_aliases': 'Writes candidate aliases discovered from text mining so humans can approve them and improve future routing.',
  'anthropic\u2192ai-router|Haiku': 'ai-router calls Haiku to assign each span to the correct project (or decide it needs review), using the assembled context and guardrails.',
  'anthropic\u2192chain-detect|Haiku': 'chain-detect uses Haiku to link related calls into threads so the system can reason over continuity across interactions.',
  'anthropic\u2192generate-summary|Haiku': 'generate-summary calls Haiku to produce a human-readable call summary and structured follow-up items.',
  'anthropic\u2192journal-consolidate|Sonnet 4.5': 'journal-consolidate uses Sonnet to merge new claims into the project record, resolving duplicates and flagging contradictions.',
  'anthropic\u2192journal-extract|Haiku': 'journal-extract calls Haiku to extract structured journal claims and open loops from an attributed span.',
  'anthropic\u2192loop-closure|Haiku': 'loop-closure uses Haiku to mark open loops as closed when later evidence confirms completion.',
  'anthropic\u2192striking-detect|Haiku': 'striking-detect calls Haiku to score urgency/risks and write striking signals used for ops prioritization.',
  'cc-scripts\u2192admin-reseed|batch': 'Operational scripts launch batch reseeds to reprocess many interactions under controlled conditions.',
  'cc-scripts\u2192gt-apply|batch': 'Batch scripts apply ground-truth corrections at scale for evaluation and model iteration.',
  'cc-scripts\u2192shadow-replay|batch': 'Batch shadow replays run historical traffic through the pipeline in a non-impacting mode to measure changes.',
  'chain-detect\u2192db-pipeline-aux|call_chains': 'Stores call-to-call linkage so the system can reason over ongoing threads with a contact.',
  'claim-guard\u2192cc-scripts|preflight': 'Claim guard enforces operator context and safety checks before any write-mode script can run.',
  'process-call\u2192claim-guard|finance_cost_code_preflight': 'Runs finance/cost-code preflight checks before downstream writes so classifications are explicit and auditable.',
  'context-assembly\u2192ai-router|context_package': 'context-assembly hands ai-router a complete context package (span text + candidates + retrieved facts/claims) so routing can be decided consistently.',
  'context-assembly\u2192db-context|span_place_mentions': 'Persists detected place mentions from spans to support geo signals and later analysis.',
  'context-assembly\u2192gmail-ctx|email fetch (fail-open)': 'context-assembly optionally fetches cached email context; if Gmail is unavailable it proceeds without email so routing doesn\'t stall.',
  'context-assembly\u2192gmail-ctx|email_fetch_fail_open': 'context-assembly optionally fetches cached email context; if Gmail is unavailable it proceeds without email so routing doesn\'t stall.',
  'ctx-retrievers\u2192context-assembly|6 retrievers': 'Retrievers supply ranked signals (aliases, affinity, facts, claims, geo, email) that context-assembly packages for routing.',
  'db-alias\u2192ctx-retrievers|alias lookup': 'Retrievers load active project aliases so context-assembly can match spoken names to projects.',
  'db-context\u2192ctx-retrievers|fanout+affinity+geo': 'Retrievers use precomputed affinity, fanout classification, and geo proximity to rank candidate projects.',
  'db-core\u2192generate-summary|interactions+calls_raw': 'generate-summary reads stored interactions, transcripts, and routing outputs to produce the final summary and tasks.',
  'db-core\u2192process-call|contacts+projects': 'process-call reads core contacts/projects to resolve the caller identity and limit candidates to eligible projects.',
  'db-journal\u2192ctx-retrievers|claims+open_loops': 'Retrievers pull recent claims and unresolved loops so routing and summaries reflect current project state.',
  'deepgram\u2192transcribe|Nova-2 ASR': 'The transcribe step sends audio to Deepgram Nova-2 and receives the transcript (and timing metadata). This transcript becomes the primary text input for routing and extraction.',
  'embed-facts\u2192world-model|embeddings': 'Stores embeddings for project facts in the world model, enabling semantic retrieval and time-aware context.',
  'generate-summary\u2192db-core|human_summary+scheduler': 'Persists the call summary and materializes scheduler items/tasks for follow-up workflows.',
  'generate-summary\u2192db-review|event_audit': 'Logs summary generation outcomes to event_audit for ops visibility and replay/debug.',
  'gh-actions\u2192db-core|deploy EFs': 'CI deploys edge functions and related config to Supabase so production matches what\'s in GitHub.',
  'github\u2192gh-actions|push trigger': 'A GitHub push triggers CI/CD workflows that test and deploy edge functions and schema changes.',
  'gmail-api\u2192gmail-ctx|OAuth search': 'gmail-ctx uses OAuth to search and summarize relevant Gmail threads, then returns/caches that context for the pipeline.',
  'gmail-ctx\u2192db-context|gmail_context_cache': 'Caches email context summaries with a TTL so repeated context-assembly runs don\'t hammer Gmail.',
  'gt-apply\u2192db-review|override_log': 'Writes an audit entry for each GT change so evaluation and rollback analysis remain possible.',
  'gt-apply\u2192db-spans|via apply_gt_correction': 'Applies ground-truth corrections via RPC to lock the correct attribution permanently at the span level.',
  'gt-apply\u2192rpc-gt|call': 'gt-apply calls apply_gt_correction for each labeled segment so corrections are applied under database-enforced invariants.',
  'guardrails\u2192ai-router|8 guardrails': 'Guardrails provide hard constraints and sanity checks that ai-router must satisfy before assigning a project.',
  'journal-consolidate\u2192db-journal|relationships+conflicts': 'Writes consolidated relationships and conflict records so contradictory claims can be triaged and resolved.',
  'journal-embed\u2192db-journal|claim embeddings': 'Stores vector embeddings for journal claims to support semantic search and better dedup/conflict detection.',
  'journal-extract\u2192db-journal|claims+runs+loops': 'Uses deduping RPCs to insert extracted claims, journal run metadata, and any open loops linked to the span/project.',
  'journal-extract\u2192journal-consolidate|if claims>0': 'If extraction produced claims, journal-consolidate runs to merge them into project state and detect conflicts.',
  'journal-extract\u2192journal-consolidate|if_claims>0': 'If extraction produced claims, journal-consolidate runs to merge them into project state and detect conflicts.',
  'journal-extract\u2192rpc-journal|dedup insert': 'journal-extract calls insert_journal_claims_dedup so retries don\'t create duplicate claims and reruns are safe.',
  'loop-closure\u2192db-journal|close loops': 'Marks open loops as closed and appends closure evidence so the morning digest stops surfacing resolved items.',
  'migrations\u2192db-core|schema': 'Migrations evolve schema and invariants; they must be applied before deploying code that depends on new tables/columns.',
  'openai\u2192embed-facts|embed-3-sm': 'embed-facts converts project facts into vector embeddings for similarity search. This powers retrieval in context-assembly and guardrails.',
  'openai\u2192journal-embed|embed-3-sm': 'journal-embed vectorizes journal claims so later queries can find relevant prior statements and support dedup/conflict detection.',
  'openai\u2192segment-llm|GPT-4o-mini': 'segment-llm asks GPT\u20114o\u2011mini to propose topic boundaries so multi-topic calls can be split into independent spans.',
  'openphone\u2192zapier|call events': 'OpenPhone sends call and voicemail events (caller/callee, timestamps, recording link, metadata) into Zapier so the pipeline starts automatically.',
  'pc-phone\u2192process-call|phone modules': 'Phone normalization modules map raw from/to fields into consistent owner vs other-party roles for contact resolution and attribution.',
  'process-call\u2192db-core|upsert interactions+calls_raw': 'process-call upserts the interactions row and stores the normalized call in calls_raw, including contact resolution and candidate projects for downstream steps.',
  'process-call\u2192db-pipeline-aux|idempotency+event_audit': 'Writes idempotency keys and event_audit telemetry so duplicate webhooks are skipped and every run is traceable.',
  'process-call\u2192rpc-contact|4 RPCs': 'process-call uses a small set of contact/alias RPCs for phone lookup, transcript scanning, and candidate expansion\u2014keeping matching logic centralized and auditable.',
  'process-call\u2192segment-call|fire & forget': 'After storing the call, process-call kicks off segmentation asynchronously so the webhook can return quickly; downstream failures are tracked separately.',
  'process-call\u2192segment-call|fire_forget': 'After storing the call, process-call kicks off segmentation asynchronously so the webhook can return quickly; downstream failures are tracked separately.',
  'process-call\u2192storage|audio ref': 'Stores a reference to the call recording location (usually a URL) so transcription can fetch audio later; the pipeline depends on this link staying valid.',
  'review-resolve\u2192db-review|resolve+override_log': 'Records the human decision and audit trail (override_log) so corrections are explainable and durable.',
  'review-resolve\u2192db-spans|via resolve_review_item': 'When a human resolves a review item, review-resolve calls an atomic RPC that updates span_attributions (and related span records) in one transaction.',
  'review-resolve\u2192rpc-resolve|call': 'review-resolve invokes resolve_review_item to apply a human decision safely and consistently.',
  'rpc-gt\u2192db-spans|atomic update': 'apply_gt_correction performs an atomic attribution update and enforces monotonic locks so later pipeline runs can\'t override GT.',
  'rpc-resolve\u2192db-review|atomic update': 'The same transaction updates review_queue status and writes override logs so the audit trail always matches the attribution.',
  'rpc-resolve\u2192db-spans|atomic update': 'The resolve_review_item RPC updates span attribution atomically\u2014either everything commits or nothing does.',
  'sb-auth\u2192review-resolve|JWT verify': 'review-resolve verifies the user\'s Supabase JWT so only authorized reviewers can apply corrections.',
  'segment-call\u2192context-assembly|per span (blocking)': 'For each span, segment-call blocks on context-assembly to build the context_package needed for accurate routing.',
  'segment-call\u2192context-assembly|per_span': 'For each span, segment-call blocks on context-assembly to build the context_package needed for accurate routing.',
  'segment-call\u2192db-spans|upsert spans': 'Writes conversation_spans (char ranges + segment text) for the interaction. Spans are the stable unit-of-work for routing and extraction.',
  'segment-call\u2192generate-summary|after all spans': 'After all spans are processed, segment-call triggers generate-summary once to produce the call-level summary and task list (fire-and-forget).',
  'segment-call\u2192generate-summary|after_spans': 'After all spans are processed, segment-call triggers generate-summary once to produce the call-level summary and task list (fire-and-forget).',
  'segment-call\u2192journal-extract|if assign, f&f': 'When a span is assigned to a project, segment-call fires journal-extract in the background to extract claims and follow-ups; failures don\'t block attribution.',
  'segment-call\u2192journal-extract|if_assigned': 'When a span is assigned to a project, segment-call fires journal-extract in the background to extract claims and follow-ups; failures don\'t block attribution.',
  'segment-call\u2192segment-llm|get boundaries': 'segment-call requests span boundaries from segment-llm so the transcript can be split into topic-focused chunks within size limits.',
  'segment-call\u2192segment-llm|get_boundaries': 'segment-call requests span boundaries from segment-llm so the transcript can be split into topic-focused chunks within size limits.',
  'segment-call\u2192striking-detect|per span f&f': 'Each span triggers striking-detect asynchronously to compute urgency/risk signals without blocking the routing path.',
  'segment-call\u2192striking-detect|per_span': 'Each span triggers striking-detect asynchronously to compute urgency/risk signals without blocking the routing path.',
  'shadow-replay\u2192process-call|shadow replay': 'Shadow replay re-ingests historical calls through process-call in an isolated mode to test changes without impacting production truth.',
  'shared\u2192ai-router|auth+junk': 'Shared code applies the same auth checks and low-signal/junk-call filtering so routing doesn\'t waste compute or create review pressure.',
  'shared\u2192context-assembly|auth': 'Shared auth wrappers ensure only internal callers can assemble context packages.',
  'shared\u2192generate-summary|auth+llm_json': 'Shared auth + schema helpers enforce consistent summary/task formats.',
  'shared\u2192gt-apply|auth': 'Shared auth ensures only privileged operators can apply ground-truth corrections.',
  'shared\u2192journal-extract|auth+llm_json': 'Shared auth + JSON schema helpers make claim extraction safer and easier to validate.',
  'shared\u2192process-call|auth+id_guard': 'Shared utilities enforce authentication, input normalization, and idempotency rules so process-call can safely accept retried webhooks.',
  'shared\u2192segment-llm|llm_json': 'Shared helpers standardize prompt/response JSON handling and schema validation so segmentation outputs stay structured and reliable.',
  'smoke-test\u2192zapier-ingest|test all 13': 'Smoke tests simulate inbound webhooks across pipeline endpoints to confirm auth and basic health after deploy.',
  'striking-detect\u2192db-pipeline-aux|striking_signals': 'Stores per-span striking/urgency signals so dashboards and alerts can prioritize what needs attention.',
  'tests\u2192guardrails|unit tests': 'Unit/regression tests validate guardrail behavior so routing constraints don\'t drift as prompts and data evolve.',
  'transcribe\u2192db-pipeline-aux|transcripts_comparison': 'Persists transcript variants and quality metadata so you can compare ASR engines and track regressions over time.',
  'trigger-lock\u2192db-spans|enforces on UPDATE': 'A database trigger enforces monotonic attribution locks on updates, preventing any code path from downgrading a human correction.',
  'world-model\u2192ctx-retrievers|fact embeddings': 'Retrievers query fact embeddings to pull the most relevant project facts for the current span.',
  'world-model\u2192guardrails|project facts': 'Guardrails reads authoritative project facts to block impossible assignments and validate extracted outputs.',
  'zapier-ingest\u2192process-call|forward (blocking)': 'Ingestion forwards the call payload to process-call and waits for a response. This is the synchronous entry that validates, deduplicates, and persists the call.',
  'zapier-ingest\u2192process-call|forward_blocking': 'Ingestion forwards the call payload to process-call and waits for a response. This is the synchronous entry that validates, deduplicates, and persists the call.',
  'zapier\u2192zapier-ingest|webhook POST': 'Zapier POSTs the normalized event payload into the ingestion endpoint, including call IDs and recording URL, so it can be validated and stored.'
};

export const MAP_PARITY_ALIAS_POLICY = {
  'edge:redline-thread': 'redline-thread',
  'edge:review-resolve': 'review-resolve',
  'edge:zapier-sms-ingest': 'zapier-sms-ingest',
  'table:public.openphone_threads': 'sms-openphone-sync',
  'view:public.v_calls_raw_zapier_lineage': 'zapier-ingest',
  'table:public.sms_messages': 'db-core',
  'table:public.cost_code_taxonomy': 'cost-code-taxonomy',
  'matview:public.vendor_cost_code_summary': 'vendor-cost-code-summary',
  'fn:public.check_postable_cost_code()': 'claim-guard'
};

export const PRESETS = [
  { id: 'full',       label: 'Full System',             layers: ['external','pipeline','module','data','devops'], conns: Object.keys(CONN_TYPES) },
  { id: 'pipeline',   label: 'Call Pipeline Chain',      layers: ['external','pipeline'],                          conns: ['data-flow','fire-forget','tool-call'] },
  { id: 'chain',      label: 'Main Chain Only (Blocking)', layers: ['pipeline'],                                   conns: ['data-flow'] },
  { id: 'attrib',     label: 'Attribution Deep Dive',    layers: ['pipeline','module','data'],                     conns: ['data-flow','rpc','dependency'] },
  { id: 'journal',    label: 'Journal System',           layers: ['external','pipeline','data'],                   conns: ['data-flow','fire-forget','tool-call','rpc'] },
  { id: 'llm',        label: 'LLM Engines Only',         layers: ['external','pipeline'],                          conns: ['tool-call'] },
  { id: 'modules',    label: 'Sub-modules & RPCs',       layers: ['pipeline','module'],                            conns: ['dependency','rpc'] },
  { id: 'data',       label: 'Data Flow Only',           layers: ['pipeline','data'],                              conns: ['data-flow','rpc'] },
  { id: 'fire',       label: 'Fire & Forget Paths',      layers: ['pipeline'],                                     conns: ['fire-forget'] },
  { id: 'devops',     label: 'DevOps + CI/CD',           layers: ['external','data','devops'],                     conns: ['event','dependency','data-flow'] },
];

export const MOBILE_STAGES = [
  {
    num: 1,
    label: 'Call Ingested',
    purpose: 'Phone call recorded via OpenPhone, payload validated and normalized, candidate projects collected.',
    why: 'This is the entry point \u2014 nothing flows without clean call data landing in the system.',
    capabilities: ['call-ingestion'],
    nodes: ['openphone', 'zapier', 'zapier-ingest', 'process-call', 'pc-phone']
  },
  {
    num: 2,
    label: 'Transcript Split',
    purpose: 'Multi-topic call segmented into single-topic spans by GPT-4o-mini.',
    why: 'One call often covers multiple projects \u2014 splitting gets each piece to the right place.',
    capabilities: ['transcription', 'segmentation'],
    nodes: ['segment-call', 'segment-llm', 'shared']
  },
  {
    num: 3,
    label: 'Context Built',
    purpose: '12-source evidence package assembled per span: CRM, history, aliases, email, geo, journal.',
    why: 'The AI needs the full picture \u2014 garbage context means garbage routing.',
    capabilities: ['context-assembly'],
    nodes: ['context-assembly', 'gmail-ctx', 'ctx-retrievers']
  },
  {
    num: 4,
    label: 'Project Attributed',
    purpose: 'AI assigns each span to a project; low-confidence spans go to human review.',
    why: 'This is the core business decision \u2014 every downstream metric depends on correct attribution.',
    capabilities: ['attribution'],
    nodes: ['ai-router', 'guardrails', 'review-resolve', 'review-triage']
  },
  {
    num: 5,
    label: 'Intelligence Captured',
    purpose: 'Summary, knowledge claims, follow-ups, and signals extracted per call.',
    why: 'Turns raw conversations into structured business intelligence.',
    capabilities: ['summarization', 'journal', 'consolidation'],
    nodes: ['generate-summary', 'journal-extract', 'journal-consolidate', 'striking-detect', 'chain-detect', 'loop-closure']
  },
  {
    num: 6,
    label: 'Daily Report',
    purpose: 'Morning digest with signals, queue pressure, and health metrics.',
    why: 'One glance tells you if the pipeline is healthy and what needs attention today.',
    capabilities: ['summarization'],
    nodes: ['morning-digest']
  }
];

export const FLOW_PARITY_NODE_ALLOWLIST = [
  'openphone',
  'sms-openphone-sync',
  'zapier',
  'zapier-ingest',
  'zapier-sms-ingest',
  'process-call',
  'claim-guard',
  'cost-code-taxonomy',
  'vendor-cost-code-summary',
  'db-core',
  'table:public.openphone_threads',
  'view:public.v_calls_raw_zapier_lineage',
  'table:public.sms_messages',
  'table:public.cost_code_taxonomy',
  'matview:public.vendor_cost_code_summary',
  'fn:public.check_postable_cost_code()'
];

export function isFlowParityNode(nodeId) {
  return FLOW_PARITY_NODE_ALLOWLIST.indexOf(nodeId) >= 0;
}

export const VIEW_MODES = {
  flow: {
    preset: 'chain',
    layers: ['pipeline', 'data'],
    conns: ['data-flow'],
    hideNodes: [
      'deepgram', 'openai', 'anthropic', 'gmail-api', 'github', 'sb-auth',
      'transcribe', 'admin-reseed', 'shadow-replay', 'gt-apply',
      'alias-scout', 'alias-review', 'alias-hygiene', 'embed-facts', 'journal-embed',
      'db-spans', 'db-review',
      'db-context', 'db-alias', 'world-model', 'storage',
      'rpc-resolve', 'rpc-gt', 'rpc-journal', 'rpc-contact', 'trigger-lock',
      'gh-actions', 'tests', 'smoke-test', 'cc-scripts', 'migrations'
    ],
    showControls: false,
    showPrompt: false,
    showComments: false
  },
  system: {
    preset: 'full',
    layers: Object.keys(LAYERS),
    conns: Object.keys(CONN_TYPES),
    hideNodes: [],
    showControls: true,
    showPrompt: true,
    showComments: true
  },
  plain: {
    preset: 'full',
    layers: Object.keys(LAYERS),
    conns: Object.keys(CONN_TYPES),
    hideNodes: [],
    showControls: true,
    showPrompt: true,
    showComments: true
  }
};

export const FRIENDLY_COPY = {
  'openphone':      { label: 'Phone system',            subtitle: 'Where calls start' },
  'zapier':         { label: 'Automation bridge',       subtitle: 'Forwards call events' },
  'deepgram':       { label: 'Speech-to-text',          subtitle: 'Makes transcripts' },
  'openai':         { label: 'OpenAI tools',            subtitle: 'Splits calls + embeddings' },
  'anthropic':      { label: 'Claude (Anthropic)',      subtitle: 'Decisions + summaries' },
  'gmail-api':      { label: 'Email lookup',            subtitle: 'Recent email context' },
  'github':         { label: 'Code repo + CI',          subtitle: 'Builds and deploys' },
  'sb-auth':        { label: 'User sign-in',            subtitle: 'JWT auth for the UI' },

  'zapier-ingest':  { label: 'Webhook intake',          subtitle: 'Receives Zapier payload' },
  'process-call':   { label: 'Call intake',             subtitle: 'Validates + queues work' },
  'transcribe':     { label: 'Transcribe call',         subtitle: 'Audio \u2192 text' },
  'pc-phone':       { label: 'Phone helpers',           subtitle: 'Normalizes phone details' },

  'segment-call':   { label: 'Split into topics',       subtitle: 'Turns a call into spans' },
  'segment-llm':    { label: 'Boundary finder',         subtitle: 'AI finds topic changes' },
  'shared':         { label: 'Shared utilities',        subtitle: 'Common helpers + auth' },

  'context-assembly': { label: 'Build evidence packet', subtitle: 'Collects context per span' },
  'gmail-ctx':      { label: 'Email context fetch',     subtitle: 'Pulls recent threads' },
  'ctx-retrievers': { label: 'Context retrievers',      subtitle: 'Small fetchers (CRM, history, \u2026)' },

  'ai-router':      { label: 'Project picker',          subtitle: 'AI assigns a span to a project' },
  'guardrails':     { label: 'Safety checks',           subtitle: 'Rules that prevent bad picks' },
  'review-resolve': { label: 'Apply human fix',         subtitle: 'Writes review decisions' },
  'review-triage':  { label: 'Review queue API',        subtitle: 'Browse/manage pending items' },

  'generate-summary':   { label: 'Create call summary',     subtitle: 'Writes digest + follow-ups' },
  'striking-detect':    { label: 'Find notable signals',    subtitle: 'Flags important moments' },
  'journal-extract':    { label: 'Extract knowledge',       subtitle: 'Turns text into claims' },
  'journal-consolidate':{ label: 'Update knowledge base',   subtitle: 'Merges new claims safely' },
  'chain-detect':       { label: 'Detect call chains',      subtitle: 'Links related calls' },
  'loop-closure':       { label: 'Close open loops',        subtitle: 'Resolves outstanding items' },

  'admin-reseed':   { label: 'Reseed / re-run',         subtitle: 'Fix bad segmentation/routing' },
  'shadow-replay':  { label: 'Shadow replay',           subtitle: 'Test changes on real calls' },
  'gt-apply':       { label: 'Apply ground truth',      subtitle: 'Batch human corrections' },
  'morning-digest': { label: 'Daily status report',     subtitle: 'Health + signals at a glance' },

  'alias-scout':    { label: 'Alias finder',            subtitle: 'Suggests new project names' },
  'alias-review':   { label: 'Alias approval',          subtitle: 'Approve/reject suggestions' },
  'alias-hygiene':  { label: 'Alias cleanup',           subtitle: 'Dedup + blocklist' },
  'embed-facts':    { label: 'Embed project facts',     subtitle: 'Vectorize facts for search' },
  'journal-embed':  { label: 'Embed journal claims',    subtitle: 'Vectorize claims for search' },

  'db-core':        { label: 'Core records',            subtitle: 'Calls, contacts, projects' },
  'db-spans':       { label: 'Spans + routing',         subtitle: 'Per-topic pieces + attribution' },
  'db-review':      { label: 'Review & audit',          subtitle: 'Queue + overrides + logs' },
  'db-pipeline-aux':{ label: 'Pipeline telemetry',      subtitle: 'Idempotency + events' },
  'db-journal':     { label: 'Journal storage',         subtitle: 'Claims + relationships' },
  'db-context':     { label: 'Context caches',          subtitle: 'Email + derived context' },
  'db-alias':       { label: 'Project aliases',         subtitle: 'Known names + suggestions' },
  'world-model':    { label: 'World model',             subtitle: 'Facts + embeddings store' },
  'storage':        { label: 'File storage',            subtitle: 'Audio + artifacts' },
  'table:public.openphone_threads': { label: 'SMS threads', subtitle: 'OpenPhone thread state' },
  'table:public.sms_messages': { label: 'SMS messages', subtitle: 'Inbound/outbound message rows' },
  'view:public.v_calls_raw_zapier_lineage': { label: 'Zapier lineage view', subtitle: 'Call/SMS ingest lineage' },
  'table:public.cost_code_taxonomy': { label: 'Cost code taxonomy', subtitle: 'Canonical finance cost codes' },
  'matview:public.vendor_cost_code_summary': { label: 'Vendor cost summary', subtitle: 'Cost-code rollup by vendor' },
  'fn:public.check_postable_cost_code()': { label: 'Cost code guard', subtitle: 'Postability validation function' },

  'rpc-resolve':    { label: 'Review resolver (DB)',    subtitle: 'Atomic review write' },
  'rpc-gt':         { label: 'Ground-truth RPCs',       subtitle: 'Safe batch updates' },
  'rpc-journal':    { label: 'Journal RPCs',            subtitle: 'Insert/dedup claims' },
  'rpc-contact':    { label: 'Contact RPCs',            subtitle: 'Identity helpers' },
  'trigger-lock':   { label: 'Lock enforcement',        subtitle: 'Prevents downgrades' },

  'gh-actions':     { label: 'CI workflows',            subtitle: 'Automated builds/deploys' },
  'tests':          { label: 'Test suite',              subtitle: 'Checks pipeline behavior' },
  'smoke-test':     { label: 'Smoke test script',       subtitle: 'Quick endpoint checks' },
  'claim-guard':    { label: 'Write-safety gate',       subtitle: 'Prevents script collisions' },
  'cc-scripts':     { label: 'Ops scripts',             subtitle: 'Backfills, replays, audits' },
  'migrations':     { label: 'Schema migrations',       subtitle: 'Database change history' }
};

export const HEALTH_PRIORITY = { stale: 3, aging: 2, fresh: 1, unknown: 0 };
