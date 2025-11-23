/**
 * Claude 模型类
 */
class Claude extends AIModel {
  static NAME = 'Claude';
  static URL = 'https://claude.ai';
  static ICON = 'icons/claude.png';
  static I18N_KEY = null;

  constructor() {
    super('Claude', 'claude.ai');
  }

  getInputSelector() {
    return 'div[data-testid="chat-input"][contenteditable="true"]';
  }

  getSendButtonSelector() {
    return 'button[aria-label="Send message"]';
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const btn = await this.waitForElement(this.getSendButtonSelector());
    if (btn) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not found`);
    }
    
    return true;
  }


  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Claude();
    return await instance.sendQuery(query);
  }
}

