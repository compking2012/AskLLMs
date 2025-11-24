/**
 * 文心一言模型类
 */
class Wenxin extends AIModel {
  static NAME = '文心一言';
  static URL = 'https://yiyan.baidu.com';
  static ICON = 'icons/wenxin.png';
  static I18N_KEY = 'platformWenxin';

  constructor() {
    super('文心一言', 'yiyan.baidu.com');
  }

  getInputSelector() {
    return 'div.yc-editor[contenteditable="true"][role="textbox"]';
  }

  getSendButtonSelector() {
    return [
      'button[class*="send"]'
    ];
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    // 使用 class 名称的部分匹配，CSS Modules 的哈希值会变化，但 "newSession" 部分应该稳定
    return 'div[class*="newSession"]';
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
   * 判断是否可进行深度思考
   * @returns {boolean} 文心一言不支持深度思考
   */
  canDeepThink() {
    return false;
  }

  /**
   * 禁用深度思考（文心一言不支持深度思考）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    // 文心一言不支持深度思考，直接返回 true 表示跳过
    return true;
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
    
    // 如果启用了深度思考，先启用深度思考，否则禁用
    if (this.canDeepThink()) {
    if (deepThink) {
      await this.enableDeepThink();
      } else {
        await this.disableDeepThink();
      }
    }
    
    // 如果启用了网络搜索，先启用网络搜索，否则禁用
    if (this.canWebSearch()) {
    if (webSearch) {
      await this.enableWebSearch();
      } else {
        await this.disableWebSearch();
      }
    }
    
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
      btn = this.findSendButtonByKeywords(['发送']);
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
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Wenxin();
    return await instance.sendQuery(query);
  }
}

