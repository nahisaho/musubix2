// Default MCP Resources — SDD-related resource definitions

import type { MCPServer } from './index.js';
import type { MCPResource, MCPResourceContent, ResourceHandler } from './resources.js';

// ---------------------------------------------------------------------------
// Resource definitions
// ---------------------------------------------------------------------------

interface ResourceEntry {
  resource: MCPResource;
  handler: ResourceHandler;
}

function resourceEntry(
  uri: string,
  name: string,
  description: string,
  mimeType: string,
  handler: ResourceHandler,
): ResourceEntry {
  return { resource: { uri, name, description, mimeType }, handler };
}

// ---------------------------------------------------------------------------
// SDD Resources
// ---------------------------------------------------------------------------

function sddResources(): ResourceEntry[] {
  return [
    resourceEntry(
      'musubix://constitution',
      'MUSUBIX2 Constitution',
      'The constitutional articles governing the MUSUBIX2 system',
      'application/json',
      (): MCPResourceContent => ({
        uri: 'musubix://constitution',
        mimeType: 'application/json',
        text: JSON.stringify({
          title: 'MUSUBIX2 Constitution',
          articles: [
            {
              id: 'ART-001',
              title: 'Requirements First',
              text: 'All development shall begin with clearly defined EARS requirements.',
            },
            {
              id: 'ART-002',
              title: 'Design Traceability',
              text: 'Every design element shall trace to one or more requirements.',
            },
            {
              id: 'ART-003',
              title: 'Test Coverage',
              text: 'All code shall maintain a minimum test coverage of 80%.',
            },
            {
              id: 'ART-004',
              title: 'Quality Gates',
              text: 'Phase transitions require passing quality gate checks.',
            },
            {
              id: 'ART-005',
              title: 'Architecture Decisions',
              text: 'Significant architectural decisions shall be documented as ADRs.',
            },
          ],
        }, null, 2),
      }),
    ),

    resourceEntry(
      'musubix://ears-patterns',
      'EARS Pattern Reference',
      'Reference guide for EARS (Easy Approach to Requirements Syntax) patterns',
      'application/json',
      (): MCPResourceContent => ({
        uri: 'musubix://ears-patterns',
        mimeType: 'application/json',
        text: JSON.stringify({
          title: 'EARS Pattern Reference',
          patterns: [
            {
              name: 'Ubiquitous',
              template: 'The <system> shall <action>.',
              description: 'Requirements that always hold, without conditions or triggers.',
              example: 'The system shall log all API requests.',
            },
            {
              name: 'Event-Driven',
              template: 'When <trigger>, the <system> shall <response>.',
              description: 'Requirements triggered by a specific event.',
              example: 'When a user submits a form, the system shall validate all fields.',
            },
            {
              name: 'Unwanted Behavior',
              template: 'If <condition>, then the <system> shall <response>.',
              description: 'Requirements for handling unwanted situations.',
              example: 'If the database connection fails, then the system shall retry with exponential backoff.',
            },
            {
              name: 'State-Driven',
              template: 'While <state>, the <system> shall <response>.',
              description: 'Requirements that apply while the system is in a specific state.',
              example: 'While the system is in maintenance mode, the system shall reject new connections.',
            },
            {
              name: 'Optional',
              template: 'Where <feature is supported>, the <system> shall <response>.',
              description: 'Requirements for optional features.',
              example: 'Where GPU acceleration is available, the system shall use CUDA for computation.',
            },
          ],
        }, null, 2),
      }),
    ),

    resourceEntry(
      'musubix://workflow-phases',
      'SDD Workflow Phases',
      'Specification-Driven Development workflow phase definitions',
      'application/json',
      (): MCPResourceContent => ({
        uri: 'musubix://workflow-phases',
        mimeType: 'application/json',
        text: JSON.stringify({
          title: 'SDD Workflow Phases',
          phases: [
            {
              id: 'requirements',
              name: 'Requirements',
              description: 'Define EARS requirements with acceptance criteria.',
              artifacts: ['EARS requirements', 'Acceptance criteria', 'Stakeholder approval'],
              gate: 'Requirements must be validated and approved.',
            },
            {
              id: 'design',
              name: 'Design',
              description: 'Create design documents that trace to requirements.',
              artifacts: ['Design document', 'Interface specifications', 'ADRs'],
              gate: 'Design must trace to all requirements; ADRs recorded.',
            },
            {
              id: 'implementation',
              name: 'Implementation',
              description: 'Implement code that traces to design elements.',
              artifacts: ['Source code', 'Inline traceability comments'],
              gate: 'Code must compile, pass lint, and trace to design.',
            },
            {
              id: 'testing',
              name: 'Testing',
              description: 'Write and run tests that verify requirements.',
              artifacts: ['Test suites', 'Coverage report', 'Traceability matrix'],
              gate: 'Coverage ≥80%; all tests pass; full traceability verified.',
            },
            {
              id: 'review',
              name: 'Review',
              description: 'Final review and acceptance of the deliverable.',
              artifacts: ['Review checklist', 'Sign-off'],
              gate: 'All checklist items verified; stakeholder sign-off.',
            },
          ],
        }, null, 2),
      }),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDefaultResources(): ResourceEntry[] {
  return sddResources();
}

export function registerDefaultResources(server: MCPServer): void {
  for (const entry of getDefaultResources()) {
    server.resources.register(entry.resource, entry.handler);
  }
}
