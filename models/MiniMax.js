/**
 * MiniMax 模型类
 */
class MiniMax extends AIModel {
  constructor() {
    super('MiniMax', 'agent.minimaxi.com');
  }

  getInputSelector() {
    return ['textarea[placeholder*="输入"]', 'textarea[placeholder*="请输入"]', 'textarea', 'div[contenteditable="true"]'];
  }

  getSendButtonSelector() {
    return [
      'button[aria-label*="发送"]',
      'button[aria-label*="Send"]',
      'button[type="submit"]',
      'button[class*="send"]'
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
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found, tag:`, el.tagName);
    
    if (el.tagName === 'TEXTAREA') {
      this.setTextarea(el, query);
    } else {
      this.setContentEditable(el, query);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试多种方式查找按钮
    let btn = this.findSendButton(this.getSendButtonSelector());
    
    if (!btn) {
      btn = this.findSendButtonByKeywords(['发送', 'send']);
    }
    
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else {
      this.simulateEnterKey(el);
      console.log(`[MultiAI] ${this.name} sent via Enter ✓`);
    }
    
    return true;
  }

  /**
   * 静态方法：获取平台信息
   * @returns {{name: string, url: string}}
   */
  static getSiteInfo() {
    return {
      name: 'MiniMax',
      url: 'https://agent.minimaxi.com'
    };
  }

  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new MiniMax();
    return await instance.sendQuery(query);
  }
}

