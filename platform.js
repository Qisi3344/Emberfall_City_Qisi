// 平台适配层：为 Telegram Mini App 等容器预留统一入口，游戏本身不感知平台。
// Telegram 客户端会注入 window.Telegram.WebApp；普通浏览器则保持 web 默认值。
// main.js 只读取 window.__EMBER_PLATFORM__ 的 playerId / displayName，
// 与真人玩家使用同一套存档、命名与结算逻辑。
(function () {
  var platform = { name: 'web', playerId: null, displayName: '' };
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    platform.name = 'telegram';
    try { tg.ready(); tg.expand(); } catch (e) { /* 容器未就绪时静默 */ }
    var user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (user) {
      platform.playerId = 'tg-' + user.id;
      platform.displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || '';
    }
  }
  window.__EMBER_PLATFORM__ = platform;
})();
