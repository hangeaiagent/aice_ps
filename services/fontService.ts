/**
 * 字体服务 - 管理OpenDyslexic和其他阅读友好字体
 */

export interface FontConfig {
  name: string;
  displayName: string;
  cssClass: string;
  description: string;
  isAccessible: boolean;
  loadUrl?: string;
}

export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  fontWeight: 'normal' | 'bold';
}

class FontService {
  private loadedFonts: Set<string> = new Set();
  private fontConfigs: FontConfig[] = [
    {
      name: 'OpenDyslexic',
      displayName: 'OpenDyslexic (阅读障碍友好)',
      cssClass: 'dyslexic-font',
      description: '专为阅读障碍者设计的字体，字母底部较重，有助于防止字母翻转',
      isAccessible: true,
      loadUrl: 'https://fonts.googleapis.com/css2?family=OpenDyslexic:wght@400;700&display=swap'
    },
    {
      name: 'Comic Sans MS',
      displayName: 'Comic Sans MS (儿童友好)',
      cssClass: 'comic-font',
      description: '轻松友好的字体，适合儿童阅读',
      isAccessible: true
    },
    {
      name: 'Trebuchet MS',
      displayName: 'Trebuchet MS (清晰易读)',
      cssClass: 'trebuchet-font',
      description: '清晰的无衬线字体，易于阅读',
      isAccessible: true
    },
    {
      name: 'Verdana',
      displayName: 'Verdana (高可读性)',
      cssClass: 'verdana-font',
      description: '专为屏幕阅读优化的字体',
      isAccessible: true
    },
    {
      name: 'Arial',
      displayName: 'Arial (标准字体)',
      cssClass: 'arial-font',
      description: '标准无衬线字体',
      isAccessible: false
    }
  ];

  /**
   * 获取所有可用字体配置
   */
  getAvailableFonts(): FontConfig[] {
    return this.fontConfigs;
  }

  /**
   * 获取阅读友好字体
   */
  getAccessibleFonts(): FontConfig[] {
    return this.fontConfigs.filter(font => font.isAccessible);
  }

  /**
   * 根据名称获取字体配置
   */
  getFontConfig(fontName: string): FontConfig | undefined {
    return this.fontConfigs.find(font => font.name === fontName);
  }

  /**
   * 加载字体
   */
  async loadFont(fontName: string): Promise<boolean> {
    const fontConfig = this.getFontConfig(fontName);
    if (!fontConfig) {
      console.warn(`未找到字体配置: ${fontName}`);
      return false;
    }

    // 如果字体已加载，直接返回成功
    if (this.loadedFonts.has(fontName)) {
      return true;
    }

    // 如果没有加载URL，说明是系统字体
    if (!fontConfig.loadUrl) {
      this.loadedFonts.add(fontName);
      return true;
    }

    try {
      // 动态加载字体
      await this.loadFontFromUrl(fontConfig.loadUrl);
      this.loadedFonts.add(fontName);
      return true;
    } catch (error) {
      console.error(`加载字体失败: ${fontName}`, error);
      return false;
    }
  }

  /**
   * 从URL加载字体
   */
  private async loadFontFromUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查是否已存在相同的link标签
      const existingLink = document.querySelector(`link[href="${url}"]`);
      if (existingLink) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      
      link.onload = () => {
        resolve();
      };
      
      link.onerror = () => {
        reject(new Error(`Failed to load font from ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 检查字体是否已加载
   */
  isFontLoaded(fontName: string): boolean {
    return this.loadedFonts.has(fontName);
  }

  /**
   * 应用字体到元素
   */
  applyFontToElement(element: HTMLElement, fontSettings: FontSettings): void {
    const fontConfig = this.getFontConfig(fontSettings.fontFamily);
    
    if (fontConfig) {
      // 移除所有字体类
      this.fontConfigs.forEach(config => {
        element.classList.remove(config.cssClass);
      });
      
      // 添加新的字体类
      element.classList.add(fontConfig.cssClass);
    }

    // 应用字体样式
    element.style.fontSize = `${fontSettings.fontSize}px`;
    element.style.lineHeight = fontSettings.lineHeight.toString();
    element.style.letterSpacing = `${fontSettings.letterSpacing}em`;
    element.style.wordSpacing = `${fontSettings.wordSpacing}em`;
    element.style.fontWeight = fontSettings.fontWeight;
  }

  /**
   * 创建字体设置
   */
  createFontSettings(
    fontFamily: string = 'OpenDyslexic',
    fontSize: number = 16,
    options: Partial<FontSettings> = {}
  ): FontSettings {
    return {
      fontFamily,
      fontSize,
      lineHeight: options.lineHeight || 1.6,
      letterSpacing: options.letterSpacing || 0.05,
      wordSpacing: options.wordSpacing || 0.1,
      fontWeight: options.fontWeight || 'normal'
    };
  }

  /**
   * 获取推荐的字体设置（基于用户需求）
   */
  getRecommendedSettings(userType: 'dyslexic' | 'child' | 'standard'): FontSettings {
    switch (userType) {
      case 'dyslexic':
        return this.createFontSettings('OpenDyslexic', 18, {
          lineHeight: 1.8,
          letterSpacing: 0.08,
          wordSpacing: 0.15
        });
      
      case 'child':
        return this.createFontSettings('Comic Sans MS', 16, {
          lineHeight: 1.6,
          letterSpacing: 0.05,
          wordSpacing: 0.1
        });
      
      default:
        return this.createFontSettings('Arial', 14, {
          lineHeight: 1.5,
          letterSpacing: 0.02,
          wordSpacing: 0.05
        });
    }
  }

  /**
   * 测试字体可用性
   */
  async testFontAvailability(fontName: string): Promise<boolean> {
    // 创建测试元素
    const testElement = document.createElement('div');
    testElement.style.fontFamily = fontName;
    testElement.style.fontSize = '16px';
    testElement.textContent = 'Test';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.top = '-9999px';
    
    document.body.appendChild(testElement);

    // 测试字体是否生效
    const computedStyle = window.getComputedStyle(testElement);
    const actualFontFamily = computedStyle.fontFamily;
    
    document.body.removeChild(testElement);

    return actualFontFamily.includes(fontName);
  }

  /**
   * 获取字体加载状态
   */
  getFontLoadStatus(): { [fontName: string]: boolean } {
    const status: { [fontName: string]: boolean } = {};
    this.fontConfigs.forEach(font => {
      status[font.name] = this.loadedFonts.has(font.name);
    });
    return status;
  }

  /**
   * 预加载所有阅读友好字体
   */
  async preloadAccessibleFonts(): Promise<void> {
    const accessibleFonts = this.getAccessibleFonts();
    const loadPromises = accessibleFonts.map(font => this.loadFont(font.name));
    
    try {
      await Promise.all(loadPromises);
      console.log('所有阅读友好字体已加载');
    } catch (error) {
      console.error('部分字体加载失败:', error);
    }
  }

  /**
   * 生成字体CSS规则
   */
  generateFontCSS(fontSettings: FontSettings): string {
    const fontConfig = this.getFontConfig(fontSettings.fontFamily);
    const fontFamily = fontConfig ? 
      this.getFontFamilyStack(fontConfig.name) : 
      fontSettings.fontFamily;

    return `
      font-family: ${fontFamily};
      font-size: ${fontSettings.fontSize}px;
      line-height: ${fontSettings.lineHeight};
      letter-spacing: ${fontSettings.letterSpacing}em;
      word-spacing: ${fontSettings.wordSpacing}em;
      font-weight: ${fontSettings.fontWeight};
    `;
  }

  /**
   * 获取字体族栈（包含fallback字体）
   */
  private getFontFamilyStack(fontName: string): string {
    const stacks: { [key: string]: string } = {
      'OpenDyslexic': "'OpenDyslexic', 'Comic Sans MS', 'Trebuchet MS', sans-serif",
      'Comic Sans MS': "'Comic Sans MS', 'Trebuchet MS', 'Verdana', sans-serif",
      'Trebuchet MS': "'Trebuchet MS', 'Verdana', 'Arial', sans-serif",
      'Verdana': "'Verdana', 'Arial', 'Helvetica', sans-serif",
      'Arial': "'Arial', 'Helvetica', sans-serif"
    };
    
    return stacks[fontName] || `'${fontName}', sans-serif`;
  }

  /**
   * 创建字体切换器
   */
  createFontToggle(
    targetElement: HTMLElement,
    currentFont: string,
    onFontChange: (newFont: string) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'font-toggle-container';

    const label = document.createElement('label');
    label.textContent = '字体选择：';
    label.className = 'font-toggle-label';

    const select = document.createElement('select');
    select.className = 'font-toggle-select';
    
    this.getAccessibleFonts().forEach(font => {
      const option = document.createElement('option');
      option.value = font.name;
      option.textContent = font.displayName;
      option.selected = font.name === currentFont;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const newFont = (e.target as HTMLSelectElement).value;
      onFontChange(newFont);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }
}

// 导出单例实例
export const fontService = new FontService();

// 导出默认配置
export const getDefaultFontSettings = (): FontSettings => ({
  fontFamily: 'OpenDyslexic',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0.05,
  wordSpacing: 0.1,
  fontWeight: 'normal'
});

export default FontService;