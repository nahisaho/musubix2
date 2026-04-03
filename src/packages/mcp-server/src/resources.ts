// MCP Resource Registry — resource registration and reading

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export type ResourceHandler = () => MCPResourceContent;

export class ResourceRegistry {
  private resources: Map<string, { resource: MCPResource; handler: ResourceHandler }> = new Map();

  register(resource: MCPResource, handler: ResourceHandler): void {
    this.resources.set(resource.uri, { resource, handler });
  }

  unregister(uri: string): boolean {
    return this.resources.delete(uri);
  }

  get(uri: string): MCPResource | undefined {
    return this.resources.get(uri)?.resource;
  }

  list(): MCPResource[] {
    return [...this.resources.values()].map((entry) => entry.resource);
  }

  read(uri: string): MCPResourceContent {
    const entry = this.resources.get(uri);
    if (!entry) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return entry.handler();
  }
}
