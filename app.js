// app.js
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const { URL } = require("url");
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
let BASE_CONFIG = {
  openUrl: "http://192.168.3.40:8899/Online/ShowLayout/1",
  /** 本地静态资源端口，0 表示不启动 */
  staticPort: 7070,
  /** 0.0.0.0 = 所有网卡，局域网可用本机 IP 访问；仅本机则用 127.0.0.1 */
  staticHost: "0.0.0.0",
};

function listLanIpv4() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

/** 供注入页面的本机局域网 IPv4（多网卡时跳过 169.254 链路本地，取第一个可用） */
function pickLanIpv4() {
  const ips = listLanIpv4();
  const usable = ips.filter((a) => !a.startsWith("169.254."));
  return usable[0] || ips[0] || "127.0.0.1";
}

const STATIC_MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/** 接口 /api/img 仅允许这些扩展名，防止任意读文件 */
const IMG_READ_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".svg",
]);

function pipeLocalFile(req, res, absPath) {
  fs.stat(absPath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    res.setHeader(
      "Content-Type",
      STATIC_MIME[ext] || "application/octet-stream"
    );
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    fs.createReadStream(absPath).pipe(res);
  });
}

/**
 * 解析图片接口文件名：支持 GET /api/img?file=a.png 或 GET /api/img/a.png
 * @param {string} pathname
 * @param {URLSearchParams} searchParams
 */
function resolveImgRequestName(pathname, searchParams) {
  const prefix = "/api/img/";
  if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
    return decodeURIComponent(pathname.slice(prefix.length));
  }
  return (
    searchParams.get("file") ||
    searchParams.get("name") ||
    ""
  );
}

/**
 * @param {{ staticRoot: string, imgRoot: string, port: number, host: string }} opts
 * @returns {Promise<import("http").Server | null>}
 */
function startHttpServer(opts) {
  const { staticRoot, imgRoot, port, host } = opts;
  if (!port) return Promise.resolve(null);
  if (!fs.existsSync(staticRoot)) {
    fs.mkdirSync(staticRoot, { recursive: true });
  }
  if (!fs.existsSync(imgRoot)) {
    fs.mkdirSync(imgRoot, { recursive: true });
  }
  const rootResolved = path.resolve(staticRoot);
  const imgRootResolved = path.resolve(imgRoot);

  const server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let u;
    try {
      u = new URL(req.url || "/", "http://localhost");
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }
    const pathname = u.pathname || "/";

    if (pathname === "/api/img" || pathname.startsWith("/api/img/")) {
      const rawName = resolveImgRequestName(pathname, u.searchParams);
      const base = path.basename(rawName);
      if (!base) {
        res.writeHead(400);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(
          "缺少文件名。示例: /api/img?file=photo.png 或 /api/img/photo.png"
        );
        return;
      }
      const ext = path.extname(base).toLowerCase();
      if (!IMG_READ_EXT.has(ext)) {
        res.writeHead(415);
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("仅支持图片扩展名: " + [...IMG_READ_EXT].join(" "));
        return;
      }
      const absImg = path.resolve(imgRootResolved, base);
      if (
        absImg !== imgRootResolved &&
        !absImg.startsWith(imgRootResolved + path.sep)
      ) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      pipeLocalFile(req, res, absImg);
      return;
    }

    let rel = decodeURIComponent(pathname.replace(/^\//, "")) || "index.html";
    rel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
    const absPath = path.resolve(rootResolved, rel);
    if (
      absPath !== rootResolved &&
      !absPath.startsWith(rootResolved + path.sep)
    ) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    pipeLocalFile(req, res, absPath);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      let msg = `📁 静态资源目录: ${staticRoot}\n   图片目录(img): ${imgRoot}\n   图片接口: /api/img?file=文件名.png 或 /api/img/文件名.png`;
      if (host === "0.0.0.0" || host === "::") {
        msg += `\n   已绑定所有网卡，端口 ${port}`;
        const ips = listLanIpv4();
        if (ips.length) {
          msg += `\n   局域网: ${ips.map((ip) => `http://${ip}:${port}/`).join("  ")}`;
        }
        msg += `\n   本机: http://127.0.0.1:${port}/`;
      } else {
        msg += `\n   访问基址: http://${host}:${port}/`;
      }
      console.log(msg);
      resolve(server);
    });
    server.on("error", reject);
  });
}

function findChromeOrEdge() {
  const username = process.env.USERNAME || process.env.USER || "Public";
  const candidates = [
    // Chrome
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,

    // Edge
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    `C:\\Users\\${username}\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe`,
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// 🔥 关键：兼容 pkg 和开发环境
// 运行：process.cwd() → exe 所在目录
const rootDir = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;

// assets、img 文件夹（与 exe 同级，便于 pkg 外挂资源）
const assetDir = path.join(rootDir, "assets");
const imgDir = path.join(rootDir, "img");

/**
 * pkg：优先读 exe 旁 assets（便于热更新），否则读打包进快照的 assets。
 * 开发环境：rootDir 即 __dirname，与 assets 目录一致。
 */
function resolveTrajectoryUtilsPath() {
  const besideExe = path.join(assetDir, "trajectory-animation.js");
  if (fs.existsSync(besideExe)) return besideExe;
  if (process.pkg) {
    const inSnapshot = path.join(__dirname, "assets", "trajectory-animation.js");
    if (fs.existsSync(inSnapshot)) return inSnapshot;
  }
  throw new Error(
    "找不到 trajectory-animation.js：请在 exe 同目录建立 assets 并放入该文件，或在 package.json 的 pkg.assets 中包含 assets/**/* 后重新打包。"
  );
}

const utilsPath = resolveTrajectoryUtilsPath();
const utilsCode = fs.readFileSync(utilsPath, "utf8");
const pkgnodeLanIpv4 = pickLanIpv4();

const initScriptStr = `
 (() => {
   if (window.__TRAJECTORY_LOADED__) return;
   window.__TRAJECTORY_LOADED__ = true;
   window.__PKGNODE_LAN_IPV4__ = ${JSON.stringify(pkgnodeLanIpv4)};
 
   const injectScript = () => {
     if (!document.head) {
       // 继续等待 head 出现
       setTimeout(injectScript, 30);
       return;
     }
 
     const script = document.createElement('script');
     script.textContent = ${JSON.stringify(utilsCode)};
     document.head.appendChild(script);
   };
 
   // 确保在 DOM 可用后才尝试注入
   if (document.readyState === 'loading') {
     document.addEventListener('DOMContentLoaded', injectScript);
   } else {
     injectScript();
   }
 })();
 `;

// // ✅ 关键：使用字符串而不是函数！
// const initScriptStr = `
// (() => {
//   if (window.__TRAJECTORY_LOADED__) return;
//   window.__TRAJECTORY_LOADED__ = true;

//   const loadScript = () => {
//     if (!document.head) {
//       setTimeout(loadScript, 30);
//       return;
//     }

//     const script = document.createElement('script');
//     script.src = "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/trajectory-animation2.js";
//     script.async = true;
//     script.onload = () => {
//       console.log('[注入成功] 轨迹动画已加载');
//       document.title = '🎯 轨迹动画运行中';
//     };
//     script.onerror = () => {
//       console.error('[注入失败] 无法加载 trajectory-animation.js');
//       document.title = '❌ 脚本加载失败';
//     };
//     document.head.appendChild(script);
//   };

//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', loadScript);
//   } else {
//     loadScript();
//   }

// })();
// `;

(async () => {
  console.log("🚀 启动中...");
  try {
    await startHttpServer({
      staticRoot: assetDir,
      imgRoot: imgDir,
      port: BASE_CONFIG.staticPort,
      host: BASE_CONFIG.staticHost,
    });
  } catch (e) {
    console.error("❌ 静态资源端口启动失败（可改 BASE_CONFIG.staticPort 或设为 0 关闭）:", e.message);
    process.exit(1);
  }

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
