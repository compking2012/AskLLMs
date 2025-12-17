/**
 * Grok 模型类
 */
class Grok extends AIModel {
  static NAME = 'Grok';
  static URL = 'https://grok.com';
  static ICON = 'icons/grok.png';
  static I18N_KEY = null;

  constructor() {
    super('Grok', 'grok.com');
  }

  getInputSelector() {
    return 'div.ProseMirror[contenteditable="true"]';
  }

  getSendButtonSelector() {
    return [
      'button[data-testid="send-button"]',
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]'
    ];
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'a[href="/"][data-sidebar="menu-button"]';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    // Grok 的模型选择按钮
    return 'div.z-20 button#model-select-trigger';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 获取生成图片按钮选择器
   * @returns {string}
   */
  getGenImageButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean}
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean}
   */
  canWebSearch() {
    return "auto";
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} Grok 支持生成图片
   */
  canGenImage() {
    return true;
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
   * 启用深度思考
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 步骤1: 点击模型选择按钮打开菜单
      const modelSelectBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!modelSelectBtn) {
        console.log(`[MultiAI] ${this.name} model select button not found, skipping deep think...`);
        return true;
      }
      console.log(`[MultiAI] ${this.name} model select button found, clicking...`);

      const div = modelSelectBtn.parentNode;
      
      div.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 方法2: 在 button 上触发完整的鼠标事件
      const mouseEvents = ['mousedown', 'mouseup', 'click'];
      for (const eventType of mouseEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        modelSelectBtn.dispatchEvent(event);
      }
      
      // 方法3: 也在 div 上点击
      modelSelectBtn.click();
    // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤2: 找到菜单中的第3个menuitem（专家模式）
      const firstMenuItem = await this.waitForElement('div[role="menuitem"]', 3000);
      if (!firstMenuItem) {
        console.log(`[MultiAI] ${this.name} menu items not found, skipping...`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div[role="menuitem"]');
      if (allMenuItems.length < 3) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), skipping...`);
        return true;
      }
      
      // 第3个菜单项是"专家模式"（enableDeepThink）
      const expertModeItem = allMenuItems[2];
      console.log(`[MultiAI] ${this.name} expert mode menu item found, clicking...`);
      expertModeItem.click();
      
      // 等待菜单关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 步骤1: 点击模型选择按钮打开菜单
      const modelSelectBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!modelSelectBtn) {
        console.log(`[MultiAI] ${this.name} model select button not found, may already be disabled`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} model select button found, clicking...`);
      modelSelectBtn.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第2个menuitem（快速模式）
      const firstMenuItem = await this.waitForElement('div[role="menuitem"]', 3000);
      if (!firstMenuItem) {
        console.log(`[MultiAI] ${this.name} menu items not found, may already be disabled`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div[role="menuitem"]');
      if (allMenuItems.length < 2) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), may already be disabled`);
        return true;
      }
      
      // 第2个菜单项是"快速模式"（disableDeepThink）
      const fastModeItem = allMenuItems[1];
      console.log(`[MultiAI] ${this.name} fast mode menu item found, clicking...`);
      fastModeItem.click();
      
      // 等待菜单关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 步骤1: 点击模型选择按钮打开菜单
      const modelSelectBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!modelSelectBtn) {
        console.log(`[MultiAI] ${this.name} model select button not found, skipping web search...`);
        return true;
      }
      console.log(`[MultiAI] ${this.name} model select button found, clicking...`);

      const div = modelSelectBtn.parentNode;
      
      div.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 方法2: 在 button 上触发完整的鼠标事件
      const mouseEvents = ['mousedown', 'mouseup', 'click'];
      for (const eventType of mouseEvents) {
        const event = new MouseEvent(eventType, {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1
        });
        modelSelectBtn.dispatchEvent(event);
      }
      
      // 方法3: 也在 div 上点击
      modelSelectBtn.click();
    // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤2: 找到菜单中的第3个menuitem（专家模式）
      const firstMenuItem = await this.waitForElement('div[role="menuitem"]', 3000);
      if (!firstMenuItem) {
        console.log(`[MultiAI] ${this.name} menu items not found, skipping...`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div[role="menuitem"]');
      if (allMenuItems.length < 3) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), skipping...`);
        return true;
      }
      
      // 第3个菜单项是"专家模式"（enableWebSearch）
      const expertModeItem = allMenuItems[2];
      console.log(`[MultiAI] ${this.name} expert mode menu item found, clicking...`);
      expertModeItem.click();
      
      // 等待菜单关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 步骤1: 点击模型选择按钮打开菜单
      const modelSelectBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!modelSelectBtn) {
        console.log(`[MultiAI] ${this.name} model select button not found, may already be disabled`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} model select button found, clicking...`);
      modelSelectBtn.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第2个menuitem（快速模式）
      const firstMenuItem = await this.waitForElement('div[role="menuitem"]', 3000);
      if (!firstMenuItem) {
        console.log(`[MultiAI] ${this.name} menu items not found, may already be disabled`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div[role="menuitem"]');
      if (allMenuItems.length < 2) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), may already be disabled`);
        return true;
      }
      
      // 第2个菜单项是"快速模式"（disableWebSearch）
      const fastModeItem = allMenuItems[1];
      console.log(`[MultiAI] ${this.name} fast mode menu item found, clicking...`);
      fastModeItem.click();
      
      // 等待菜单关闭
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（Grok 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    // TODO: 实现生成图片功能
    return true;
  }

  /**
   * 禁用生成图片（Grok 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    // TODO: 实现生成图片功能
    return true;
  }

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false, genImage = false) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    console.log(`[MultiAI] ${this.name} - genImage:`, genImage);
    
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
    
    // 如果启用了生成图片，先启用生成图片，否则禁用
    if (this.canGenImage()) {
      if (genImage) {
        await this.enableGenImage();
      } else {
        await this.disableGenImage();
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
      btn = this.findSendButtonByKeywords(['send', 'submit', '发送']);
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
    const instance = new Grok();
    return await instance.sendQuery(query);
  }
}

