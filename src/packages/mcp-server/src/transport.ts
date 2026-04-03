// MCP Transport Layer — stdio, SSE, and in-memory transports

import * as http from 'node:http';
import * as readline from 'node:readline';
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from './jsonrpc.js';

export interface MCPTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  send(message: JsonRpcResponse | JsonRpcNotification): void;
  onMessage(handler: (message: JsonRpcRequest) => Promise<JsonRpcResponse>): void;
}

// ---------------------------------------------------------------------------
// StdioTransport — newline-delimited JSON over stdin/stdout
// ---------------------------------------------------------------------------

export class StdioTransport implements MCPTransport {
  private input: NodeJS.ReadableStream;
  private output: NodeJS.WritableStream;
  private handler: ((msg: JsonRpcRequest) => Promise<JsonRpcResponse>) | null = null;
  private rl: readline.Interface | null = null;

  constructor(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream) {
    this.input = input ?? process.stdin;
    this.output = output ?? process.stdout;
  }

  async start(): Promise<void> {
    this.rl = readline.createInterface({ input: this.input });
    this.rl.on('line', (line: string) => {
      void this.processLine(line);
    });
  }

  private async processLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (!this.handler) return;

    try {
      const parsed = JSON.parse(trimmed) as JsonRpcRequest;
      const response = await this.handler(parsed);
      this.send(response);
    } catch {
      // Malformed JSON — send parse error
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32700, message: 'Parse error' },
      };
      this.send(errorResponse);
    }
  }

  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  send(message: JsonRpcResponse | JsonRpcNotification): void {
    this.output.write(JSON.stringify(message) + '\n');
  }

  onMessage(handler: (msg: JsonRpcRequest) => Promise<JsonRpcResponse>): void {
    this.handler = handler;
  }
}

// ---------------------------------------------------------------------------
// SSETransport — HTTP Server-Sent Events transport
// ---------------------------------------------------------------------------

export class SSETransport implements MCPTransport {
  private port: number;
  private server: http.Server | null = null;
  private handler: ((msg: JsonRpcRequest) => Promise<JsonRpcResponse>) | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();

  constructor(port: number = 3100) {
    this.port = port;
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server = http.createServer((req, res) => {
        void this.handleHttp(req, res);
      });
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  private async handleHttp(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'GET' && req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      this.sseClients.add(res);
      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/message') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString('utf-8');

      if (!this.handler) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No handler registered' }));
        return;
      }

      try {
        const request = JSON.parse(body) as JsonRpcRequest;
        const response = await this.handler(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 0,
            error: { code: -32700, message: 'Parse error' },
          }),
        );
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  async stop(): Promise<void> {
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  send(message: JsonRpcResponse | JsonRpcNotification): void {
    const data = JSON.stringify(message);
    for (const client of this.sseClients) {
      client.write(`data: ${data}\n\n`);
    }
  }

  onMessage(handler: (msg: JsonRpcRequest) => Promise<JsonRpcResponse>): void {
    this.handler = handler;
  }

  getPort(): number {
    return this.port;
  }
}

// ---------------------------------------------------------------------------
// InMemoryTransport — for testing
// ---------------------------------------------------------------------------

export class InMemoryTransport implements MCPTransport {
  private handler: ((msg: JsonRpcRequest) => Promise<JsonRpcResponse>) | null = null;
  private sentMessages: (JsonRpcResponse | JsonRpcNotification)[] = [];

  async start(): Promise<void> {}
  async stop(): Promise<void> {}

  send(message: JsonRpcResponse | JsonRpcNotification): void {
    this.sentMessages.push(message);
  }

  onMessage(handler: (msg: JsonRpcRequest) => Promise<JsonRpcResponse>): void {
    this.handler = handler;
  }

  async simulateRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.handler) throw new Error('No handler registered');
    return this.handler(request);
  }

  getSentMessages(): (JsonRpcResponse | JsonRpcNotification)[] {
    return [...this.sentMessages];
  }
}
