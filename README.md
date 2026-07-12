# FoxMeter

FoxMeter 是一个轻量的 macOS Codex 用量浮层，展示 5 小时与每周额度、重置时间、套餐和 Credits

应用始终使用固定的 320×184 紧凑窗口，设置面板在同一窗口内替换额度内容

## 主要能力

- 默认置顶并显示在所有桌面空间，设置会跨重启保存
- 顶部标题栏和左侧栏空白区域可拖动，窗口位置会保存在本机
- 刷新间隔可选 30 秒、1 分钟、2 分钟或 5 分钟
- 关闭窗口时隐藏并暂停轮询，点击 Dock 恢复后立即刷新
- 支持 `⌘R` 刷新、`⌘,` 打开设置、`Esc` 退出设置
- 支持浅色、深色和 reduced-motion

## 开发

```bash
pnpm install
pnpm desktop:dev
```

`tauri dev` 运行裸调试可执行文件，macOS Dock 可能显示 `exec` 占位图标

`pnpm desktop:dev` 支持前端 HMR，Rust 改动会触发重新编译和应用重启；debug 或 release `.app` 不会热更新，需要重新构建并打开

开发态 Vite 使用 Tauri 模板默认的 `localhost:1420`，只服务本地 WebView 与 HMR

检查真实应用名称和狐狸图标时，构建后手动打开 `.app`

```bash
pnpm desktop:build:debug
pnpm desktop:open:debug
```

调试包位于 `src-tauri/target/debug/bundle/macos/FoxMeter.app`

## 构建

```bash
pnpm desktop:build
```

构建同时产出：

- `src-tauri/target/release/bundle/macos/FoxMeter.app`
- `src-tauri/target/release/bundle/dmg/FoxMeter_0.1.0_aarch64.dmg`

当前只构建 Apple Silicon 版本。本地构建只有 ad-hoc 签名，没有 Developer ID 签名或 notarization，不自动安装到 Applications，也不会自动打开

## 数据与安全边界

- 只读 `$CODEX_HOME/auth.json` 或 `~/.codex/auth.json`
- 使用 access token 请求 Codex usage endpoint，不启动 Codex agent 进程
- 不刷新 token、不写回凭据、不读取浏览器 Cookie
- 本地缓存只包含用量快照，不包含 token
- 缓存与偏好使用原子写入，异常中断时不暴露半写入 JSON
- 请求失败时展示明确标记的 stale 缓存
- 生产 WebView CSP 只允许本地资源与 Tauri IPC

## 校验

```bash
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```
