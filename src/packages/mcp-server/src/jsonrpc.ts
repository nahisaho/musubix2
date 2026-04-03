// JSON-RPC 2.0 message types for MCP protocol

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export const MCP_METHODS = {
  INITIALIZE: 'initialize',
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  PING: 'ping',
} as const;

export function createJsonRpcResponse(id: string | number, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

export function createJsonRpcError(
  id: string | number,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj['jsonrpc'] === '2.0' &&
    (typeof obj['id'] === 'string' || typeof obj['id'] === 'number') &&
    typeof obj['method'] === 'string'
  );
}
