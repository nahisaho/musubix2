/**
 * Application Layer — REQ-ARC-004
 *
 * Layered architecture: Domain → Application → Infrastructure → Interface
 * Provides application-level service abstractions.
 */

export interface ApplicationService<TInput = unknown, TOutput = unknown> {
  execute(input: TInput): TOutput | Promise<TOutput>;
}

export interface DTOMapper<TDomain, TDTO> {
  toDTO(domain: TDomain): TDTO;
  toDomain(dto: TDTO): TDomain;
}
