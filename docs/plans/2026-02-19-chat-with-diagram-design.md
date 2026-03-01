# Chat-with-Diagram Design

**Date:** 2026-02-19
**Status:** Approved (brainstorming complete)

## Problem

The Camber map diagram (`index.html`) is a static visualization. Users (Chad and browser agents like DEV/DATA/STRAT) can browse and add localStorage comments, but can't:
- Ask natural language questions about the architecture
- Get visual answers (highlighted nodes/paths)
- Share annotations across sessions or between agents

## Decisions (from brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Chat Panel Overlay (togglable drawer) | Minimal UX disruption, extends existing layout |
| LLM provider | OpenAI GPT-4o-mini | Cheap, fast, browser CORS support, 128k context |
| LLM location | Client-side API call | Self-contained single HTML file, no backend needed |
| API key | User provides via settings panel | Stored in localStorage, never sent elsewhere |
| Annotation persistence | Supabase table | Shared across users/agents, fits existing infra |
| Chat persistence | Ephemeral (session only) | Q&A is exploratory, not archival |
| Primary users | Chad + browser agents (DEV/DATA/STRAT) | Both access via GitHub Pages URL |

## Architecture

```
index.html (single file, GitHub Pages)
  |
  |-- Chat Panel (right drawer, togglable)
  |     |-- Input box + Send button
  |     |-- Message bubbles (user/assistant)
  |     |-- Streaming responses via fetch → ReadableStream
  |     |-- Node highlighting: parse node refs → pulse SVG elements
  |     |
  |     '-- OpenAI API (GPT-4o-mini, client-side fetch)
  |           System prompt: condensed map.json graph context
  |
  |-- Annotations (Supabase-backed)
  |     |-- map_annotations table (node_id, author, content, thread_id)
  |     |-- Supabase JS via CDN (anon key embedded)
  |     |-- Real-time subscription for live updates
  |     '-- Fallback: localStorage if Supabase unreachable
  |
  '-- Settings Panel
        |-- OpenAI API key (localStorage)
        |-- Author name (localStorage)
        '-- Supabase connection (hardcoded anon key)
```

## Chat Panel UX

- **Toggle:** Button in toolbar area (or bottom-right FAB). Click to slide panel in from right.
- **System prompt:** Includes condensed graph data — node IDs, names, layers, edge relationships. NOT full descriptions (too large). The hardcoded `nodes` array descriptions are available for follow-up if the user asks about a specific node.
- **Node highlighting:** When the assistant's response contains node names or IDs (e.g., "calls_raw", "ai-router", "table:public.projects"), find matching SVG elements and add a pulsing CSS animation. Clear on next question.
- **Conversation:** Maintained in-session. Not persisted. Each page reload starts fresh.
- **Streaming:** Responses stream token-by-token for responsiveness.

## Annotations UX

- **Replaces localStorage comments** with Supabase `map_annotations` table.
- **Shared:** All users see all annotations. Author name displayed.
- **Threaded:** Optional `thread_id` for replies to existing annotations.
- **Resolvable:** `is_resolved` flag to mark stale/completed annotations.
- **Real-time:** Supabase realtime subscription shows new annotations from other users live.
- **Fallback:** If Supabase JS fails to load or connect, gracefully falls back to localStorage.

## Data: map_annotations table

```sql
CREATE TABLE map_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  thread_id UUID REFERENCES map_annotations(id),
  is_resolved BOOLEAN NOT NULL DEFAULT false
);
```

RLS: Open read (SELECT) and write (INSERT) for anon. The page uses the Supabase anon key.

## System Prompt Strategy

The `map.json` graph has ~350 nodes. GPT-4o-mini has 128k context. Strategy:

1. **Always include:** Node list (id, name, kind, group) + edge list (source, target, type) — compact JSON, ~10-20k tokens
2. **Include on demand:** When user asks about a specific node, inject its full description from the hardcoded `nodes` array
3. **Grounding instruction:** "Answer based only on the provided graph. If a node or relationship isn't in the data, say so."

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add chat panel, settings modal, Supabase client init, OpenAI streaming, node highlighting, replace localStorage with Supabase |
| `docs/migrations/001_map_annotations.sql` | Migration for annotations table |
| `docs/plans/2026-02-19-chat-with-diagram-design.md` | This design doc |
| `docs/implementation-notes.md` | Research notes on browser API patterns |

## Open Questions

- Should the chat panel also be able to trigger diagram actions (filter layers, zoom to node)?
- Should annotations support markdown rendering?
- Rate limiting: should we throttle OpenAI calls client-side to prevent accidental cost spikes?
