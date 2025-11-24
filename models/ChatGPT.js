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
      plusBtn.click();
      
      // 等待按钮状态更新
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 步骤2: 等待菜单出现，然后找到"思考"菜单项
      // 先等待菜单容器出现（使用多种可能的选择器）
      let menu = null;
      const menuSelectors = [
        'div[role="menu"]',
        'div[role="menu"][data-state="open"]',
        '[role="menu"]',
        'div.popover[role="menu"]'
      ];
      
      for (const selector of menuSelectors) {
        menu = await this.waitForElement(selector, 2000);
        if (menu) {
          console.log(`[MultiAI] ${this.name} menu found with selector: ${selector}`);
          break;
        }
      }
      
      // 如果菜单容器找到了，等待菜单项渲染
      if (menu) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 使用重试机制查找菜单项
      let thinkItem = null;
      let retries = 20; // 增加重试次数
      
      while (retries > 0 && !thinkItem) {
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 尝试多种选择器查找菜单项
        let menuItems = Array.from(document.querySelectorAll('div[role="menuitemradio"]'));
        
        // 如果没找到，尝试查找所有可能的菜单项
        if (menuItems.length === 0) {
          menuItems = Array.from(document.querySelectorAll('[role="menuitemradio"]'));
        }
        
        // 如果还是没找到，查找所有包含"思考"文本的元素
        if (menuItems.length === 0) {
          const allDivs = Array.from(document.querySelectorAll('div'));
          menuItems = allDivs.filter(div => {
            const text = div.textContent.trim();
            return text === '思考' || text.includes('思考');
          });
          if (menuItems.length > 0) {
            console.log(`[MultiAI] ${this.name} found ${menuItems.length} elements containing "思考"`);
          }
        }
        
        if (retries === 20 || retries % 5 === 0) {
          console.log(`[MultiAI] ${this.name} attempt ${21 - retries}: found ${menuItems.length} menu items`);
        }
        
        if (menuItems.length > 0) {
          // 打印所有菜单项的详细信息，用于调试（只在第一次找到时打印）
          if (retries === 20) {
            menuItems.forEach((item, index) => {
              const text = item.textContent.trim();
              const role = item.getAttribute('role');
              const className = item.className;
              const ariaLabel = item.getAttribute('aria-label');
              console.log(`[MultiAI] ${this.name} menu item [${index}]: text="${text}", role="${role}", class="${className}", aria-label="${ariaLabel}"`);
            });
          }
          
          // 方法1: 通过文本内容查找"思考"
          for (const item of menuItems) {
            const text = item.textContent.trim();
            if (text === '思考' || text.includes('思考')) {
              thinkItem = item;
              console.log(`[MultiAI] ${this.name} found "思考" item by text: "${text}"`);
              break;
            }
          }
          
          // 方法2: 如果没找到，尝试选择第二个 menuitemradio（根据DOM结构，"思考"是第二个）
          if (!thinkItem && menuItems.length >= 2) {
            // 只选择 role="menuitemradio" 的项
            const radioItems = menuItems.filter(item => item.getAttribute('role') === 'menuitemradio');
            if (radioItems.length >= 2) {
              thinkItem = radioItems[1];
              console.log(`[MultiAI] ${this.name} using second menuitemradio as fallback`);
            }
          }
        }
        
        retries--;
      }
      
      if (!thinkItem) {
        console.log(`[MultiAI] ${this.name} "思考" menu item not found after retries, skipping deep think...`);
        // 打印当前页面的所有可能相关的元素，用于调试
        const allMenus = Array.from(document.querySelectorAll('[role="menu"], [role="menuitem"], [role="menuitemradio"]'));
        console.log(`[MultiAI] ${this.name} found ${allMenus.length} menu-related elements on page`);
        if (allMenus.length > 0) {
          allMenus.slice(0, 10).forEach((item, index) => {
            const text = item.textContent.trim().substring(0, 50);
            console.log(`[MultiAI] ${this.name} menu element [${index}]: role="${item.getAttribute('role')}", text="${text}"`);
          });
        }
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} "思考" menu item found, clicking...`);
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

