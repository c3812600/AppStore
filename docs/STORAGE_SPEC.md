# R2 应用商店存储规范

Cloudflare R2 桶 `releases` 的统一存放规范。目的：每个产品自包含、命名一致、别再出现
`updates/` 这种共享杂项堆、旧商店残留文件。新发布/接产品照此，CI 上传路径照此。

## 一、总原则

1. **每产品一个顶层目录，自包含**——该产品的安装包、更新源、版本元数据、校验哈希全在自己目录下，不跨目录、不设共享 `updates/`。
2. **下载按钮只用「固定 latest 别名」**——对象名含 `latest`、不含版本号，每版覆盖同名对象（商店链接永不改）。版本化命名只进 GitHub Releases 留档，不进 R2。
3. **每条上传带 `--cache-control "no-cache"`**（含 version.js）——缺了 CF 默认缓存 4h，客户点到旧包。
4. **version.js 自动化**：每产品目录一个 `version.js`，内容 `window.__r2meta__<id> = {"version":"<版本>","updated":"<UTC ISO>"};`（键=产品 id 去连字符换下划线）。版本取「基版本 + CI run 号」自动拼，不手管。
5. **商店条目只放客户面向的正式下载**——测试库/演示件/内部工件不上架（上过就删）。
6. **签名私钥/凭据/token 绝不入库**（AppStore 是公开仓；R2 只放公开安装件）。

## 二、目录布局（桶 `releases`）

```
releases/
  controlcommand/            # ControlCommand（RCC 展馆中控）
    ControlCommand-latest-x64.msix     # MSIX 安装包（latest 别名）
    ControlCommand.appinstaller        # 自动更新源（AppInstaller，指向上面 msix）
    version.js
  e-player/                  # E-Player
    E-Player-Setup-latest.exe          # 安装包（latest 别名）
    E-Player-latest-win-x64.zip        # 便携版
    latest.yml                         # electron-updater 更新源（指向 latest 别名）
    version.js
  netcontrol/                # NetControl
    NetControl-latest.zip
    NetControl-latest.apk
    version.js
  rustnode/                  # Rust-Node
    RustNode-Setup-latest.exe
    RustNode-latest-linux-x86_64.tar.gz
    RustNode-latest-linux-aarch64.tar.gz
    hashes/{win-x64,linux-x86_64,linux-aarch64}.json   # sha256 校验
    install-openwrt.sh                 # 安装脚本
    version.js
  winpilot/                  # WinPilot
    WinPilot-latest-win-x64.exe
    WinPilot-latest-win-x64.zip
    WinPilot-latest-x64.msix           # MSIX 安装包（latest 别名）
    WinPilot.appinstaller              # 自动更新源（指向上面 msix）
    version.js
  nodes/                     # Rust-Node 节点商店（独立于产品）
    index.json                         # 节点索引
    <node>/<node>-<ver>.npk + .npk.sig # 节点包 + 签名
```

## 三、更新源（自动更新）放哪

- **MSIX 产品（RCC/WinPilot）**：`.appinstaller` 与 `.msix` 都放**产品自己的目录**（如 `winpilot/`）。
  appinstaller 的 `Uri`（自身地址）= `<产品目录>/<Product>.appinstaller`，`MainPackage.Uri` = `<产品目录>/<Product>_latest_x64.msix`（或版本化，指向同一目录）。
  应用内更新检查读 `<产品目录>/<Product>.appinstaller`（`releases.lonk.vip/<product>/`）。
- **Electron 产品（E-Player）**：`latest.yml` 放产品目录，指向同目录的 latest 别名 exe（electron-updater 读它）。
- **Rust-Node**：`hashes/*.json` + `install-openwrt.sh` 放产品目录（脚本内 URL 指向同目录 tar.gz）。
- **不设共享 `updates/` 目录**——更新源跟产品走，避免「产品在 A 目录、更新源在 B 目录」的分裂。

> 迁移说明：早期曾用 `download.lonk.vip/updates/`（AppStore 仓 `docs/updates/`，Pages 提供）放更新源辅助文件；现统一迁到**产品 R2 目录**，AppStore 仓 `docs/updates/` 只留证书/安装脚本这类真辅助件，不放 appinstaller/msix。

## 四、命名约定

| 类型 | 命名 | 例 |
|---|---|---|
| Windows 安装包 | `<Product>-latest-win-x64.exe` | `WinPilot-latest-win-x64.exe` |
| 便携版 | `<Product>-latest-win-x64.zip` | `E-Player-latest-win-x64.zip` |
| Linux 包 | `<Product>-latest-linux-<arch>.tar.gz` | `RustNode-latest-linux-x86_64.tar.gz` |
| MSIX | `<Product>-latest-x64.msix` | `ControlCommand-latest-x64.msix` |
| 更新源 | `<Product>.appinstaller` / `latest.yml` | `WinPilot.appinstaller` |
| 版本元数据 | `version.js` | `winpilot/version.js` |
| 校验 | `hashes/<plat>.json` | `rustnode/hashes/win-x64.json` |
| 节点包 | `nodes/<node>/<node>-<ver>.npk(.sig)` | `nodes/code/code-0.1.1.npk` |

## 五、禁止 / 清理

- **禁止**：`updates/` 共享堆、`update.json`（旧商店更新机制，已废）、`latest/` 二级目录、版本化命名进 R2、演示 db/测试件上架。
- **残留清理**（旧商店遗留）：`*/update.json`、`netcontrol/latest/`、`netcontrol/1.3/`（旧版本化）、`controlcommand/ControlCommand-demo.db`（演示件）——新发布一律不留这些。
