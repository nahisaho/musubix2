import { describe, it, expect } from 'vitest';
import {
  SkillToMCPBridge,
  SkillToolConverter,
  type MCPToolSpec,
} from '../src/mcp-bridge.js';
import type { SkillSchema, SkillParameter } from '../src/io-schema.js';

function makeSchema(inputParams?: SkillParameter[]): SkillSchema {
  return {
    inputSchema: inputParams ?? [
      { name: 'filePath', type: 'string', required: true, description: 'Path to file' },
      { name: 'verbose', type: 'boolean', required: false, description: 'Verbose output', default: false },
    ],
    outputSchema: [
      { name: 'result', type: 'object', required: true, description: 'The result' },
    ],
  };
}

describe('DES-SKL-005: SkillToMCPBridge', () => {
  describe('SkillToolConverter', () => {
    it('should convert a skill schema to MCPToolSpec', () => {
      const converter = new SkillToolConverter();
      const spec = converter.convert('code-review', makeSchema(), 'Review code');
      expect(spec.name).toBe('skill_code-review');
      expect(spec.description).toBe('Review code');
      expect(spec.inputSchema).toBeDefined();
      const schema = spec.inputSchema as { properties: Record<string, unknown>; required: string[] };
      expect(schema.properties).toHaveProperty('filePath');
      expect(schema.required).toContain('filePath');
    });

    it('should include enum and default in schema', () => {
      const converter = new SkillToolConverter();
      const params: SkillParameter[] = [
        {
          name: 'severity',
          type: 'string',
          required: false,
          description: 'Level',
          default: 'warning',
          validation: { enum: ['error', 'warning', 'info'] },
        },
      ];
      const spec = converter.convert('lint', { inputSchema: params, outputSchema: [] }, 'Lint');
      const props = (spec.inputSchema as Record<string, unknown>)['properties'] as Record<string, Record<string, unknown>>;
      expect(props['severity']['default']).toBe('warning');
      expect(props['severity']['enum']).toEqual(['error', 'warning', 'info']);
    });

    it('should convert a batch of skills', () => {
      const converter = new SkillToolConverter();
      const batch = [
        { id: 'a', schema: makeSchema(), description: 'Skill A' },
        { id: 'b', schema: makeSchema(), description: 'Skill B' },
      ];
      const specs = converter.convertBatch(batch);
      expect(specs).toHaveLength(2);
      expect(specs[0].name).toBe('skill_a');
      expect(specs[1].name).toBe('skill_b');
    });
  });

  describe('SkillToMCPBridge', () => {
    it('should register and retrieve tool specs', () => {
      const bridge = new SkillToMCPBridge();
      bridge.registerSkill('review', makeSchema(), 'Review');
      const specs = bridge.getToolSpecs();
      expect(specs).toHaveLength(1);
      expect(specs[0].name).toBe('skill_review');
    });

    it('should unregister a skill', () => {
      const bridge = new SkillToMCPBridge();
      bridge.registerSkill('review', makeSchema(), 'Review');
      expect(bridge.unregisterSkill('review')).toBe(true);
      expect(bridge.getToolSpecs()).toHaveLength(0);
    });

    it('should return false for unregistering unknown skill', () => {
      const bridge = new SkillToMCPBridge();
      expect(bridge.unregisterSkill('nope')).toBe(false);
    });

    it('should find a tool by name', () => {
      const bridge = new SkillToMCPBridge();
      bridge.registerSkill('deploy', makeSchema(), 'Deploy');
      const tool = bridge.findTool('skill_deploy');
      expect(tool).toBeDefined();
      expect(tool!.description).toBe('Deploy');
    });

    it('should return undefined for unknown tool', () => {
      const bridge = new SkillToMCPBridge();
      expect(bridge.findTool('nonexistent')).toBeUndefined();
    });
  });
});
