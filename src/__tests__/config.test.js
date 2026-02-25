import { describe, it, expect } from 'vitest';
import {
  LAYERS, CONN_TYPES, ROW_LABELS, PRESETS, MOBILE_STAGES,
  VIEW_MODES, FRIENDLY_COPY, CONNECTION_LABEL_DESC_MAP,
  MAP_PARITY_ALIAS_POLICY, isFlowParityNode,
} from '../config.js';

describe('config constants', () => {
  it('LAYERS has 5 entries with required fields', () => {
    const keys = Object.keys(LAYERS);
    expect(keys.length).toBe(5);
    for (const k of keys) {
      expect(LAYERS[k]).toHaveProperty('label');
      expect(LAYERS[k]).toHaveProperty('color');
      expect(LAYERS[k]).toHaveProperty('dot');
      expect(LAYERS[k]).toHaveProperty('stroke');
    }
  });

  it('CONN_TYPES has 6 entries with required fields', () => {
    const keys = Object.keys(CONN_TYPES);
    expect(keys.length).toBe(6);
    for (const k of keys) {
      expect(CONN_TYPES[k]).toHaveProperty('label');
      expect(CONN_TYPES[k]).toHaveProperty('color');
      expect(CONN_TYPES[k]).toHaveProperty('marker');
    }
  });

  it('ROW_LABELS is a non-empty array of {text, x, y}', () => {
    expect(Array.isArray(ROW_LABELS)).toBe(true);
    expect(ROW_LABELS.length).toBeGreaterThan(0);
    for (const r of ROW_LABELS) {
      expect(typeof r.text).toBe('string');
      expect(typeof r.x).toBe('number');
      expect(typeof r.y).toBe('number');
    }
  });

  it('PRESETS has at least 5 entries', () => {
    expect(Object.keys(PRESETS).length).toBeGreaterThanOrEqual(5);
  });

  it('MOBILE_STAGES is a non-empty array with stage numbers', () => {
    expect(Array.isArray(MOBILE_STAGES)).toBe(true);
    expect(MOBILE_STAGES.length).toBeGreaterThan(0);
    for (const s of MOBILE_STAGES) {
      expect(typeof s.num).toBe('number');
      expect(typeof s.label).toBe('string');
    }
  });

  it('VIEW_MODES has flow, plain, system', () => {
    expect(VIEW_MODES).toHaveProperty('flow');
    expect(VIEW_MODES).toHaveProperty('plain');
    expect(VIEW_MODES).toHaveProperty('system');
  });

  it('CONNECTION_LABEL_DESC_MAP has entries', () => {
    expect(Object.keys(CONNECTION_LABEL_DESC_MAP).length).toBeGreaterThan(50);
  });

  it('MAP_PARITY_ALIAS_POLICY maps edge IDs to diagram node IDs', () => {
    const keys = Object.keys(MAP_PARITY_ALIAS_POLICY);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(typeof MAP_PARITY_ALIAS_POLICY[k]).toBe('string');
    }
  });

  it('isFlowParityNode returns boolean', () => {
    expect(typeof isFlowParityNode('zapier-ingest')).toBe('boolean');
    expect(typeof isFlowParityNode('nonexistent-node')).toBe('boolean');
  });

  it('FRIENDLY_COPY has {label, subtitle} objects', () => {
    const keys = Object.keys(FRIENDLY_COPY);
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) {
      expect(typeof FRIENDLY_COPY[k].label).toBe('string');
      expect(typeof FRIENDLY_COPY[k].subtitle).toBe('string');
    }
  });
});
