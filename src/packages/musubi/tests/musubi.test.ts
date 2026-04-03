import { describe, it, expect } from 'vitest';
import {
  MUSUBI_VERSION,
  createEARSPipeline,
  ActionableError,
  EARSValidator,
  Logger,
  ExitCode,
} from '../src/index.js';

describe('REQ-PKG-001: Musubi wrapper', () => {
  it('should export version', () => {
    expect(MUSUBI_VERSION).toBe('0.3.2');
  });

  it('should re-export core classes', () => {
    expect(ActionableError).toBeDefined();
    expect(EARSValidator).toBeDefined();
    expect(Logger).toBeDefined();
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it('should create EARS pipeline', () => {
    const pipeline = createEARSPipeline();
    expect(pipeline.validator).toBeInstanceOf(EARSValidator);
    expect(pipeline.parser).toBeDefined();
    expect(pipeline.requirementsValidator).toBeDefined();
  });

  it('should validate EARS through pipeline', () => {
    const { validator } = createEARSPipeline();
    const result = validator.analyze('WHEN user clicks, THE system SHALL respond.');
    expect(result.pattern).toBe('event-driven');
    expect(result.confidence).toBeGreaterThan(0.70);
  });
});
