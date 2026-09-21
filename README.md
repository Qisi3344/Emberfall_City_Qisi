# 余烬之城 Emberfall City

手机竖屏优先的极寒城市生存游戏：20 天一局，撑过最后的超级暴风雪。玩法与界面依据 v0.1、v0.2 策划与 UI 方向实现，使用原创名称与原创美术音频资源。

## 运行

需要 Node.js。无需安装项目依赖。

```powershell
npm run dev
```

打开 <http://127.0.0.1:4173>。`npm test` 运行规则引擎的完整 20 天模拟、失败路径与 MCP 接口检查。

## 在线访问（GitHub Pages）

已从 `main` 分支根目录发布：

```
https://qisi3344.github.io/Emberfall_City_Qisi/
```

游戏内全部资源引用均为相对路径（`./assets/...`），可直接运行在 Pages 的子路径下。

## 当前内容

- 20 天单局；1×/2×/3×、暂停、手动推进 6 小时。
- 新局依次经过加载页（Logo）→ 执政者命名（Logo）→ 开场文案；姓名 2～12 字符，本地保存上次输入，浏览器生成稳定 playerId。
- 固定 6 / 8 / 10 个建筑槽，建造、升级、拆除、派工。
- 煤、木、钢、食物、住房、疾病、希望与不满；发电机煤耗和超载。
- 工坊研究扩圈与供暖，法令、城市事件、Day 20 风暴、胜败结算。
- 低希望引发离城倾向、每日逃亡及大规模离城危机；高不满引发抗议、生产下降与 48 小时暴乱最后通牒。
- 浏览器本地自动存档与本机排名；结算和排名记录执政者姓名及 playerId。

## 音频系统（`audio.js`）

- 三首 BGM 随游戏状态自动切换（顺序淡入淡出，任意时刻只有一首在播）：
  - 《炉火未熄》— 开局与日常经营（第 1–7 天）。
  - 《逼近寒潮》— 中期降温与资源压力（第 8–16 天）。
  - 《白灾将至》— 第 17 天起的最终风暴，以及暴乱最后通牒 / 离城倒计时等严重社会危机；结算时淡出。
- 八个短音效：UI 点击、建造放置 / 完成、法令盖章、事件弹窗、危机警报、发电机启动 / 停机。
- Web Audio 实现，首次点击 / 按键解锁；总音量、BGM、音效三路独立可调，偏好持久化在本地。

## 设置面板

地图左上方“希望”下的 ⚙ 打开，打开期间游戏时间完全暂停：音量、雪花粒子、生存手册、AI / MCP 接入指南、重新开始本局（二次确认）与返回。

## MCP 游戏接口（`mcp-server.mjs`）

任何支持本地 **STDIO MCP** 的 AI 客户端都可以连接。MCP 对局与浏览器当前对局分别运行，但**共用同一套规则引擎**（`game.js` 的 `act` / `advanceHours`）。所有校验都在引擎内部完成，Agent 无法直接改数值或绕过资源消耗。排行榜记录与真人同格式、不区分人与 AI。

1. 在运行 AI 客户端的电脑上安装 Node.js，并下载或克隆完整项目。
2. 在游戏设置中打开“AI / MCP 接入指南”。用 `npm run dev` 运行本地游戏时，页面会自动填入 `mcp-server.mjs` 的绝对路径，还可以点击“检测本地 MCP 服务”验证握手和工具列表。在线静态页面无法读取本机文件路径，需要手动填写。
3. 在 AI 客户端新增 STDIO MCP 服务器，名称 `ember-city`，启动命令 `node`，参数为本机 `mcp-server.mjs` 的**绝对路径**。设置页可复制 JSON 或 TOML 示例；其他客户端可直接填写相同的命令与参数。
4. 保存并重启或刷新 AI 客户端。看到 `get_game_state`、`create_ruler` 等工具后，让 AI 创建执政者开始一局。客户端会自行启动 MCP 进程，不需要预先运行 `npm run mcp`。

使用 `mcpServers` 格式的客户端配置示例：

```json
{
  "mcpServers": {
    "ember-city": {
      "command": "node",
      "args": ["<本机项目绝对路径>/mcp-server.mjs"]
    }
  }
}
```

使用 TOML MCP 配置的客户端可以添加：

```toml
[mcp_servers.ember-city]
command = "node"
args = ["<本机项目绝对路径>/mcp-server.mjs"]
```

调试时可以手动运行 `npm run mcp`，服务通过标准输入 / 输出交换 MCP JSON-RPC 消息；标准输出不包含普通日志。

工具：`get_game_state`、`create_ruler`、`build`、`upgrade_building`、`demolish_building`、`assign_workers`、`research`、`sign_law`、`choose_event_option`、`toggle_generator`、`toggle_overdrive`、`issue_relief`、`make_concession`、`advance_time`、`get_result`。终局首次 `get_result` 会把战绩写入 `output/agent-ranks.json`（与浏览器战绩同一 schema，无人机标识字段）。

## Telegram Mini App 兼容（`platform.js`）

游戏本身不感知平台：`platform.js` 在 Telegram 容器内读取 `window.Telegram.WebApp`，调用 `ready()/expand()`，并用 Telegram 用户 id / 姓名填充游戏内的 playerId 与默认执政者名；普通浏览器自动回退 web 模式。后续在 BotFather 配置 Web App 地址即可上线，无需改动游戏代码。

## 目录结构

- `game.js` 规则引擎（纯逻辑，无 DOM）
- `main.js` 界面与交互，`style.css` 样式
- `audio.js` 音频系统，`platform.js` 平台适配，`mcp-server.mjs` MCP 服务器
- `assets/` 美术、BGM（`assets/bgm/`）与音效（`assets/sfx/`）、Logo（`assets/logo/`）
- 根目录的 `Emberfall_City__*` 文件夹为素材原始交付件，已被 gitignore，游戏只使用 `assets/` 内的副本
