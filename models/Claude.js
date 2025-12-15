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

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'a[aria-label="New chat"]';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getToolKitTriggerButtonSelector() {
    // Claude 的工具菜单按钮
    return 'button#input-tools-menu-trigger';
  }

  /**
   * 获取样式按钮选择器（第5个button.group）
   * @returns {string}
   */
  getStyleButtonSelector() {
    // 返回选择器，用于查找第5个button.group
    return 'div.absolute.block button.group';
  }
  
  getDeepThinkButtonSelector() {
    // 返回选择器，用于查找第5个button.group
    return 'div.absolute.block button.group';
  }

  getRemoveDeepThinkButtonSelector() {
    return 'div.flex.shrink button[aria-pressed="true"].group';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return 'div.absolute.block button.group';
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
    return false; // FIXME: Claude 支持网络搜索, 但目前有bug无法启用
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} Claude 不支持生成图片
   */
  canGenImage() {
    return false;
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
      
      // 步骤1: 点击工具菜单按钮打开菜单
      const toolsMenuBtn = await this.waitForElement(this.getToolKitTriggerButtonSelector(), 5000);
      if (!toolsMenuBtn) {
        console.log(`[MultiAI] ${this.name} tools menu button not found, skipping deep think...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} tools menu button found, clicking...`);
      toolsMenuBtn.click();
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 步骤2: 获取所有button.group，点击第一个来启用深度思考
      const useStyleButton = await this.waitForElement(this.getStyleButtonSelector(), 3000);
      if (useStyleButton.length < 5) {
        console.log(`[MultiAI] ${this.name} use style menu button not found, skipping...`);
        return true;
      }
      console.log(`[MultiAI] ${this.name} use style menu button found, clicking...`);
      useStyleButton[4].click();

      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 步骤3: 查找所有button.groups
      const allStyleButtons = await this.waitForElement(this.getDeepThinkButtonSelector(), 3000);
      if (allStyleButtons.length < 2) {
        console.log(`[MultiAI] ${this.name} enable deep think button not found, skipping...`);
        return true;
      }
      
      // 步骤4: 第一个按钮是启用深度思考
      console.log(`[MultiAI] ${this.name} enable deep think button found, clicking...`);
      allStyleButtons[1].click();
      
      // 步骤5: 等待操作完成
      await new Promise(resolve => setTimeout(resolve, 500));
      // toolsMenuBtn.click();
      // await new Promise(resolve => setTimeout(resolve, 500));
      
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
      
      // 找到所有可能的深度思考按钮（pill button）
      const deepThinkButton = await this.waitForElement(this.getRemoveDeepThinkButtonSelector(), 3000);
            
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} deep think button found, clicking...`);
      deepThinkButton.click();
      
      // 等待按钮消失或状态更新
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
      
      // 步骤1: 点击工具菜单按钮打开菜单
      const toolsMenuBtn = await this.waitForElement(this.getToolKitTriggerButtonSelector(), 5000);
      if (!toolsMenuBtn) {
        console.log(`[MultiAI] ${this.name} tools menu button not found, skipping web search...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} tools menu button found, clicking...`);
      toolsMenuBtn.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第5个按钮（Style按钮）
      // button.group分别在不同的div下，先等待至少一个出现，然后查找所有并选择第5个
      const webSearchButton = await this.waitForElement(this.getStyleButtonSelector(), 3000);
      if (webSearchButton.length < 3) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} enable web search button found, clicking...`);
      webSearchButton[2].click();
      
      // 等待操作完成
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
      
      // 步骤1: 点击工具菜单按钮打开菜单
      const toolsMenuBtn = await this.waitForElement(this.getToolKitTriggerButtonSelector(), 5000);
      if (!toolsMenuBtn) {
        console.log(`[MultiAI] ${this.name} tools menu button not found, skipping web search...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} tools menu button found, clicking...`);
      toolsMenuBtn.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第5个按钮（Style按钮）
      // button.group分别在不同的div下，先等待至少一个出现，然后查找所有并选择第5个
      const firstButton = await this.waitForElement(this.getStyleButtonSelector(), 3000);
      if (!firstButton) {
        console.log(`[MultiAI] ${this.name} menu buttons not found, skipping...`);
        return true;
      }
      
      // 查找所有button.group（跨所有div）
      const allButtons = document.querySelectorAll(this.getStyleButtonSelector());
      if (allButtons.length < 5) {
        console.log(`[MultiAI] ${this.name} not enough buttons found (found ${allButtons.length}), skipping...`);
        return true;
      }
      
      // 选择第5个按钮（索引为4）
      const styleButton = allButtons[4];
      console.log(`[MultiAI] ${this.name} style button found, clicking...`);
      styleButton.click();
      
      // 等待Style菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));

      // 步骤3: 获取所有button.group，点击第7个来禁用网络搜索
      const firstStyleButton = await this.waitForElement(this.getStyleButtonSelector(), 3000);
      if (!firstStyleButton) {
        console.log(`[MultiAI] ${this.name} style menu buttons not found, skipping...`);
        return true;
      }
      
      // 查找所有button.group
      const allStyleButtons = document.querySelectorAll(this.getStyleButtonSelector());
      if (allStyleButtons.length < 7) {
        console.log(`[MultiAI] ${this.name} style menu buttons not found, skipping...`);
    return true;
      }
      
      // 第7个按钮是禁用网络搜索
      const disableWebSearchButton = allStyleButtons[6];
      console.log(`[MultiAI] ${this.name} disable web search button found, clicking...`);
      disableWebSearchButton.click();
      
      // 等待操作完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    return false;
  }

  /**
   * 禁用生成图片
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    return false;
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

