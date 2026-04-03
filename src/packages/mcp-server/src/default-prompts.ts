// Default MCP Prompts — SDD-related prompt templates

import type { MCPServer } from './index.js';
import type { MCPPrompt, MCPPromptMessage, PromptHandler } from './prompts.js';

// ---------------------------------------------------------------------------
// Prompt definitions
// ---------------------------------------------------------------------------

interface PromptEntry {
  prompt: MCPPrompt;
  handler: PromptHandler;
}

function textMsg(role: 'user' | 'assistant', text: string): MCPPromptMessage {
  return { role, content: { type: 'text', text } };
}

function promptEntry(
  name: string,
  description: string,
  args: MCPPrompt['arguments'],
  handler: PromptHandler,
): PromptEntry {
  return { prompt: { name, description, arguments: args }, handler };
}

// ---------------------------------------------------------------------------
// SDD Prompts
// ---------------------------------------------------------------------------

function sddPrompts(): PromptEntry[] {
  return [
    promptEntry(
      'sdd-requirements-template',
      'Generate an EARS requirement template for a given feature',
      [
        { name: 'feature', description: 'Feature name', required: true },
        { name: 'pattern', description: 'EARS pattern: ubiquitous | event-driven | unwanted | state-driven | optional', required: false },
      ],
      (args) => {
        const feature = args['feature'] ?? 'Feature';
        const pattern = args['pattern'] ?? 'event-driven';

        const templates: Record<string, string> = {
          'ubiquitous': `The system shall <action> for ${feature}.`,
          'event-driven': `When <trigger>, the system shall <response> for ${feature}.`,
          'unwanted': `If <condition>, then the system shall <response> for ${feature}.`,
          'state-driven': `While <state>, the system shall <response> for ${feature}.`,
          'optional': `Where <feature is supported>, the system shall <response> for ${feature}.`,
        };

        const template = templates[pattern] ?? templates['event-driven'];

        return [
          textMsg('user', `Generate an EARS requirement for: ${feature} (pattern: ${pattern})`),
          textMsg('assistant', [
            `# EARS Requirement Template: ${feature}`,
            '',
            `**Pattern**: ${pattern}`,
            `**Template**: ${template}`,
            '',
            '## Instructions',
            '1. Replace placeholders in angle brackets with specific details',
            '2. Ensure the requirement is testable and unambiguous',
            '3. Add acceptance criteria below the requirement',
            '',
            '## EARS Patterns Reference',
            '- **Ubiquitous**: The system shall <action>.',
            '- **Event-driven**: When <trigger>, the system shall <response>.',
            '- **Unwanted**: If <condition>, then the system shall <response>.',
            '- **State-driven**: While <state>, the system shall <response>.',
            '- **Optional**: Where <feature>, the system shall <response>.',
          ].join('\n')),
        ];
      },
    ),

    promptEntry(
      'sdd-design-template',
      'Generate an SDD design document template from a component name',
      [
        { name: 'component', description: 'Component name', required: true },
        { name: 'type', description: 'Component type: module | service | library', required: false },
      ],
      (args) => {
        const component = args['component'] ?? 'Component';
        const type = args['type'] ?? 'module';

        return [
          textMsg('user', `Generate a design document template for: ${component} (${type})`),
          textMsg('assistant', [
            `# Design Document: ${component}`,
            '',
            `**Type**: ${type}`,
            `**DES-ID**: DES-${component.toUpperCase().replace(/\s+/g, '-')}-001`,
            '',
            '## 1. Overview',
            `Describe the purpose and scope of the ${component} ${type}.`,
            '',
            '## 2. Requirements Traceability',
            '| Requirement ID | Description | Status |',
            '|---|---|---|',
            '| REQ-XXX-001 | | Pending |',
            '',
            '## 3. Architecture',
            `Describe the architecture of the ${component}.`,
            '',
            '## 4. Interface Design',
            '```typescript',
            `export interface ${component.replace(/\s+/g, '')} {`,
            '  // Define public interface',
            '}',
            '```',
            '',
            '## 5. Data Model',
            'Describe data structures and state management.',
            '',
            '## 6. Error Handling',
            'Describe error scenarios and handling strategies.',
            '',
            '## 7. Testing Strategy',
            '- Unit tests for core logic',
            '- Integration tests for external dependencies',
            '- Property-based tests for invariants',
          ].join('\n')),
        ];
      },
    ),

    promptEntry(
      'sdd-review-checklist',
      'Generate a review checklist for an SDD phase artifact',
      [
        { name: 'phase', description: 'SDD phase: requirements | design | implementation | testing', required: true },
      ],
      (args) => {
        const phase = args['phase'] ?? 'design';

        const checklists: Record<string, string[]> = {
          'requirements': [
            '☐ Each requirement follows an EARS pattern',
            '☐ Requirements are uniquely identified (REQ-XXX-NNN)',
            '☐ No ambiguous language (avoid "should", "might", "could")',
            '☐ Each requirement is testable',
            '☐ Dependencies between requirements are documented',
            '☐ Non-functional requirements are specified',
            '☐ Acceptance criteria defined for each requirement',
          ],
          'design': [
            '☐ Design traces to all requirements',
            '☐ Design IDs follow convention (DES-XXX-NNN)',
            '☐ Interfaces are fully specified',
            '☐ Error handling strategies defined',
            '☐ Data model is documented',
            '☐ Architecture decisions recorded as ADRs',
            '☐ Testing strategy outlined',
          ],
          'implementation': [
            '☐ Code implements all design specifications',
            '☐ Functions/classes trace to design elements',
            '☐ Error handling matches design spec',
            '☐ No hardcoded secrets or credentials',
            '☐ TypeScript strict mode passes',
            '☐ Code follows project conventions',
            '☐ Documentation is up to date',
          ],
          'testing': [
            '☐ Tests cover all requirements',
            '☐ Tests trace to design elements',
            '☐ Edge cases are tested',
            '☐ Error paths are tested',
            '☐ Coverage meets threshold (≥80%)',
            '☐ Tests are deterministic',
            '☐ Test names describe expected behavior',
          ],
        };

        const items = checklists[phase] ?? checklists['design'];

        return [
          textMsg('user', `Generate a review checklist for: ${phase}`),
          textMsg('assistant', [
            `# SDD Review Checklist: ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`,
            '',
            ...items,
            '',
            '## Notes',
            '- Mark items with ☑ when verified',
            '- Add comments for any exceptions',
            `- All items must pass before transitioning from ${phase}`,
          ].join('\n')),
        ];
      },
    ),

    promptEntry(
      'sdd-task-breakdown-template',
      'Generate a task breakdown template for an SDD feature',
      [
        { name: 'feature', description: 'Feature to break down', required: true },
        { name: 'complexity', description: 'Complexity: low | medium | high', required: false },
      ],
      (args) => {
        const feature = args['feature'] ?? 'Feature';
        const complexity = args['complexity'] ?? 'medium';

        return [
          textMsg('user', `Break down tasks for: ${feature} (complexity: ${complexity})`),
          textMsg('assistant', [
            `# Task Breakdown: ${feature}`,
            '',
            `**Complexity**: ${complexity}`,
            '',
            '## Phase 1: Requirements',
            `- [ ] Define EARS requirements for ${feature}`,
            '- [ ] Review and validate requirements',
            '- [ ] Get stakeholder approval',
            '',
            '## Phase 2: Design',
            `- [ ] Create design document (DES-${feature.toUpperCase().replace(/\s+/g, '-')}-001)`,
            '- [ ] Define interfaces and data model',
            '- [ ] Record architecture decisions (ADRs)',
            '- [ ] Design review',
            '',
            '## Phase 3: Implementation',
            '- [ ] Set up module structure',
            '- [ ] Implement core logic',
            '- [ ] Implement error handling',
            '- [ ] Code review',
            '',
            '## Phase 4: Testing',
            '- [ ] Write unit tests',
            '- [ ] Write integration tests',
            '- [ ] Verify traceability matrix',
            '- [ ] Coverage verification (≥80%)',
            '',
            '## Quality Gates',
            '- [ ] Requirements → Design gate',
            '- [ ] Design → Implementation gate',
            '- [ ] Implementation → Testing gate',
            '- [ ] Final acceptance',
          ].join('\n')),
        ];
      },
    ),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDefaultPrompts(): PromptEntry[] {
  return sddPrompts();
}

export function registerDefaultPrompts(server: MCPServer): void {
  for (const entry of getDefaultPrompts()) {
    server.prompts.register(entry.prompt, entry.handler);
  }
}
