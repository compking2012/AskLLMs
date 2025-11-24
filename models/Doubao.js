/**
 * 豆包模型类
 */
class Doubao extends AIModel {
  static NAME = '豆包';
  static URL = 'https://www.doubao.com';
  static ICON = 'icons/doubao.png';
  static I18N_KEY = 'platformDoubao';

  constructor() {
    super('豆包', 'www.doubao.com');
  }

  getInputSelector() {
    return 'textarea.semi-input-textarea';
  }

  getSendButtonSelector() {
    return 'button[id="flow-end-msg-send"]';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'div[data-testid="create_conversation_button"]';
  }

  /**
   * 开启新对话
   * @returns {Promise<boolean>}
   */
  async startNewChat() {
    try {
      console.log(`[MultiAI] ${this.name} - starting new chat...`);
      
      // 等待新聊天按钮出现
      const newChatBtn = await this.waitForElement(this.getNewChatButtonSelector(), 10000);
      if (!newChatBtn) {
        console.log(`[MultiAI] ${this.name} new chat button not found, skipping...`);
        return true; // 如果找不到按钮，继续执行（可能已经在新对话中）
      }
      
      console.log(`[MultiAI] ${this.name} new chat button found, clicking...`);
      newChatBtn.click();
      
      // 等待新对话页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`[MultiAI] ${this.name} new chat started ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to start new chat:`, error);
      // 即使失败也继续执行，不阻塞后续流程
      return true;
    }
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果启用了深度思考，先启用深度思考
    if (deepThink) {
      await this.enableDeepThink();
    }
    
    // 如果启用了网络搜索，先启用网络搜索
    if (webSearch) {
      await this.enableWebSearch();
    }
    
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
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Doubao();
    return await instance.sendQuery(query);
  }
}

