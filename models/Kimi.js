/**
 * Kimi 模型类
 */
class Kimi extends AIModel {
  static NAME = 'Kimi';
  static URL = 'https://www.kimi.com';
  static ICON = 'icons/kimi.png';
  static I18N_KEY = null;

  constructor() {
    super('Kimi', 'www.kimi.com');
  }

  getInputSelector() {
    return 'div.chat-input-editor[contenteditable="true"]';
  }

  getSendButtonSelector() {
    return [
      'button.send-button'
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
    
    console.log(`[MultiAI] ${this.name} input found, tag:`, el.tagName, 'contenteditable:', el.contentEditable, 'data-lexical-editor:', el.getAttribute('data-lexical-editor'));
    
    if (el.tagName === 'TEXTAREA') {
      this.setTextarea(el, query);
    } else {
      // 使用专门的 Lexical 编辑器输入函数
      this.setLexicalEditor(el, query);
    }
    
    console.log(`[MultiAI] ${this.name} text set:`, query);
    
    // 等待更长时间让按钮激活
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试多种方式查找按钮
    let btn = this.findSendButton(this.getSendButtonSelector());
    
    if (!btn) {
      btn = this.findSendButtonByKeywords(['发送', 'send', 'submit']);
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
    const instance = new Kimi();
    return await instance.sendQuery(query);
  }
}

