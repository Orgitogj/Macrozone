import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { LIMITS } from '../contract.ts';
import { handleRequest, type HandlerBody, type HandlerDependencies } from '../app/handleRequest.ts';
import { resolveClientIp } from './clientIp.ts';

function readBody(request: IncomingMessage, maxBytes: number): Promise<HandlerBody> {
  return new Promise((resolve, reject) => {
    const declared = Number(request.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      request.resume();
      resolve({ kind: 'too_large' });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    request.on('data', (chunk: Buffer) => {
      if (settled) {
        return;
      }
      size += chunk.length;
      if (size > maxBytes) {
        settled = true;
        chunks.length = 0;
        request.resume();
        resolve({ kind: 'too_large' });
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!settled) {
        settled = true;
        resolve(size === 0 ? { kind: 'none' } : { kind: 'text', text: Buffer.concat(chunks).toString('utf8') });
      }
    });
    request.on('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function createHttpServer(deps: HandlerDependencies, { trustedProxies }: { trustedProxies: ReadonlySet<string> }): Server {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) {
        controller.abort();
      }
    });

    void (async () => {
      try {
        const body = await readBody(request, LIMITS.maxBodyBytes);
        const url = new URL(request.url ?? '/', 'http://localhost');
        const headers = Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), headerValue(value)]),
        );
        const result = await handleRequest(
          {
            method: request.method ?? 'GET',
            path: url.pathname,
            headers,
            body,
            clientIp: resolveClientIp(request.socket.remoteAddress, headers['x-forwarded-for'], trustedProxies),
            signal: controller.signal,
          },
          deps,
        );
        if (response.destroyed) {
          return;
        }
        response.writeHead(result.status, result.headers);
        response.end(result.body === null ? undefined : JSON.stringify(result.body));
      } catch {
        deps.logger.error('request_failed', { code: 'SERVER_ERROR' });
        if (!response.headersSent && !response.destroyed) {
          response.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          response.end(JSON.stringify({ version: 1, status: 'error', error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server.', retryable: true } }));
        }
      }
    })();
  });
}
