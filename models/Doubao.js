/**
 * 豆包模型类
 */
class Doubao extends AIModel {
  constructor() {
    super('豆包', 'www.doubao.com');
  }

  getInputSelector() {
    return 'textarea.semi-input-textarea';
  }

  getSendButtonSelector() {
    return 'button[id="flow-end-msg-send"]';
  }

  async sendQuery(query) {
    console.log(`[MultiAI] ${this.name} - waiting for input...`);
    
    const el = await this.waitForElement(this.getInputSelector());
    if (!el) {
      console.log(`[MultiAI] ${this.name} input not found after waiting`);
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found:`, el.placeholder);
    this.setTextarea(el, query);
    
    // 等待更长时间让按钮激活
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 查找发送按钮
    let btn = document.querySelector(this.getSendButtonSelector());
    
    console.log(`[MultiAI] ${this.name} button found:`, !!btn, 'disabled:', btn?.disabled);
    
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else if (!btn) {
      // 如果找不到按钮，尝试模拟 Enter 键
      console.log(`[MultiAI] ${this.name} button not found, trying Enter key`);
      this.simulateEnterKey(el);
      console.log(`[MultiAI] ${this.name} sent via Enter ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button disabled, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!btn.disabled) {
        btn.click();
        console.log(`[MultiAI] ${this.name} sent after retry ✓`);
      }
    }
    
    return true;
  }

  /**
   * 静态方法：获取平台信息
   * @returns {{name: string, url: string}}
   */
  static getSiteInfo() {
    return {
      name: '豆包',
      url: 'https://www.doubao.com'
    };
  }

  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Doubao();
    return await instance.sendQuery(query);
  }
}

