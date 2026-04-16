#!/usr/bin/env node
import { createAgent } from 'codenano';
import { RpcServer } from './rpc-server.js';
const server = new RpcServer();
let agent = null;
const sessions = new Map();
const sessionMeta = new Map();
server.register('init', async (params) => {
    const { config } = (params ?? {});
    agent = createAgent({
        ...config,
        persistence: { enabled: false },
    });
    return { ok: true };
});
server.register('send', async (params) => {
    if (!agent)
        throw new Error('Agent not initialized. Call init first.');
    const { sessionId, prompt } = (params ?? {});
    let session = sessions.get(sessionId);
    if (!session) {
        session = agent.session(sessionId);
        sessions.set(sessionId, session);
        const now = new Date().toISOString();
        sessionMeta.set(sessionId, { createdAt: now, lastActivity: now });
    }
    sessionMeta.get(sessionId).lastActivity = new Date().toISOString();
    try {
        for await (const event of session.stream(prompt)) {
            server.sendNotification(event.type, event);
        }
        return { ok: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        server.sendNotification('error', { error: message });
        throw err;
    }
});
server.register('close', async (params) => {
    const { sessionId } = (params ?? {});
    const session = sessions.get(sessionId);
    if (session) {
        sessions.delete(sessionId);
        sessionMeta.delete(sessionId);
    }
    return { ok: true };
});
server.register('history', async (params) => {
    const { sessionId } = (params ?? {});
    const session = sessions.get(sessionId);
    if (!session)
        throw new Error(`Session not found: ${sessionId}`);
    return { history: session.history };
});
server.register('list_sessions', async () => {
    const result = [];
    for (const [sessionId, meta] of sessionMeta) {
        result.push({
            sessionId,
            createdAt: meta.createdAt,
            lastActivity: meta.lastActivity,
        });
    }
    return { sessions: result };
});
async function main() {
    const decoder = new TextDecoder();
    const handleStdout = () => {
        // stdout is used for JSON-RPC responses/notifications - don't process here
    };
    process.stdin.setEncoding('utf-8');
    let buffer = '';
    for await (const chunk of process.stdin) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (line.trim()) {
                await server.handleLine(line);
            }
        }
    }
    // Handle remaining buffer after stdin closes
    if (buffer.trim()) {
        await server.handleLine(buffer.trim());
    }
}
main().catch((err) => {
    console.error(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message } }));
    process.exit(1);
});
//# sourceMappingURL=index.js.map