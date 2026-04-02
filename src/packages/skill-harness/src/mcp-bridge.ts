/**
 * DES-SKL-005: MCP-Skill Bridge
 * Converts skill schemas to MCP tool specifications for dynamic tool registration.
 */

import type { SkillSchema, SkillParameter } from './io-schema.js';

// --- Types ---

export interface MCPToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// --- Converter ---

export class SkillToolConverter {
  convert(skillId: string, schema: SkillSchema, description: string): MCPToolSpec {
    return {
      name: `skill_${skillId}`,
      description,
      inputSchema: this._buildInputSchema(schema.inputSchema),
    };
  }

  convertBatch(
    skills: Array<{ id: string; schema: SkillSchema; description: string }>,
  ): MCPToolSpec[] {
    return skills.map((s) => this.convert(s.id, s.schema, s.description));
  }

  private _buildInputSchema(params: SkillParameter[]): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const param of params) {
      const prop: Record<string, unknown> = {
        type: param.type,
        description: param.description,
      };

      if (param.default !== undefined) {
        prop['default'] = param.default;
      }

      if (param.validation?.enum) {
        prop['enum'] = param.validation.enum;
      }

      if (param.validation?.min !== undefined) {
        prop['minimum'] = param.validation.min;
      }

      if (param.validation?.max !== undefined) {
        prop['maximum'] = param.validation.max;
      }

      if (param.validation?.pattern) {
        prop['pattern'] = param.validation.pattern;
      }

      properties[param.name] = prop;

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }
}

// --- Bridge ---

export class SkillToMCPBridge {
  private tools: Map<string, MCPToolSpec> = new Map();
  private converter = new SkillToolConverter();

  registerSkill(skillId: string, schema: SkillSchema, description: string): MCPToolSpec {
    const spec = this.converter.convert(skillId, schema, description);
    this.tools.set(spec.name, spec);
    return spec;
  }

  unregisterSkill(skillId: string): boolean {
    const toolName = `skill_${skillId}`;
    return this.tools.delete(toolName);
  }

  getToolSpecs(): MCPToolSpec[] {
    return [...this.tools.values()];
  }

  findTool(name: string): MCPToolSpec | undefined {
    return this.tools.get(name);
  }
}
