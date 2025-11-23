/**
 * ChatGPT 模型类
 */
class ChatGPT extends AIModel {
  constructor() {
    super('ChatGPT', 'chatgpt.com');
  }

  getInputSelector() {
    return 'div#prompt-textarea[contenteditable="true"]';
  }

  getSendButtonSelector() {
    return 'button#composer-submit-button';
  }

  async sendQuery(query) {
    console.log(`[MultiAI] ${this.name} - waiting for input...`);
    
    const el = await this.waitForElement(this.getInputSelector());
    if (!el) {
      console.log(`[MultiAI] ${this.name} input not found after waiting`);
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found, setting text...`);
    this.setContentEditable(el, query);
    console.log(`[MultiAI] ${this.name} text set:`, query);
    
    // 等待发送按钮出现并激活
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const btn = await this.waitForElement(this.getSendButtonSelector());
    if (btn) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not ready`);
    }
    
    return true;
  }

  /**
   * 静态方法：获取平台信息
   * @returns {{name: string, url: string}}
   */
  static getSiteInfo() {
    return {
      name: 'ChatGPT',
      url: 'https://chatgpt.com'
    };
  }

  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new ChatGPT();
    return await instance.sendQuery(query);
  }
}

