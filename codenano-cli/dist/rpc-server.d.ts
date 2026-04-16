type MethodHandler = (params?: Record<string, unknown>) => Promise<unknown> | never;
export declare class RpcServer {
    private methods;
    private pending;
    register(name: string, handler: MethodHandler): void;
    handleLine(line: string): Promise<void>;
    sendResponse(id: string | number | null, result: unknown): void;
    sendError(id: string | number | null, code: number, message: string, data?: unknown): void;
    sendNotification(type: string, data: unknown): void;
}
export {};
//# sourceMappingURL=rpc-server.d.ts.map