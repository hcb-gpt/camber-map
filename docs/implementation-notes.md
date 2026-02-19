# Implementation Notes: Chat-with-Diagram Feature

> Research output for task #3 — OpenAI browser streaming + Supabase JS CDN patterns.

---

## 1. OpenAI Streaming from Browser (Vanilla JS)

### CORS Status

**OpenAI's API does support CORS for direct browser requests.** There was a brief outage on Oct 15 2025 where the `Access-Control-Allow-Origin` header was accidentally dropped, but OpenAI confirmed it as a bug and rolled out a fix the same day. Direct browser `fetch()` to `https://api.openai.com/v1/chat/completions` works without a proxy.

> **Security trade-off:** Direct browser calls expose the API key in client-side code. This is acceptable for a personal/internal tool where the key is stored in localStorage and never sent to our servers. For a public-facing product, a backend proxy would be required.

### Streaming Fetch Pattern

```javascript
async function streamChat(messages, apiKey, onChunk, onDone) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      stream: true
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') {
        if (trimmed === 'data: [DONE]') onDone?.();
        continue;
      }
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch (e) {
        // skip malformed chunks
      }
    }
  }
}
```

### SSE Chunk Format

Each streamed chunk from OpenAI looks like:

```
data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1700000000,"model":"gpt-4o-mini","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}
```

- `delta.role` appears in the first chunk (value: `"assistant"`)
- `delta.content` appears in subsequent chunks with the text fragment
- The stream ends with `data: [DONE]`
- `finish_reason` is `"stop"` in the final content chunk before `[DONE]`

### Error Handling

```javascript
// Wrap the streamChat call:
try {
  await streamChat(messages, apiKey, onChunk, onDone);
} catch (err) {
  if (err.message.includes('401') || err.message.includes('Incorrect API key')) {
    showError('Invalid API key. Check Settings.');
  } else if (err.message.includes('429')) {
    showError('Rate limited. Wait a moment and try again.');
  } else if (err.message.includes('insufficient_quota')) {
    showError('API quota exceeded. Check your OpenAI billing.');
  } else {
    showError(`Error: ${err.message}`);
  }
}
```

---

## 2. GPT-4o-mini Specifics

| Property | Value |
|----------|-------|
| Model ID | `gpt-4o-mini` |
| Context window | 128K tokens |
| Max output tokens | 16K tokens |
| Input price | $0.15 / 1M tokens |
| Output price | $0.60 / 1M tokens |
| Cached input price | $0.075 / 1M tokens |
| Supports | Text input, image input, structured outputs |

### Cost Estimate for This Feature

With a ~10K token system prompt (graph data) + ~500 token user question:
- **Input cost per query:** ~$0.0016 (10.5K tokens)
- **Output cost per query (500 tokens):** ~$0.0003
- **Total per query:** ~$0.002 (1/5 of a cent)
- **1000 queries:** ~$2.00

### System Prompt Best Practices for Grounding

When grounding GPT-4o-mini in structured data (like our graph), these patterns work well:

1. **Be explicit about the data format:** "Below is a JSON representation of a database schema graph..."
2. **Instruct constraint behavior:** "Only answer questions about entities that appear in the graph. If asked about something not in the graph, say so."
3. **Provide a role:** "You are an expert on the Camber system architecture. You help users understand the database schema, relationships, and data flow."
4. **Reference format:** "When referring to database objects, use their full qualified name (e.g., public.calls_raw)."

---

## 3. Supabase JS Client via CDN

### CDN Loading

```html
<!-- Option A: UMD global (simplest) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const { createClient } = supabase;
  const db = createClient(
    'https://rjhdwidddtfetbwqolof.supabase.co',
    'YOUR_ANON_KEY'
  );
</script>

<!-- Option B: ES Module import -->
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const db = createClient(
    'https://rjhdwidddtfetbwqolof.supabase.co',
    'YOUR_ANON_KEY'
  );
</script>
```

**Recommendation:** Use Option A (UMD) since the rest of index.html uses plain `<script>` tags and we need the client available globally.

### CRUD Operations

```javascript
// SELECT — fetch all annotations for a node
const { data, error } = await db
  .from('map_annotations')
  .select('*')
  .eq('node_id', 'table:public.calls_raw')
  .order('created_at', { ascending: false });

// INSERT — save a new annotation
const { data, error } = await db
  .from('map_annotations')
  .insert({
    node_id: 'table:public.calls_raw',
    label: 'Needs index on created_at',
    color: '#ff6b6b',
    author: 'chad'
  })
  .select();  // .select() returns the inserted row

// UPDATE
const { data, error } = await db
  .from('map_annotations')
  .update({ label: 'Updated label' })
  .eq('id', annotationId)
  .select();

// DELETE
const { error } = await db
  .from('map_annotations')
  .delete()
  .eq('id', annotationId);
```

### Real-time Subscriptions

```javascript
// Subscribe to changes on map_annotations table
const channel = db
  .channel('annotations-changes')
  .on(
    'postgres_changes',
    {
      event: '*',           // INSERT, UPDATE, DELETE, or * for all
      schema: 'public',
      table: 'map_annotations'
    },
    (payload) => {
      console.log('Change:', payload.eventType, payload.new);
      // payload.eventType = 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new = the new row (for INSERT/UPDATE)
      // payload.old = the old row (for UPDATE/DELETE)
      refreshAnnotations();
    }
  )
  .subscribe();

// Cleanup when done
db.removeChannel(channel);
```

**Prerequisite:** The `map_annotations` table must be added to the `supabase_realtime` publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE map_annotations;
```

---

## 4. API Key Management (Browser Settings Panel)

### Pattern: localStorage-backed Settings

```javascript
const STORAGE_KEYS = {
  OPENAI_KEY: 'camber_openai_key',
  SUPABASE_KEY: 'camber_supabase_anon_key'
};

function loadSettings() {
  return {
    openaiKey: localStorage.getItem(STORAGE_KEYS.OPENAI_KEY) || '',
    supabaseKey: localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || ''
  };
}

function saveSettings(settings) {
  if (settings.openaiKey) {
    localStorage.setItem(STORAGE_KEYS.OPENAI_KEY, settings.openaiKey);
  }
  if (settings.supabaseKey) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, settings.supabaseKey);
  }
}

function clearSettings() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
```

### Settings Panel UI Pattern

```html
<div id="settings-panel" class="hidden">
  <h3>Settings</h3>
  <label>
    OpenAI API Key
    <input type="password" id="openai-key-input" placeholder="sk-..." />
  </label>
  <label>
    Supabase Anon Key
    <input type="password" id="supabase-key-input" placeholder="eyJ..." />
  </label>
  <button onclick="saveSettingsFromUI()">Save</button>
  <button onclick="clearSettings()">Clear Keys</button>
  <p class="hint">Keys are stored in your browser only. Never sent to any server except the API provider.</p>
</div>
```

### Security Notes

- Keys stay in `localStorage` — never transmitted to our own servers
- The OpenAI key is sent only to `api.openai.com`; the Supabase key only to `rjhdwidddtfetbwqolof.supabase.co`
- `type="password"` masks the key in the UI
- Users can clear keys at any time
- For shared/public machines, warn users to clear keys when done

---

## 5. System Prompt Design: Condensing the Graph

### Current Graph Stats

| Metric | Value |
|--------|-------|
| Total nodes | 339 |
| Total edges | 992 |
| Node kinds | table (109), view (98), fn (119), matview (1), ext (12) |
| All in group | `db` |

### Token Budget Estimates by Strategy

| Strategy | Chars | ~Tokens | Notes |
|----------|-------|---------|-------|
| Full `map.json` | 169,530 | ~42K | Too large to include raw |
| Compact (id + name + kind + group + edges) | 123,775 | ~31K | Fits in 128K but uses 24% of context |
| IDs + edges only | 95,617 | ~24K | Fits but no human-readable names |
| **Grouped names + dependency map** | **36,727** | **~9K** | **Best balance: readable + relational** |
| Grouped by kind (names only, no edges) | 8,446 | ~2K | Very compact but loses relationships |
| Comma-separated names only | 7,715 | ~2K | Most compact, no structure info |

### Recommended Strategy: Grouped Names + Dependency Map (~9K tokens)

This strategy groups node names by kind (tables, views, functions, extensions) and includes a dependency adjacency list using short names (without the `kind:schema.` prefix). It preserves:
- What objects exist (by category)
- How they relate to each other (dependencies)

It drops:
- Redundant `id`, `schema`, `title`, `group` fields (all are `public`/`db`)
- Full qualified IDs in the edge list (uses short names)

### System Prompt Template

```
You are an expert on the Camber database architecture. Below is the schema graph.

## Objects by Type

### Tables (109)
adapter_status, api_keys, belief_assumptions, belief_claims, ...

### Views (98)
v_active_calls, v_cost_summary, ...

### Functions (119)
fn_process_call, fn_update_status, ...

### Materialized Views (1)
vendor_cost_code_summary

### Extensions (12)
pgcrypto, uuid-ossp, ...

## Dependencies
adapter_status → [fn_update_adapter, v_adapter_health]
api_keys → [fn_validate_key, v_active_keys]
...

## Rules
- Only answer about objects listed above.
- Use the full name (e.g., "adapter_status table") when referencing objects.
- When describing relationships, explain the direction: "X depends on Y" or "Y is used by X".
- If the user asks about something not in the schema, say so clearly.
```

### Building the System Prompt at Runtime

```javascript
function buildSystemPrompt(mapData) {
  const byKind = {};
  for (const node of mapData.nodes) {
    (byKind[node.kind] ??= []).push(node.name);
  }

  const deps = {};
  for (const edge of mapData.edges) {
    const src = edge.from.split('.').pop() || edge.from;
    const tgt = edge.to.split('.').pop() || edge.to;
    (deps[src] ??= []).push(tgt);
  }

  let prompt = `You are an expert on the Camber database architecture.\n\n`;
  prompt += `## Objects by Type\n\n`;
  for (const [kind, names] of Object.entries(byKind)) {
    prompt += `### ${kind} (${names.length})\n`;
    prompt += names.join(', ') + '\n\n';
  }

  prompt += `## Dependencies\n`;
  for (const [src, targets] of Object.entries(deps)) {
    prompt += `${src} → ${targets.join(', ')}\n`;
  }

  prompt += `\n## Rules\n`;
  prompt += `- Only answer about objects listed above.\n`;
  prompt += `- Use full names when referencing objects.\n`;
  prompt += `- If asked about something not in the schema, say so.\n`;

  return prompt;
}
```

---

## 6. Integration Summary

### Load Order for index.html

```html
<!-- 1. Supabase client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 2. Existing app code (D3, map rendering) -->
<script src="app.js"></script>

<!-- 3. Chat module (new) -->
<script src="chat.js"></script>
```

### chat.js Module Outline

```javascript
// chat.js — Chat-with-diagram feature

// --- Settings ---
function loadSettings() { ... }
function saveSettings() { ... }

// --- Supabase init ---
function initSupabase(anonKey) {
  return supabase.createClient(
    'https://rjhdwidddtfetbwqolof.supabase.co',
    anonKey
  );
}

// --- System prompt ---
function buildSystemPrompt(mapData) { ... }

// --- Streaming chat ---
async function streamChat(messages, apiKey, onChunk, onDone) { ... }

// --- UI wiring ---
function initChatPanel() {
  const settings = loadSettings();
  if (!settings.openaiKey) showSettingsPanel();
  // Wire up send button, input field, display area
}
```

### Architectural Decisions Captured

1. **No bundler needed** — CDN for Supabase, direct fetch for OpenAI
2. **No backend proxy needed** — OpenAI supports browser CORS
3. **Keys in localStorage** — acceptable for internal tool
4. **~9K token system prompt** — grouped names + deps strategy fits well within 128K context
5. **Cost: ~$0.002/query** — negligible for internal use
