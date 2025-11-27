// app.js
const puppeteer = require("puppeteer-core");
const fs = require("fs");

let BASE_CONFIG = {
  openUrl: "http://192.168.3.33:8899/Online/ShowLayout/1",
};

function findChromeOrEdge() {
  const username = process.env.USERNAME || process.env.USER || "Public";
  const paths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ✅ 关键：使用字符串而不是函数！
const initScriptStr = `
(() => {
  if (window.__TRAJECTORY_LOADED__) return;
  window.__TRAJECTORY_LOADED__ = true;

  const loadScript = () => {
    if (!document.head) {
      setTimeout(loadScript, 30);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://fastly.jsdelivr.net/gh/yw738/static/trajectory-animation.js";
    script.async = true;
    script.onload = () => {
      console.log('[注入成功] 轨迹动画已加载');
      document.title = '🎯 轨迹动画运行中';
    };
    script.onerror = () => {
      console.error('[注入失败] 无法加载 trajectory-animation.js');
      document.title = '❌ 脚本加载失败';
    };
    document.head.appendChild(script);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadScript);
  } else {
    loadScript();
  }
})();
`;

(async () => {
  console.log("🚀 启动中...");
  const exePath = findChromeOrEdge();
  if (!exePath) {
    console.error("❌ 未找到 Chrome 或 Edge，请先安装浏览器！");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: exePath,
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--start-maximized",
      "--disable-web-security", // 可选：绕过 CORS（仅开发用）
      "--disable-features=EnableEphemeralFlashPermission", // 避免某些弹窗
    ],
  });

  const page = await browser.newPage();
  await page.setViewport(); // 或动态获取
  await page.evaluateOnNewDocument(initScriptStr); // ← 安全注入
  //   await page.evaluateOnNewDocument(`
  //     delete navigator.__proto__.webdriver;
  //   `);
  await page.goto(BASE_CONFIG.openUrl, {
    waitUntil: "domcontentloaded",
  });

  console.log("✅ 成功！支持刷新重载。关闭窗口退出。");
  await new Promise(() => {});
})();
