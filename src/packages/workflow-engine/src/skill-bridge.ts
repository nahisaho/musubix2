// DES-AGT-003: Skill-Workflow Bridge
// REQ-AGT-003 traceability

// ── Types ──

export interface SkillPhaseMapping {
  skillName: string;
  phases: string[];
  autoTrigger: boolean;
}

// ── SkillWorkflowBridge ──

export class SkillWorkflowBridge {
  private mappings: Map<string, SkillPhaseMapping> = new Map();

  registerMapping(mapping: SkillPhaseMapping): void {
    this.mappings.set(mapping.skillName, mapping);
  }

  getSkillsForPhase(phase: string): SkillPhaseMapping[] {
    return Array.from(this.mappings.values()).filter((m) => m.phases.includes(phase));
  }

  getMappings(): SkillPhaseMapping[] {
    return Array.from(this.mappings.values());
  }

  shouldAutoTrigger(skillName: string, currentPhase: string): boolean {
    const mapping = this.mappings.get(skillName);
    if (!mapping) {
      return false;
    }
    return mapping.autoTrigger && mapping.phases.includes(currentPhase);
  }
}

// ── Factory ──

export function createSkillWorkflowBridge(): SkillWorkflowBridge {
  return new SkillWorkflowBridge();
}
