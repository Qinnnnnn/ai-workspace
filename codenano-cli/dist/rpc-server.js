export class RpcServer {
    methods = new Map();
    pending = new Map();
    register(name, handler) {
        this.methods.set(name, handler);
    }
    async handleLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        let req;
        try {
            req = JSON.parse(trimmed);
        }
        catch {
            this.sendError(null, -32700, 'Parse error');
            return;
        }
        if (req.method === 'stream') {
            return;
        }
        if (req.id === null || req.id === undefined) {
            this.sendError(req.id, -32600, 'Invalid Request: missing id');
            return;
        }
        const handler = this.methods.get(req.method);
        if (!handler) {
            this.sendError(req.id, -32601, `Method not found: ${req.method}`);
            return;
        }
        try {
            const result = await handler(req.params);
            this.sendResponse(req.id, result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.sendError(req.id, -32603, `Internal error: ${message}`);
        }
    }
    sendResponse(id, result) {
        const response = { jsonrpc: '2.0', id, result };
        console.log(JSON.stringify(response));
    }
    sendError(id, code, message, data) {
        const response = { jsonrpc: '2.0', id, error: { code, message, data } };
        console.log(JSON.stringify(response));
    }
    sendNotification(type, data) {
        const notification = {
            jsonrpc: '2.0',
            method: 'stream',
            params: { type, data },
        };
        console.log(JSON.stringify(notification));
    }
}
//# sourceMappingURL=rpc-server.js.map