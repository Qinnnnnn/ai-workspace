## 1. 修改 onText 回调

- [x] 1.1 在 `codenano-webui/src/App.tsx` 的 `onText` 回调中，检查是否有正在流式传输的 assistant 消息
- [x] 1.2 如果没有，创建一个带空 text block 的新 assistant 消息，再处理文本

## 2. 测试验证

- [ ] 2.1 验证内网 API（无 thinking 输出）场景下 text 正常显示
- [ ] 2.2 验证公网 API（有 thinking 输出）场景下 text 正常显示
