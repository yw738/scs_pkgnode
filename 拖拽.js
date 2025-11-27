(() => {
  // 防止重复执行
  if (window.__DRAGGABLE_CREATED__) return;
  window.__DRAGGABLE_CREATED__ = true;

  // 等待 DOM 加载完成后再执行
  const init = () => {
    // 创建可拖拽 div
    const dragDiv = document.createElement("div");
    dragDiv.textContent = "拖我";
    dragDiv.style.cssText = `
        position: absolute;
        top: 100px;
        left: 100px;
        width: 120px;
        height: 60px;
        background-color: #2196F3;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        border-radius: 6px;
        user-select: none;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
      `;
    document.body.appendChild(dragDiv);

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // 鼠标按下
    dragDiv.addEventListener("mousedown", (e) => {
      isDragging = true;
      const rect = dragDiv.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault(); // 阻止默认行为（如选中文本）
    });

    // 全局鼠标移动（处理拖拽）
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      dragDiv.style.left = `${x}px`;
      dragDiv.style.top = `${y}px`;

      // 打印当前坐标（四舍五入便于阅读）
      console.log(
        `Draggable position → x: ${Math.round(x)}, y: ${Math.round(y)}`
      );
    });

    // 鼠标松开或离开，停止拖拽
    const stopDrag = () => {
      isDragging = false;
    };

    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("mouseleave", stopDrag);
  };

  // 如果 DOM 已加载完成，立即初始化；否则等待 DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
