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

  getPlusButtonSelector() {
    return 'button#composer-plus-btn';
  }

  getMoreButtonSelector() {
    return 'div[data-side="top"] div[role="group"] div[role="menuitem"]';
  }
  
  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    // ChatGPT 的深度思考需要先点击加号按钮，然后在菜单中找到"思考"选项
    // 改为定位到包含按钮的 div
    return 'div[data-side="top"] div[role="group"] div[role="menuitemradio"]:nth-of-type(2)';
  }

  getRemoveDeepThinkButtonSelector() {
    return 'button.__composer-pill.group';
  }

    /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
    getWebSearchButtonSelector() {
      // ChatGPT 的网络搜索按钮选择器（需要根据实际DOM调整）
      return 'div[data-side="right"] div[role="group"] div[role="menuitemradio"]:nth-of-type(2)';
    }

    getRemoveWebSearchButtonSelector() {
      return 'button.__composer-pill.group';
    }
  
    /**
     * 获取生成图片按钮选择器
     * @returns {string}
     */
    getGenImageButtonSelector() {
      return 'div[data-side="top"] div[role="group"] div[role="menuitemradio"]:nth-of-type(1)';
    }
    
    getRemoveGenImageButtonSelector() {
      return 'button.__composer-pill.group';
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
   * 判断是否可进行深度思考
   * @returns {boolean} ChatGPT 不支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} ChatGPT 支持网络搜索
   */
  canWebSearch() {
    return true; //"exclusive";
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} ChatGPT 支持生成图片
   */
  canGenImage() {
    return true;
  }

  /**
   * 模拟点击元素（兼容 React 合成事件）
   * @param {HTMLElement} element
   */
  simulateClick(element) {
    const events = ['pointerdown', 'pointerup', 'click'];
    events.forEach(eventType => {
      const event = new PointerEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(event);
    });
  }

  /**
   * 模拟鼠标悬停在元素上
   * @param {HTMLElement} element
   */
  simulateHover(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    ['pointerover', 'pointerenter', 'pointermove'].forEach(type => {
      document.dispatchEvent(new PointerEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y
      }));
    });
  }

  /**
   * 启用深度思考（ChatGPT 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 步骤1: 找到并点击 composer plus 按钮
      // 使用 data-testid 属性作为选择器（更稳定）
      const plusButton = await this.waitForElement(this.getPlusButtonSelector(), 5000);
      if (!plusButton) {
        console.log(`[MultiAI] ${this.name} composer plus button not found, skipping deep think...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} composer plus button found, clicking...`);
      
      // 滚动到按钮位置，确保可见
      plusButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 点击按钮
      this.simulateClick(plusButton);
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`[MultiAI] ${this.name} composer plus button clicked ✓`);
      
      // 找到深度思考按钮（pill button）
      const deepThinkButton = await this.waitForElement(this.getDeepThinkButtonSelector(), 3000);
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} deep think button found, clicking...`);
      deepThinkButton.click();
      
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
      const buttons = document.querySelectorAll(this.getRemoveDeepThinkButtonSelector());
      const deepthinkSign = 'M14.3352';
      
      let deepThinkButton = null;
      for (const button of buttons) {
        const iconSignature = button.querySelector('svg path')?.getAttribute('d');
        if (iconSignature?.startsWith(deepthinkSign)) {
          deepThinkButton = button;
          break;
        }
      }
      
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
   * 启用网络搜索（ChatGPT 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 步骤1: 找到并点击 composer plus 按钮
      // 使用 data-testid 属性作为选择器（更稳定）
      const plusButton = await this.waitForElement(this.getPlusButtonSelector(), 5000);
      if (!plusButton) {
        console.log(`[MultiAI] ${this.name} composer plus button not found, skipping web search...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} composer plus button found, clicking...`);
      
      // 滚动到按钮位置，确保可见
      plusButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 点击按钮
      this.simulateClick(plusButton);
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 1000));
      
     // 找到更多按钮（more button）
     const moreButton = await this.waitForElement(this.getMoreButtonSelector(), 3000);
     if (!moreButton) {
       console.log(`[MultiAI] ${this.name} more button not found, may already be disabled`);
       return true; // 如果找不到按钮，可能已经禁用了
     }
     
     console.log(`[MultiAI] ${this.name} more button found, hovering...`);
     this.simulateHover(moreButton);

      console.log(`[MultiAI] ${this.name} more button hovered ✓`);

      // 找到网络搜索按钮（pill button）
      const webSearchButton = await this.waitForElement(this.getWebSearchButtonSelector(), 3000);
      if (!webSearchButton) {
        console.log(`[MultiAI] ${this.name} web search button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} web search button found, clicking...`);
      webSearchButton.click();

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
      
      // 找到所有可能的网络搜索按钮（pill button）
      const buttons = document.querySelectorAll(this.getRemoveWebSearchButtonSelector());
      const websearchSign = 'M10';
      
      let webSearchButton = null;
      for (const button of buttons) {
        const iconSignature = button.querySelector('svg path')?.getAttribute('d');
        if (iconSignature?.startsWith(websearchSign)) {
          webSearchButton = button;
          break;
        }
      }
      
      if (!webSearchButton) {
        console.log(`[MultiAI] ${this.name} web search button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} web search button found, clicking...`);
      webSearchButton.click();
      
      // 等待按钮消失或状态更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（ChatGPT 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling gen image...`);
      
      // 步骤1: 找到并点击 composer plus 按钮
      const plusButton = await this.waitForElement(this.getPlusButtonSelector(), 5000);
      if (!plusButton) {
        console.log(`[MultiAI] ${this.name} composer plus button not found, skipping...`);
        return true;
      }
      
      // 滚动到按钮位置，确保可见
      plusButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 点击按钮打开菜单
      this.simulateClick(plusButton);
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
       // 找到深度思考按钮（pill button）
       const genImageButton = await this.waitForElement(this.getGenImageButtonSelector(), 3000);
       if (!genImageButton) {
         console.log(`[MultiAI] ${this.name} gen Image button not found, may already be disabled`);
         return true; // 如果找不到按钮，可能已经禁用了
       }
       
       console.log(`[MultiAI] ${this.name} gen Image button found, clicking...`);
       genImageButton.click();
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable gen image:`, error);
      return true;
    }
  }

  /**
   * 禁用生成图片（ChatGPT 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling gen image...`);
      
      // 找到所有可能的生成图片按钮（pill button）
      const buttons = document.querySelectorAll(this.getRemoveGenImageButtonSelector());
      const genimageSign = 'M9.38759';
      
      let genImageButton = null;
      for (const button of buttons) {
        const iconSignature = button.querySelector('svg path')?.getAttribute('d');
        if (iconSignature?.startsWith(genimageSign)) {
          genImageButton = button;
          break;
        }
      }
      
      if (!genImageButton) {
        console.log(`[MultiAI] ${this.name} gen Image button not found, may already be disabled`);
        return true; // 如果找不到按钮，可能已经禁用了
      }
      
      console.log(`[MultiAI] ${this.name} gen Image button found, clicking...`);
      genImageButton.click();
      
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
    console.log(`[MultiAI] ${this.name} - starting query...`);
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

