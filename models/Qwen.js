/**
 * 千问模型类
 */
class Qwen extends AIModel {
  constructor() {
    super('千问', 'www.qianwen.com');
  }

  getInputSelector() {
    return 'div.text-area-slot-container textarea';
  }

  getSendButtonSelector() {
    return ['div[class*="operateBtn"]'];
  }

  async sendQuery(query) {
    console.log(`[MultiAI] ${this.name} - waiting for input...`);
    
    const el = await this.waitForElement(this.getInputSelector());
    if (!el) {
      console.log(`[MultiAI] ${this.name} input not found after waiting`);
      const allTextareas = document.querySelectorAll('textarea');
      console.log(`[MultiAI] ${this.name} found textareas:`, allTextareas.length);
      allTextareas.forEach((ta, i) => {
        console.log(`  [${i}] placeholder: "${ta.placeholder}", class: "${ta.className}"`);
      });
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found:`, el.placeholder);
    
    // 聚焦
    el.focus();
    el.click();
    
    // 设置值 - 使用原生setter触发React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, query);
    
    // 触发多种事件
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    console.log(`[MultiAI] ${this.name} text set:`, query);
    
    // 等待更长时间让按钮激活
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 尝试找发送按钮
    let btn = document.querySelector('div[class*="operateBtn"]');
    
    // 如果没找到，通过 span.anticon 找到父级 div
    if (!btn) {
      const iconSpan = document.querySelector('span.anticon');
      if (iconSpan && iconSpan.parentElement && iconSpan.parentElement.tagName === 'DIV') {
        btn = iconSpan.parentElement;
      }
    }
    
    console.log(`[MultiAI] ${this.name} button found:`, !!btn, 'tag:', btn?.tagName, 'class:', btn?.className);
    
    if (btn) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not found`);
    }
    
    return true;
  }

  /**
   * 静态方法：获取平台信息
   * @returns {{name: string, url: string}}
   */
  static getSiteInfo() {
    return {
      name: '千问',
      url: 'https://www.qianwen.com'
    };
  }

  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Qwen();
    return await instance.sendQuery(query);
  }
}

