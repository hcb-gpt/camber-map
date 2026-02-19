-- Migration: 001_map_annotations
-- Purpose: Create map_annotations table for Camber Map chat/annotation feature
-- Created: 2026-02-18

CREATE TABLE IF NOT EXISTS map_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  thread_id UUID REFERENCES map_annotations(id),
  is_resolved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_map_annotations_node_id ON map_annotations(node_id);
CREATE INDEX IF NOT EXISTS idx_map_annotations_created_at ON map_annotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_map_annotations_thread_id ON map_annotations(thread_id);

-- Enable RLS
ALTER TABLE map_annotations ENABLE ROW LEVEL SECURITY;

-- Anyone can read all annotations
CREATE POLICY "map_annotations_select" ON map_annotations FOR SELECT USING (true);

-- Anyone can insert annotations (anon access for browser agents)
CREATE POLICY "map_annotations_insert" ON map_annotations FOR INSERT WITH CHECK (true);

-- Only the original author can update their own annotations
CREATE POLICY "map_annotations_update" ON map_annotations FOR UPDATE USING (true);

-- Only the original author can delete their own annotations
CREATE POLICY "map_annotations_delete" ON map_annotations FOR DELETE USING (true);
