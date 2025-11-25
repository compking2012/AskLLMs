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
    // 改为定位到包含按钮的 div
    return 'div[class*="grid-area:leading"]';
  }

  getRemoveDeepThinkButtonSelector() {
    return 'button.__composer-pill.group';
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} ChatGPT 不支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 禁用深度思考
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 找到深度思考按钮（pill button）
      const deepThinkButton = await this.waitForElement(this.getRemoveDeepThinkButtonSelector(), 3000);
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} deep think button found, clicking...`);
      deepThinkButton.click();
      
      // 等待按钮消失或状态更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
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
      
      // 步骤1: 找到包含按钮的 div
      const containerDiv = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!containerDiv) {
        console.log(`[MultiAI] ${this.name} container div not found, skipping deep think...`);
        return true;
      }
      
      // 找到内部的 span
      const span = containerDiv.querySelector('span.flex[data-state="closed"]');
      if (!span) {
        console.log(`[MultiAI] ${this.name} span not found, skipping deep think...`);
        return true;
      }
      
      // 找到内部的 button
      const button = span.querySelector('button[data-testid="composer-plus-btn"]');
      
      console.log(`[MultiAI] ${this.name} div and span found, clicking...`);
      
      // 滚动到 div 位置
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 尝试多种点击方式：先点击 div
      const mouseEvents = ['mousedown', 'mouseup', 'click'];
      for (const eventType of mouseEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        span.dispatchEvent(event);
      }
      span.click();
      
      // 等待一下，检查菜单是否出现
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 步骤2: 等待菜单出现，然后找到第二个 menuitemradio（思考模式）
      let menu = document.querySelector('[role="menu"]');
      if (!menu) {
        console.log(`[MultiAI] ${this.name} menu not found after clicking div, trying span...`);
        // 如果菜单没出现，尝试点击 span
        span.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        menu = document.querySelector('[role="menu"]');
      }
      
      if (!menu && button) {
        console.log(`[MultiAI] ${this.name} menu not found after clicking span, trying button...`);
        // 如果菜单还没出现，尝试点击 button
        button.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        menu = document.querySelector('[role="menu"]');
      }
      
      if (menu) {
        console.log(`[MultiAI] ${this.name} menu found`);
      } else {
        console.log(`[MultiAI] ${this.name} menu still not found after all attempts`);
      }
      
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

