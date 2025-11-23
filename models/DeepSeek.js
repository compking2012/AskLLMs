/**
 * DeepSeek 模型类
 */
class DeepSeek extends AIModel {
  static NAME = 'DeepSeek';
  static URL = 'https://chat.deepseek.com';
  static ICON = 'icons/deepseek.png';
  static I18N_KEY = null;

  constructor() {
    super('DeepSeek', 'deepseek.com');
  }

  getInputSelector() {
    return ['textarea[class*="ds-"]', 'textarea[placeholder*="消息"]', 'textarea[placeholder*="Message"]', 'textarea'];
  }

  getSendButtonSelector() {
    return [
      'button[class*="ds-"][class*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]'
    ];
  }

  async sendQuery(query) {
    console.log(`[MultiAI] ${this.name} - waiting for input...`);
    
    const selectors = Array.isArray(this.getInputSelector()) 
      ? this.getInputSelector() 
      : [this.getInputSelector()];
    
    let el = null;
    for (const selector of selectors) {
      el = await this.waitForElement(selector);
      if (el) break;
    }
    
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
    this.setTextarea(el, query);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试多种方式查找按钮
    let btn = this.findSendButton(this.getSendButtonSelector());
    
    if (!btn) {
      btn = this.findSendButtonByKeywords(['send', 'submit', '发送']);
    }
    
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not found or disabled, trying Enter key`);
      this.simulateEnterKey(el);
      console.log(`[MultiAI] ${this.name} sent via Enter ✓`);
    }
    
    return true;
  }


  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new DeepSeek();
    return await instance.sendQuery(query);
  }
}

