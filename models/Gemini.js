/**
 * Gemini 模型类
 */
class Gemini extends AIModel {
  static NAME = 'Gemini';
  static URL = 'https://gemini.google.com';
  static ICON = 'icons/gemini.png';
  static I18N_KEY = null;

  constructor() {
    super('Gemini', 'gemini.google.com');
  }

  getInputSelector() {
    return 'div.ql-editor.textarea[contenteditable="true"]';
  }

  getSendButtonSelector() {
    return 'button.send-button';
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
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not ready`);
    }
    
    return true;
  }


  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Gemini();
    return await instance.sendQuery(query);
  }
}

