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

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'side-nav-action-button[data-test-id="new-chat-button"] button[data-test-id="expanded-button"]';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div[data-test-id="bard-mode-menu-button"] button';
  }

  /**
   * 获取工具箱抽屉按钮选择器
   * @returns {string}
   */
  getToolboxDrawerButtonSelector() {
    return 'button.toolbox-drawer-button';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 获取生成图片按钮选择器（在工具箱抽屉菜单中）
   * @returns {string}
   */
  getGenImageButtonSelector() {
    return 'toolbox-drawer-item.toolbox-drawer-menu-item button span span img';
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} Gemini 支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   *
   * 说明：Gemini 的联网能力通常为自动/不需要显式开关；为了避免在 popup 中暴露一个不可控或不稳定的开关，
   * 这里返回 false（对应 UI 不显示“可手动控制网络搜索”的能力图标）。
   * @returns {boolean|string}
   */
  canWebSearch() {
    return false;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} Gemini 支持生成图片
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
   * 启用深度思考（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} mode menu button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第二个 button[role="menuitemradio"]（思考模式）
      const menuItem = await this.waitForElement('div.mat-mdc-menu-content button[role="menuitemradio"]:nth-of-type(2)', 3000);
      if (!menuItem) {
        console.log(`[MultiAI] ${this.name} deep think menu item not found, skipping...`);
        return true;
      }
      
      // 检查是否已经选中
      const isSelected = menuItem.getAttribute('aria-checked') === 'true' || 
                        menuItem.classList.contains('is-selected');
      
      if (!isSelected) {
        // 如果未选中，点击选择思考模式
        menuItem.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      } else {
        console.log(`[MultiAI] ${this.name} deep think already enabled ✓`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} mode menu button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第一个 button[role="menuitemradio"]（快速模式）
      const menuItem = await this.waitForElement('div.mat-mdc-menu-content button[role="menuitemradio"]:nth-of-type(1)', 3000);
      if (!menuItem) {
        console.log(`[MultiAI] ${this.name} quick mode menu item not found, skipping...`);
        return true;
      }
      
      // 检查是否已经选中
      const isSelected = menuItem.getAttribute('aria-checked') === 'true' || 
                        menuItem.classList.contains('is-selected');
      
      if (!isSelected) {
        // 如果未选中，点击选择快速模式
        menuItem.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MultiAI] ${this.name} deep think disabled ✓`);
      } else {
        console.log(`[MultiAI] ${this.name} deep think already disabled ✓`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} mode menu button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第二个 button[role="menuitemradio"]（思考模式）
      const menuItem = await this.waitForElement('div.mat-mdc-menu-content button[role="menuitemradio"]:nth-of-type(2)', 3000);
      if (!menuItem) {
        console.log(`[MultiAI] ${this.name} web search menu item not found, skipping...`);
        return true;
      }
      
      // 检查是否已经选中
      const isSelected = menuItem.getAttribute('aria-checked') === 'true' || 
                        menuItem.classList.contains('is-selected');
      
      if (!isSelected) {
        // 如果未选中，点击选择思考模式
        menuItem.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MultiAI] ${this.name} web search enabled ✓`);
      } else {
        console.log(`[MultiAI] ${this.name} web search already enabled ✓`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} mode menu button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第一个 button[role="menuitemradio"]（快速模式）
      const menuItem = await this.waitForElement('div.mat-mdc-menu-content button[role="menuitemradio"]:nth-of-type(1)', 3000);
      if (!menuItem) {
        console.log(`[MultiAI] ${this.name} quick mode menu item not found, skipping...`);
        return true;
      }
      
      // 检查是否已经选中
      const isSelected = menuItem.getAttribute('aria-checked') === 'true' || 
                        menuItem.classList.contains('is-selected');
      
      if (!isSelected) {
        // 如果未选中，点击选择快速模式
        menuItem.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MultiAI] ${this.name} web search disabled ✓`);
      } else {
        console.log(`[MultiAI] ${this.name} web search already disabled ✓`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling gen image...`);
      
      // 步骤1: 点击工具箱抽屉按钮打开菜单
      const toolboxButton = await this.waitForElement(this.getToolboxDrawerButtonSelector(), 5000);
      if (!toolboxButton) {
        console.log(`[MultiAI] ${this.name} toolbox drawer button not found, skipping...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} toolbox drawer button found, clicking...`);
      toolboxButton.click();
 
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的图片按钮
      const genImageElement = await this.waitForElement(this.getGenImageButtonSelector(), 3000);
      if (!genImageElement) {
        console.log(`[MultiAI] ${this.name} gen image element not found, skipping...`);
        return true;
      }
      
      // 找到第3级父节点，然后查找其中的 button
      const parent3 = genImageElement.parentNode?.parentNode?.parentNode;
      if (!parent3) {
        console.log(`[MultiAI] ${this.name} parent node not found, skipping...`);
        return true;
      }
      
      const genImageButton = parent3.querySelector('button');
      if (!genImageButton) {
        console.log(`[MultiAI] ${this.name} gen image button not found in parent, skipping...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} enable gen image button found, clicking...`);
      genImageButton.click();      

      console.log(`[MultiAI] ${this.name} gen image enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable gen image:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用生成图片（Gemini 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling gen image...`);
      
      // 查找取消选择按钮（toolbox-drawer-item-deselect-button）
      // 这个按钮包含 img.img-icon，表示图片功能已启用
      const deselectButtons = document.querySelectorAll('button.toolbox-drawer-item-deselect-button');
      
      let imageDeselectButton = null;
      for (const btn of deselectButtons) {
        const img = btn.querySelector('img.img-icon');
        if (img) {
          imageDeselectButton = btn;
          break;
        }
      }
      
      if (!imageDeselectButton) {
        console.log(`[MultiAI] ${this.name} image deselect button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} image deselect button found, clicking...`);
      imageDeselectButton.click();
      
      // 等待按钮消失或状态更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} gen image disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable gen image:`, error);
      return true; // 即使失败也继续执行
    }
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

