import type { AgentConfig, StreamEvent } from 'codenano';
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number | string | null;
    method: string;
    params?: Record<string, unknown>;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: number | string | null;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface JsonRpcNotification {
    jsonrpc: '2.0';
    method: 'stream';
    params: {
        type: string;
        data: unknown;
    };
}
export interface InitParams {
    config: AgentConfig;
}
export interface SendParams {
    sessionId: string;
    prompt: string;
}
export interface CloseParams {
    sessionId: string;
}
export interface HistoryParams {
    sessionId: string;
}
export interface StreamData {
    type: StreamEvent['type'];
    data: Omit<StreamEvent, 'type'> & {
        type?: never;
    };
}
export type SessionInfo = {
    sessionId: string;
    createdAt: string;
    lastActivity: string;
};
//# sourceMappingURL=rpc-types.d.ts.map