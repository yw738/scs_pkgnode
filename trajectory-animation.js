// trajectory-animation.js

(function () {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createAndInit);
    } else {
      createAndInit();
    }
  
    function createAndInit() {
      // 创建 canvas 元素
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.background= "transparent";
      // 设置样式（居中等效于原 CSS）
      const style = canvas.style;
      style.display = 'block';
      style.position = 'fixed';
      style.top = '0';
      style.left = '0';
  
      // 创建一个容器 div 用于居中（可选，也可直接用 body flex）
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      container.style.height = '100vh';
      container.style.margin = '0';
      container.style.background = 'transparent';
        container.appendChild(canvas);
      document.body.appendChild(container);
  
      // 获取上下文
      const ctx = canvas.getContext('2d');
  
      // 轨迹点数据
      const points = [
        {x:50, y:550},  
        {x:150, y:500},
        {x:300, y:450},
        {x:500, y:400},
        {x:650, y:300},
        {x:700, y:200},
        {x:650, y:100},
        {x:400, y:150},
        {x:200, y:200},
        {x:100, y:300},
        {x:50, y:550}   
      ];
  
      // 工具函数：计算两点距离
      function distance(p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
      }
  
      // 预计算每段长度
      const segmentLengths = [];
      let totalLength = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const len = distance(points[i], points[i + 1]);
        segmentLengths.push(len);
        totalLength += len;
      }
  
      // 根据进度获取位置
      function getPointAtProgress(prog) {
        let traveled = 0;
        for (let i = 0; i < segmentLengths.length; i++) {
          if (traveled + segmentLengths[i] >= prog) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const segmentProg = (prog - traveled) / segmentLengths[i];
            return {
              x: p1.x + (p2.x - p1.x) * segmentProg,
              y: p1.y + (p2.y - p1.y) * segmentProg
            };
          }
          traveled += segmentLengths[i];
        }
        return { x: points[0].x, y: points[0].y };
      }
  
      // 绘制箭头
      function drawArrow(x, y, angle) {
        const headLength = 12;
        ctx.fillStyle = 'red';
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
  
      // 绘制带间隔和箭头的线段
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
  
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 10]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
  
        drawArrow(p2.x, p2.y, Math.atan2(dy, dx));
      }
  
      // 加载参观者图像
      const visitorImg = new Image();
      visitorImg.src = 'https://fastly.jsdelivr.net/gh/yw738/static/visitor.svg'; // 可替换为在线 URL，如 'https://example.com/visitor.svg'
      
      const visitorSize = 64;
      let progress = 0;
      const speed = 2;
  
      // 动画主循环
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
  
        // 绘制所有轨迹线段
        for (let i = 0; i < points.length - 1; i++) {
          drawSegmentWithArrow(points[i], points[i + 1]);
        }
  
        // 绘制移动的参观者
        const pos = getPointAtProgress(progress);
        if (visitorImg.complete) {
          ctx.drawImage(visitorImg, pos.x - visitorSize / 2, pos.y - visitorSize / 2, visitorSize, visitorSize);
        }
  
        progress += speed;
        if (progress > totalLength) progress = 0;
  
        requestAnimationFrame(draw);
      }
  
      // 图片加载完成后开始动画
      if (visitorImg.complete) {
        draw();
      } else {
        visitorImg.onload = draw;
      }
    }
  })();