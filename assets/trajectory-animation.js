// trajectory-animation.js
// (() => {
//   // 防止重复执行
//   if (window.__DRAGGABLE_CREATED__) return;
//   window.__DRAGGABLE_CREATED__ = true;

//   // 等待 DOM 加载完成后再执行
//   const init = () => {
//     // 创建可拖拽 div
//     const dragDiv = document.createElement("div");
//     dragDiv.textContent = "拖我";
//     dragDiv.style.cssText = `
//         position: absolute;
//         top: 100px;
//         left: 100px;
//         width: 120px;
//         height: 60px;
//         background-color: #2196F3;
//         color: white;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         cursor: move;
//         border-radius: 6px;
//         user-select: none;
//         z-index: 10000;
//         font-family: Arial, sans-serif;
//         font-size: 14px;
//       `;
//     document.body.appendChild(dragDiv);

//     let isDragging = false;
//     let offsetX = 0;
//     let offsetY = 0;

//     // 鼠标按下
//     dragDiv.addEventListener("mousedown", (e) => {
//       isDragging = true;
//       const rect = dragDiv.getBoundingClientRect();
//       offsetX = e.clientX - rect.left;
//       offsetY = e.clientY - rect.top;
//       e.preventDefault(); // 阻止默认行为（如选中文本）
//     });

//     // 全局鼠标移动（处理拖拽）
//     document.addEventListener("mousemove", (e) => {
//       if (!isDragging) return;

//       const x = e.clientX - offsetX;
//       const y = e.clientY - offsetY;

//       dragDiv.style.left = `${x}px`;
//       dragDiv.style.top = `${y}px`;

//       // 打印当前坐标（四舍五入便于阅读）
//       console.log(
//         `Draggable position → x: ${Math.round(x)}, y: ${Math.round(y)}`
//       );
//     });

//     // 鼠标松开或离开，停止拖拽
//     const stopDrag = () => {
//       isDragging = false;
//     };

//     document.addEventListener("mouseup", stopDrag);
//     document.addEventListener("mouseleave", stopDrag);
//   };

//   // 如果 DOM 已加载完成，立即初始化；否则等待 DOMContentLoaded
//   if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", init);
//   } else {
//     init();
//   }
// })();
// 隐藏滚动条但保留滚动功能
(function hideScrollbarButAllowScrolling() {
  // 创建 <style> 元素
  const style = document.createElement("style");
  style.textContent = `
    /* 隐藏滚动条 - Webkit 浏览器 (Chrome, Safari, Edge) */
    html::-webkit-scrollbar {
      display: none;
    }

    /* Firefox */
    html {
      scrollbar-width: none; /* 'none' 表示无滚动条 */
    }

    /* IE/旧版 Edge */
    html {
      -ms-overflow-style: none;
    }

    /* 确保页面仍可滚动 */
    html {
      overflow: auto;
    }
  `;

  // 将样式插入到 <head> 中
  document.head.appendChild(style);
})();
(function () {
  // 等待 DOM 加载完成
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createAndInit);
  } else {
    createAndInit();
  }

  function createAndInit() {
    // 创建 canvas 元素
    const canvas = document.createElement("canvas");
    canvas.width = 3840;
    canvas.height = 2160;
    canvas.border = "1px solid red";
    canvas.background = "transparent";
    const style = canvas.style;
    style.display = "block";
    style.position = "fixed";
    style.top = "0";
    style.left = "0";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.alignItems = "center";
    container.style.height = "100vh";
    container.style.margin = "0";
    container.style.background = "transparent";
    container.appendChild(canvas);
    document.body.appendChild(container);

    const ctx = canvas.getContext("2d");

    // 轨迹点数据
    const points = [
      // { x: 900, y: 2053 }, //更衣
      // { x: 900, y: 1940 },
      { x: 1231, y: 1982 },

      { x: 1231, y: 1813 },
      { x: 1384, y: 1813 },

      { x: 1384, y: 1978 }, // 产线1
      { x: 3343, y: 1978 },
      { x: 3343, y: 1510 },
      { x: 3445, y: 1510 },
      { x: 3445, y: 361 },

      { x: 979, y: 361 }, // 产线2
      { x: 979, y: 451 },
      { x: 847, y: 451 },

      { x: 847, y: 235 }, // 三防漆
      { x: 817, y: 235 },
      { x: 817, y: 682 },

      { x: 733, y: 682 }, // 成品
      { x: 733, y: 811 },
      { x: 616, y: 811 },
      { x: 616, y: 1000 },
      { x: 541, y: 1000 },

      { x: 541, y: 511 }, // dip
      { x: 97, y: 511 },
      { x: 97, y: 649 },
      { x: 409, y: 649 },
      { x: 409, y: 541 },
      { x: 511, y: 541 },

      { x: 511, y: 1468 }, // iqc
      { x: 934, y: 1468 },

      { x: 934, y: 710 }, // 电子料
      { x: 1384, y: 710 },
      { x: 1384, y: 1760 },

      { x: 1163, y: 1760 }, // 回来
      { x: 1163, y: 1950 },
      // { x: 876, y: 1760 },
      // { x: 876, y: 2053 },
    ];

    // 工具函数
    function distance(p1, p2) {
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    const segmentLengths = [];
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const len = distance(points[i], points[i + 1]);
      segmentLengths.push(len);
      totalLength += len;
    }

    function getPointAtProgress(prog) {
      let traveled = 0;
      for (let i = 0; i < segmentLengths.length; i++) {
        if (traveled + segmentLengths[i] >= prog) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const segmentProg = (prog - traveled) / segmentLengths[i];
          return {
            x: p1.x + (p2.x - p1.x) * segmentProg,
            y: p1.y + (p2.y - p1.y) * segmentProg,
          };
        }
        traveled += segmentLengths[i];
      }
      return { x: points[0].x, y: points[0].y };
    }

    function drawArrow(x, y, angle) {
      const headLength = 30;
      ctx.fillStyle = "#FEF919";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - headLength * Math.cos(angle - Math.PI / 6),
        y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x - headLength * Math.cos(angle + Math.PI / 6),
        y - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    function drawSegmentWithArrow(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;

      const ux = dx / len;
      const uy = dy / len;
      const gap = 10;

      const startX = p1.x + ux * gap;
      const startY = p1.y + uy * gap;
      const endX = p2.x - ux * gap;
      const endY = p2.y - uy * gap;

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.setLineDash([15, 10]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      drawArrow(p2.x, p2.y, Math.atan2(dy, dx));
    }

    const visitorSize = 64;

    // --------- 多参观者设置 ---------
    const visitorUrl =
      "https://fastly.jsdelivr.net/gh/yw738/static/visitor.svg";

    const visitors = [
      { img: new Image(), progress: 0, speed: 2.2 },
      { img: new Image(), progress: 1000, speed: 2.2 },
      { img: new Image(), progress: 2000, speed: 2.2 },

      { img: new Image(), progress: 3000, speed: 2.2 },
      { img: new Image(), progress: 4000, speed: 2.2 },

      { img: new Image(), progress: 5000, speed: 2.2 },
      { img: new Image(), progress: 7000, speed: 2.2 },
      { img: new Image(), progress: 9000, speed: 2.2 },
      { img: new Image(), progress: 11000, speed: 2.2 },
      { img: new Image(), progress: 13000, speed: 2.2 },
    ];
    let visitorUrls = [
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user00.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0001.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0002.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0003.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0004.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0005.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0006.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0007.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0008.png",
      "https://fastly.jsdelivr.net/gh/yw738/scs_pkgnode/img/user0009.png",
    ];
    visitors.forEach((v, i) => (v.img.src = visitorUrls[i] || visitorUrl));
    // 在轨迹起点与终点标注
    function drawStartEndLabels() {
      const start = points[0];
      const end = points[points.length - 1];

      ctx.font = "22px Arial";
      ctx.fillStyle = "#FEF919";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const startOffset = { x: 0, y: 40 }; // ← 开始点偏移
      const endOffset = { x: 0, y: 40 }; // ← 结束点偏移
      // 开始点
      ctx.beginPath();
      ctx.arc(
        start.x + startOffset.x,
        start.y + startOffset.y,
        30,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText("开始", start.x + startOffset.x, start.y + startOffset.y);


      // 结束点
      ctx.beginPath();
      ctx.arc(end.x + endOffset.x, end.y + endOffset.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText("结束", end.x + endOffset.x, end.y + endOffset.y);

    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStartEndLabels(); // ← 在这里调用（新增）
      // 绘制所有轨迹线段
      for (let i = 0; i < points.length - 1; i++) {
        drawSegmentWithArrow(points[i], points[i + 1]);
      }

      // 绘制所有参观者
      visitors.forEach((v) => {
        const pos = getPointAtProgress(v.progress);
        if (v.img.complete) {
          ctx.drawImage(
            v.img,
            pos.x - visitorSize / 2,
            pos.y - visitorSize / 2,
            visitorSize,
            visitorSize
          );
        }
        v.progress += v.speed;
        if (v.progress > totalLength) v.progress = 0;
      });

      requestAnimationFrame(draw);
    }

    // 等图片加载完成后开始动画
    const allLoaded = visitors.map((v) => v.img);
    let loadedCount = 0;
    allLoaded.forEach((img) => {
      if (img.complete) loadedCount++;
      else
        img.onload = () => {
          loadedCount++;
          if (loadedCount === allLoaded.length) draw();
        };
    });
    if (loadedCount === allLoaded.length) draw();
  }
})();
