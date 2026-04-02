import { describe, it, expect } from 'vitest';
import type { ApplicationService, DTOMapper } from '../../src/application/index.js';

describe('REQ-ARC-004: Application layer', () => {
  it('should allow implementing ApplicationService interface', () => {
    class GreetService implements ApplicationService<string, string> {
      execute(input: string): string {
        return `Hello, ${input}!`;
      }
    }

    const svc = new GreetService();
    expect(svc.execute('World')).toBe('Hello, World!');
  });

  it('should allow async ApplicationService', async () => {
    class AsyncService implements ApplicationService<number, number> {
      async execute(input: number): Promise<number> {
        return input * 2;
      }
    }

    const svc = new AsyncService();
    expect(await svc.execute(5)).toBe(10);
  });

  it('should allow implementing DTOMapper interface', () => {
    interface User {
      id: string;
      name: string;
    }
    interface UserDTO {
      userId: string;
      displayName: string;
    }

    class UserMapper implements DTOMapper<User, UserDTO> {
      toDTO(domain: User): UserDTO {
        return { userId: domain.id, displayName: domain.name };
      }
      toDomain(dto: UserDTO): User {
        return { id: dto.userId, name: dto.displayName };
      }
    }

    const mapper = new UserMapper();
    const dto = mapper.toDTO({ id: '1', name: 'Alice' });
    expect(dto.userId).toBe('1');
    expect(dto.displayName).toBe('Alice');

    const domain = mapper.toDomain(dto);
    expect(domain.id).toBe('1');
    expect(domain.name).toBe('Alice');
  });

  it('should be re-exported from core barrel', async () => {
    const core = await import('../../src/index.js');
    // Type-only exports won't appear at runtime, but the module should load without error
    expect(core.VERSION).toBeDefined();
  });
});
