# Native Engines（已迁出）

> W23 拆分：本目录下的所有原生引擎已迁出到独立 Gitee 仓。
> Monorepo 留此 README 作为指针，便于历史 grep 与新成员定位。

## 已迁出仓库

| 子目录（已删除） | 独立仓 | 镜像策略 |
|---|---|---|
| `typesetting/` | https://gitee.com/readmigo/typesetting | GitHub `readmigo/typesetting` 单向 mirror |
| `badge-engine/` | https://gitee.com/readmigo/badge-engine | GitHub `readmigo/badge-engine` 单向 mirror |

NAPI 桥接层同样已独立：

| 旧路径（已删除） | 独立仓 |
|---|---|
| `napi-bridge/` | https://gitee.com/readmigo/napi-bridge |

## 引用方式（未来）

`apps/harmony-app` 通过 `oh-package.json5` 或 hvigor 配置引用 `napi-bridge`，
`napi-bridge` 通过 CMake `FetchContent` / submodule 拉取 `typesetting` / `badge-engine`。

详见 [`docs/architecture/04-native-engine-sync-strategy.md`](../docs/architecture/04-native-engine-sync-strategy.md)。

## 历史快照

`pre-typesetting-split` / `pre-badge-engine-split` / `pre-napi-bridge-split` 三个 tag 保留拆分前的完整树。
