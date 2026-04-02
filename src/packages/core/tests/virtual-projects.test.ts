import { describe, it, expect } from 'vitest';
import { VIRTUAL_PROJECTS, type VirtualProject } from '../src/fixtures/virtual-projects.js';

const EXPECTED_DOMAINS = [
  'pet-clinic',
  'parking',
  'library',
  'delivery',
  'gym',
  'reservation',
  'clinic',
  'real-estate',
  'inventory',
  'project-mgmt',
  'e-learning',
  'employee',
  'household',
  'ticketing',
  'iot-dashboard',
  'api-gateway',
];

describe('VIRTUAL_PROJECTS', () => {
  it('should contain exactly 16 projects', () => {
    expect(VIRTUAL_PROJECTS).toHaveLength(16);
  });

  it('each project should have requirements, designs, and tasks', () => {
    for (const project of VIRTUAL_PROJECTS) {
      expect(project.requirements.length).toBeGreaterThanOrEqual(1);
      expect(project.designs.length).toBeGreaterThanOrEqual(1);
      expect(project.tasks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all requirement IDs should be unique across projects', () => {
    const allReqIds = VIRTUAL_PROJECTS.flatMap((p) =>
      p.requirements.map((r) => r.id),
    );
    const unique = new Set(allReqIds);
    expect(unique.size).toBe(allReqIds.length);
  });

  it('all 16 domains should be distinct and match the expected set', () => {
    const domains = VIRTUAL_PROJECTS.map((p) => p.domain);
    const uniqueDomains = new Set(domains);
    expect(uniqueDomains.size).toBe(16);
    expect([...uniqueDomains].sort()).toEqual([...EXPECTED_DOMAINS].sort());
  });
});
