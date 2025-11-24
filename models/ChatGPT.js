/**
 * ChatGPT 模型类
 */
class ChatGPT extends AIModel {
  static NAME = 'ChatGPT';
  static URL = 'https://chatgpt.com';
  static ICON = 'icons/chatgpt.png';
  static I18N_KEY = null;

  constructor() {
    super('ChatGPT', 'chatgpt.com');
  }

  getInputSelector() {
    return 'div#prompt-textarea[contenteditable="true"]';
  }

  getSendButtonSelector() {
    return 'button#composer-submit-button';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'a[data-testid="create-new-chat-button"]';
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
    // ChatGPT 的深度思考需要先点击加号按钮，然后在菜单中找到"思考"选项
    return 'button#composer-plus-btn';
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} ChatGPT 不支持深度思考
   */
  canDeepThink() {
    return false;
  }

  /**
   * 禁用深度思考（ChatGPT 不支持深度思考）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    // ChatGPT 不支持深度思考，直接返回 true 表示跳过
    return true;
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    // ChatGPT 的网络搜索按钮选择器（需要根据实际DOM调整）
    return 'button[aria-label*="Web"]'; // 示例，需要根据实际调整
  }

  /**
   * 启用深度思考（ChatGPT 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 步骤1: 找到并点击加号按钮
      const plusBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!plusBtn) {
        console.log(`[MultiAI] ${this.name} plus button not found, skipping deep think...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} plus button found, clicking...`);
      
      // 尝试多种方式点击（参考 Doubao 的方式）
      // 方法1: 滚动到元素位置
      plusBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 查找父元素
      const spanParent = plusBtn.closest('span.flex');
      const divParent = plusBtn.closest('div[style*="grid-area:leading"]');
      
      // 方法2: 在 button 上触发完整的鼠标事件序列
      const mouseEvents = ['mousedown', 'mouseup', 'click'];
      for (const eventType of mouseEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        plusBtn.dispatchEvent(event);
      }
      
      // 方法3: 在父元素上点击
      if (spanParent) {
        spanParent.click();
      }
      if (divParent) {
        divParent.click();
      }
      
      // 方法4: 直接点击 button
      plusBtn.click();
      
      // 等待按钮状态更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，然后找到第二个 menuitemradio（思考模式）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 直接选择第二个 menuitemradio（根据DOM结构，"思考"是第二个）
      const thinkItem = await this.waitForElement('[role="menuitemradio"]:nth-of-type(2)', 3000);
      if (!thinkItem) {
        console.log(`[MultiAI] ${this.name} deep think menu item not found, skipping...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} deep think menu item found, clicking...`);
      thinkItem.click();
      
      // 等待菜单关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false) {
    console.log(`[MultiAI] ${this.name} - starting query...`);
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
    
    const el = await this.waitForElement(this.getInputSelector());
    if (!el) {
      console.log(`[MultiAI] ${this.name} input not found after waiting`);
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found, setting text...`);
    this.setContentEditable(el, query);
    console.log(`[MultiAI] ${this.name} text set:`, query);
    
    // 等待发送按钮出现并激活
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new ChatGPT();
    return await instance.sendQuery(query);
  }
}

