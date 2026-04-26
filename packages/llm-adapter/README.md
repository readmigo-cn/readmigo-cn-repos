# llm-adapter

这是国内模型接入的最小适配层骨架，当前优先支持 `DeepSeek`。

## 目标

- 屏蔽不同模型厂商的请求差异
- 先让后端以统一接口跑通聊天能力
- 后续按需补 `文心`、`智谱`、`Qwen`

## 当前文件

- `src/types.ts`：公共类型
- `src/provider.ts`：Provider 接口
- `src/providers/deepseek.ts`：DeepSeek 实现
- `src/index.ts`：工厂与导出

## 当前策略

- `DeepSeek` 作为默认主模型
- 使用其官方兼容接口，减少初版接入成本
- 其他 provider 先预留接口，不在这个仓直接猜测实现细节

官方来源：

- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/api/deepseek-api
