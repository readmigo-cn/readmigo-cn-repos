# harmony-app

这是 `HarmonyOS NEXT` 主应用脚手架，不是 DevEco 自动生成工程的完整替代品。

当前目标：

- 先把目录结构、模块声明、ArkTS 页面和 AGC 配置占位搭起来
- 页面语义对齐 `readmigo-repos/mobile`
- 后续在 `DevEco Studio` 中打开并按实际 SDK 版本校正构建文件

当前已对齐的页面语义：

- `Login`
- `Onboarding`
- `Discover`
- `Library`
- `Reader`
- `Me`

需要你在华为后台创建应用后补齐：

- `entry/agconnect-services.json`
- 签名证书
- 实际 `bundleName`
- 实际 SDK 版本号
