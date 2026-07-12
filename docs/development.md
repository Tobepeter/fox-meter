# FoxMeter 开发说明

## 本地开发

```bash
pnpm install
pnpm desktop:dev
```

`pnpm desktop:dev` 会同时启动 Vite、Rust backend 和原生窗口。前端支持 HMR，Rust 改动会触发重新编译并重启应用

开发态使用 Tauri 模板默认端口 `localhost:1420`。直接运行裸调试可执行文件时，macOS Dock 可能显示 `exec` 占位图标；需要检查真实应用身份时，请构建并打开 `.app`

```bash
pnpm desktop:build:debug
pnpm desktop:open:debug
```

## 构建

```bash
pnpm desktop:build
```

构建会产出 FoxMeter `.app` 与 Apple Silicon `.dmg`。本地构建仅使用 ad-hoc 签名，没有 Developer ID 签名或 notarization

## 检查

```bash
pnpm check
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

## 数据边界

- 只读 `$CODEX_HOME/auth.json` 或 `~/.codex/auth.json`
- 使用现有 access token 查询 Codex 用量，不启动 Codex agent 进程
- 不刷新 token、不写回凭据、不读取浏览器 Cookie
- 本地缓存不包含 token
- 生产 WebView 的 CSP 只允许本地资源与 Tauri IPC
