class PrivySVG {
  constructor() {
    this.vtracerModule = null;
    this.currentImage = null;
    this.currentSVG = null;
    this.isLoading = false;
    this.isConverting = false;
    this.debounceTimer = null;
    
    this.init();
  }

  async init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async () => {
        await this.initializeApp();
      });
    } else {
      await this.initializeApp();
    }
  }

  async initializeApp() {
    this.bindEvents();
    this.checkBrowserCompatibility();
    await this.loadVTracerModule();
    this.showInitialModals();
  }

  bindEvents() {
    this.bindUploadEvents();
    this.bindConfigEvents();
    this.bindExportEvents();
    this.bindPreviewEvents();
  }

  bindUploadEvents() {
    // 上传区域点击事件
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
      });

      // 拖拽事件
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // 文件选择事件
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFile(e.target.files[0]);
        }
      });
    }

    // 剪贴板粘贴事件
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          this.handleFile(file);
          break;
        }
      }
    });
  }

  bindConfigEvents() {
    // 配置参数事件
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateRangeValue(e.target);
        this.debounceConvert();
      });
    });

    // 路径模式卡片事件
    const pathModeCards = document.querySelectorAll('.path-mode-card');
    pathModeCards.forEach(card => {
      card.addEventListener('click', () => {
        // 移除所有卡片的active类
        pathModeCards.forEach(c => c.classList.remove('active'));
        // 添加当前卡片的active类
        card.classList.add('active');
        // 更新隐藏的input值
        const pathModeInput = document.getElementById('pathModeInput');
        if (pathModeInput) {
          pathModeInput.value = card.dataset.value;
          // 触发转换
          this.debounceConvert();
        }
      });
    });

    // 预设按钮事件
    const presetHigh = document.getElementById('presetHigh');
    const presetBalanced = document.getElementById('presetBalanced');
    const presetFast = document.getElementById('presetFast');
    
    if (presetHigh) presetHigh.addEventListener('click', () => this.applyPreset('high'));
    if (presetBalanced) presetBalanced.addEventListener('click', () => this.applyPreset('balanced'));
    if (presetFast) presetFast.addEventListener('click', () => this.applyPreset('fast'));

    // 配置面板折叠事件（移动端）
    const configHeader = document.getElementById('configHeader');
    if (configHeader) {
      configHeader.addEventListener('click', () => {
        const configContent = document.getElementById('configContent');
        if (configContent) {
          configContent.classList.toggle('collapsed');
          configHeader.classList.toggle('collapsed');
        }
      });
    }
  }

  bindExportEvents() {
    // 导出按钮事件
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    
    if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadSVG());
    if (copyBtn) copyBtn.addEventListener('click', () => this.copySVGCode());
  }

  bindPreviewEvents() {
    // SVG预览区域缩放和平移
    const svgPreviewContainer = document.getElementById('svgPreviewContainer');
    if (svgPreviewContainer) {
      let isDragging = false;
      let startX, startY, scrollLeft, scrollTop;

      svgPreviewContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - svgPreviewContainer.offsetLeft;
        startY = e.pageY - svgPreviewContainer.offsetTop;
        scrollLeft = svgPreviewContainer.scrollLeft;
        scrollTop = svgPreviewContainer.scrollTop;
      });

      svgPreviewContainer.addEventListener('mouseleave', () => {
        isDragging = false;
      });

      svgPreviewContainer.addEventListener('mouseup', () => {
        isDragging = false;
      });

      svgPreviewContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - svgPreviewContainer.offsetLeft;
        const y = e.pageY - svgPreviewContainer.offsetTop;
        const walkX = (x - startX) * 2;
        const walkY = (y - startY) * 2;
        svgPreviewContainer.scrollLeft = scrollLeft - walkX;
        svgPreviewContainer.scrollTop = scrollTop - walkY;
      });

      svgPreviewContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoom = e.deltaY > 0 ? 0.9 : 1.1;
        const svg = document.querySelector('#svgPreview svg');
        const zoomInfo = document.getElementById('zoomInfo');
        if (svg) {
          const currentScale = parseFloat(svg.style.transform.replace('scale(', '')) || 1;
          const newScale = Math.max(0.1, Math.min(5, currentScale * zoom));
          svg.style.transform = `scale(${newScale})`;
          if (zoomInfo) {
            zoomInfo.textContent = `${Math.round(newScale * 100)}%`;
          }
        }
      });
    }
  }

  checkBrowserCompatibility() {
    console.log('WebAssembly object:', WebAssembly);
    console.log('typeof WebAssembly:', typeof WebAssembly);
    const compatibilityModal = document.getElementById('compatibilityModal');
    if (compatibilityModal) {
      if (typeof WebAssembly === 'undefined') {
        console.log('WebAssembly is undefined, showing compatibility modal');
        compatibilityModal.style.display = 'flex';
      } else {
        console.log('WebAssembly is supported, hiding compatibility modal');
        compatibilityModal.style.display = 'none';
      }
    }
  }

  async loadVTracerModule() {
    try {
      // 这里使用模拟的VTracer模块，实际项目中需要替换为真实的Wasm模块
      // const { default: initVTracer } = await import('./pkg/vtracer_web.js');
      // this.vtracerModule = await initVTracer();
      
      // 模拟加载过程（后台静默加载）
      await new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
      
      console.log('VTracer模块加载完成');
    } catch (error) {
      console.error('加载VTracer模块失败:', error);
      this.showError('加载转换引擎失败，请刷新页面重试');
    }
  }

  showInitialModals() {
    // 不再显示隐私和引导弹框
  }

  handleFile(file) {
    if (!file.type.match('image.*')) {
      this.showError('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showError('文件大小不能超过10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 2000 || img.height > 2000) {
          this.showError('图片分辨率不能超过2000x2000');
          return;
        }

        this.currentImage = img;
        this.displayOriginalImage(img);
        this.convertImage();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }



  displayOriginalImage(img) {
    const originalImage = document.getElementById('originalImage');
    const imageInfo = document.getElementById('imageInfo');
    const emptyState = document.getElementById('originalEmptyState');
    
    // 隐藏空状态，显示图片
    if (emptyState) {
      emptyState.style.display = 'none';
    }
    if (originalImage) {
      originalImage.style.display = 'block';
      originalImage.src = img.src;
    }
    if (imageInfo) {
      imageInfo.textContent = `${img.width} × ${img.height}`;
    }
  }

  updateRangeValue(input) {
    const valueElement = document.getElementById(`${input.id}Value`);
    if (valueElement) {
      if (input.id === 'cornerThreshold') {
        valueElement.textContent = `${input.value}°`;
      } else {
        valueElement.textContent = input.value;
      }
    }
  }

  applyPreset(preset) {
    let pathModeValue;
    switch (preset) {
      case 'high':
        document.getElementById('colorPrecision').value = 8;
        document.getElementById('filterSpeckles').value = 2;
        document.getElementById('gradientStep').value = 16;
        pathModeValue = 'spline';
        break;
      case 'balanced':
        document.getElementById('colorPrecision').value = 6;
        document.getElementById('filterSpeckles').value = 4;
        document.getElementById('gradientStep').value = 16;
        pathModeValue = 'spline';
        break;
      case 'fast':
        document.getElementById('colorPrecision').value = 4;
        document.getElementById('filterSpeckles').value = 10;
        document.getElementById('gradientStep').value = 32;
        pathModeValue = 'polygon';
        break;
    }

    // 更新路径模式卡片选中状态
    if (pathModeValue) {
      document.getElementById('pathModeInput').value = pathModeValue;
      const pathModeCards = document.querySelectorAll('.path-mode-card');
      pathModeCards.forEach(card => {
        card.classList.remove('active');
        if (card.dataset.value === pathModeValue) {
          card.classList.add('active');
        }
      });
    }

    // 更新显示值
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
      this.updateRangeValue(input);
    });

    this.convertImage();
  }

  getConfig() {
    return {
      colorMode: document.querySelector('input[name="colorMode"]:checked').value,
      pathMode: document.getElementById('pathModeInput').value,
      colorPrecision: parseInt(document.getElementById('colorPrecision').value),
      filterSpeckles: parseInt(document.getElementById('filterSpeckles').value),
      gradientStep: parseInt(document.getElementById('gradientStep').value),
      cornerThreshold: parseInt(document.getElementById('cornerThreshold').value),
      segmentLength: parseFloat(document.getElementById('segmentLength').value),
      pathPrecision: parseInt(document.getElementById('pathPrecision').value)
    };
  }

  debounceConvert() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.convertImage();
    }, 300);
  }

  async convertImage() {
    console.log('convertImage called, currentImage:', this.currentImage);
    console.log('convertImage called, isConverting:', this.isConverting);
    if (!this.currentImage || this.isConverting) {
      console.log('convertImage returning early because currentImage is', this.currentImage, 'or isConverting is', this.isConverting);
      return;
    }

    console.log('convertImage proceeding, showing conversion modal');
    this.showConversion();
    
    try {
      // 模拟转换过程
      await new Promise(resolve => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          this.updateConversionProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 150);
      });

      // 获取配置
      const config = this.getConfig();
      // 生成基于原图的SVG
      const svg = this.generateSVGFromImage(this.currentImage, config);
      this.currentSVG = svg;
      this.displaySVG(svg);
      this.enableExportButtons();
    } catch (error) {
      console.error('转换失败:', error);
      this.showError('转换失败，请重试');
    } finally {
      this.hideConversion();
    }
  }

  generateSVGFromImage(img, config) {
    // 创建Canvas元素
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // 绘制图片到Canvas
    ctx.drawImage(img, 0, 0);
    
    // 获取图片数据
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // 生成SVG
    let svg = `<svg width="${img.width}" height="${img.height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // 根据路径模式生成不同的SVG元素
    if (config.pathMode === 'spline') {
      // 样条模式：使用平滑的曲线路径
      svg += this.generateSplinePaths(data, img.width, img.height, config);
    } else if (config.pathMode === 'polygon') {
      // 多边形模式：使用直线段组成的多边形
      svg += this.generatePolygonPaths(data, img.width, img.height, config);
    } else if (config.pathMode === 'pixel') {
      // 像素模式：使用矩形像素块
      svg += this.generatePixelRects(data, img.width, img.height, config);
    } else {
      // 默认使用样条模式
      svg += this.generateSplinePaths(data, img.width, img.height, config);
    }
    
    svg += `</svg>`;
    return svg;
  }

  generatePixelRects(data, width, height, config) {
    let elements = '';
    const step = 16 - config.colorPrecision; // 根据色彩精度调整像素块大小
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        
        if (a > 128) {
          let color;
          if (config.colorMode === 'bw') {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            color = `rgb(${gray}, ${gray}, ${gray})`;
          } else {
            // 根据色彩精度调整颜色
            const precision = Math.pow(2, 8 - config.colorPrecision);
            const adjustedR = Math.round(r / precision) * precision;
            const adjustedG = Math.round(g / precision) * precision;
            const adjustedB = Math.round(b / precision) * precision;
            color = `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
          }
          // 像素模式：使用明显的方块
          elements += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${color}" />`;
        }
      }
    }
    return elements;
  }

  generatePolygonPaths(data, width, height, config) {
    let elements = '';
    const step = Math.max(5, 15 - config.colorPrecision); // 根据色彩精度调整网格大小
    
    for (let y = 0; y < height - step; y += step) {
      for (let x = 0; x < width - step; x += step) {
        // 获取区域中心的颜色
        const centerX = x + step / 2;
        const centerY = y + step / 2;
        const idx = (Math.floor(centerY) * width + Math.floor(centerX)) * 4;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a > 128) {
          let color;
          if (config.colorMode === 'bw') {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            color = `rgb(${gray}, ${gray}, ${gray})`;
          } else {
            // 根据色彩精度调整颜色
            const precision = Math.pow(2, 8 - config.colorPrecision);
            const adjustedR = Math.round(r / precision) * precision;
            const adjustedG = Math.round(g / precision) * precision;
            const adjustedB = Math.round(b / precision) * precision;
            color = `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
          }
          
          // 多边形模式：使用三角形产生棱角分明的效果
          // 交替使用两种三角形方向产生锯齿感
          if ((x / step + y / step) % 2 === 0) {
            // 左上到右下的三角形
            elements += `<polygon points="${x},${y} ${x + step},${y} ${x},${y + step}" fill="${color}" />`;
          } else {
            // 右下到左上的三角形
            elements += `<polygon points="${x + step},${y} ${x + step},${y + step} ${x},${y + step}" fill="${color}" />`;
          }
        }
      }
    }
    return elements;
  }

  generateSplinePaths(data, width, height, config) {
    let elements = '';
    const step = Math.max(4, 10 - config.colorPrecision); // 根据色彩精度调整步长
    
    // 使用网格生成平滑的曲线填充区域
    for (let y = 0; y < height - step; y += step) {
      for (let x = 0; x < width - step; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a > 128) {
          let color;
          if (config.colorMode === 'bw') {
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            color = `rgb(${gray}, ${gray}, ${gray})`;
          } else {
            // 根据色彩精度调整颜色
            const precision = Math.pow(2, 8 - config.colorPrecision);
            const adjustedR = Math.round(r / precision) * precision;
            const adjustedG = Math.round(g / precision) * precision;
            const adjustedB = Math.round(b / precision) * precision;
            color = `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
          }
          
          // 样条模式：使用圆角矩形产生平滑效果
          const radius = step * 0.3; // 圆角半径
          elements += `<rect x="${x}" y="${y}" width="${step}" height="${step}" rx="${radius}" ry="${radius}" fill="${color}" />`;
        }
      }
    }
    return elements;
  }

  displaySVG(svg) {
    const svgPreview = document.getElementById('svgPreview');
    if (!svgPreview) return;
    
    // 使用DOMParser解析SVG字符串
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // 获取原始图片尺寸
    if (this.currentImage) {
      const width = this.currentImage.width;
      const height = this.currentImage.height;
      
      // 设置/覆盖viewBox和宽高属性
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElement.setAttribute('width', '100%');
      svgElement.setAttribute('height', '100%');
      
      // 序列化回字符串
      const fixedSvgString = new XMLSerializer().serializeToString(svgElement);
      svgPreview.innerHTML = fixedSvgString;
    } else {
      svgPreview.innerHTML = svg;
    }
    
    // 重置缩放信息
    const zoomInfo = document.getElementById('zoomInfo');
    if (zoomInfo) {
      zoomInfo.textContent = '100%';
    }
    
    const previewSvg = svgPreview.querySelector('svg');
    if (previewSvg) {
      previewSvg.style.transform = 'scale(1)';
    }
  }



  enableExportButtons() {
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    if (downloadBtn) downloadBtn.disabled = false;
    if (copyBtn) copyBtn.disabled = false;
  }

  downloadSVG() {
    if (!this.currentSVG) return;

    const blob = new Blob([this.currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    
    a.href = url;
    a.download = `vtracer_${timestamp}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async copySVGCode() {
    if (!this.currentSVG) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // 使用现代剪贴板API
        await navigator.clipboard.writeText(this.currentSVG);
        this.showCopySuccess();
      } else {
        // 降级方案：使用传统的execCommand方法
        this.fallbackCopyTextToClipboard(this.currentSVG);
      }
    } catch (error) {
      console.error('复制失败:', error);
      this.showError('复制失败，请手动复制');
    }
  }

  showCopySuccess() {
    const copySuccess = document.getElementById('copySuccess');
    if (copySuccess) {
      copySuccess.classList.add('show');
      setTimeout(() => {
        copySuccess.classList.remove('show');
      }, 2000);
    }
  }

  fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.showCopySuccess();
      } else {
        throw new Error('复制命令执行失败');
      }
    } catch (error) {
      console.error('降级复制失败:', error);
      this.showError('复制失败，请手动复制');
    } finally {
      document.body.removeChild(textArea);
    }
  }





  showConversion() {
    this.isConverting = true;
    const conversionOverlay = document.getElementById('conversionOverlay');
    if (conversionOverlay) {
      conversionOverlay.style.display = 'flex';
    }
  }

  hideConversion() {
    this.isConverting = false;
    const conversionOverlay = document.getElementById('conversionOverlay');
    if (conversionOverlay) {
      conversionOverlay.style.display = 'none';
    }
  }

  updateConversionProgress(progress) {
    const conversionBar = document.getElementById('conversionBar');
    if (conversionBar) {
      conversionBar.style.width = `${progress}%`;
    }
  }

  showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
      
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 3000);
    }
  }
}

// 初始化应用
new PrivySVG();