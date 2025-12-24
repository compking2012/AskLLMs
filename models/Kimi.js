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

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'a.new-chat-btn';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getToolkitTriggerButtonSelector() {
    return 'div.toolkit-trigger-btn.icon-button';
  }

  getDeepThinkSwitchSelector() {
    return 'div.toolkit-popover div.toolkit-container div.toolkit-item:nth-of-type(2) div.search-switch label.switch';
  }

  getRemoveDeepThinkButtonSelector() {
    return 'div.thinking-open';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  getWebSearchSwitchSelector() {
    return 'div.toolkit-popover div.toolkit-container div.toolkit-item:nth-of-type(1) div.search-switch label.switch';
  }

  /**
   * 获取生成图片按钮选择器
   * @returns {string}
   */
  getGenImageButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 获取文件上传按钮选择器
   * @returns {string}
   */
  getFileUploadButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 获取文件上传 input 选择器
   * @returns {string}
   */
  getFileUploadInputSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} Kimi 支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} Kimi 支持网络搜索
   */
  canWebSearch() {
    return false; // FIXME: Kimi 支持网络搜索, 但目前有bug暂不启用
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} Kimi 不支持生成图片
   */
  canGenImage() {
    return false;
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} Kimi 不支持上传文件
   */
  canUploadFile() {
    return false;
  }

  /**
   * 上传文件（Kimi 特殊实现）
   * @param {File} file - 要上传的文件对象
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败
   */
  async uploadFile(file) {
    try {
      if (!file) {
        console.log(`[MultiAI] ${this.name} no file provided for upload`);
        return false;
      }

      // 方法1: 尝试通过文件上传按钮找到 input
      const uploadButtonSelector = this.getFileUploadButtonSelector();
      const uploadInputSelector = this.getFileUploadInputSelector();
      
      let fileInput = null;
      
      // 如果提供了 input 选择器，直接查找
      if (uploadInputSelector) {
        fileInput = await this.waitForElement(uploadInputSelector, 5000);
      }
      
      // 如果没找到，尝试通过按钮找到关联的 input
      if (!fileInput && uploadButtonSelector) {
        const uploadButton = await this.waitForElement(uploadButtonSelector, 5000);
        if (uploadButton) {
          // 查找按钮附近或关联的 input[type="file"]
          const nearbyInput = uploadButton.closest('form')?.querySelector('input[type="file"]') ||
                             uploadButton.parentElement?.querySelector('input[type="file"]') ||
                             uploadButton.nextElementSibling?.querySelector('input[type="file"]') ||
                             uploadButton.previousElementSibling?.querySelector('input[type="file"]');
          fileInput = nearbyInput;
        }
      }
      
      // 如果还是没找到，尝试查找页面上所有的 input[type="file"]
      if (!fileInput) {
        const allFileInputs = document.querySelectorAll('input[type="file"]');
        if (allFileInputs.length > 0) {
          fileInput = allFileInputs[0]; // 使用第一个找到的
        }
      }
      
      if (!fileInput) {
        console.log(`[MultiAI] ${this.name} file upload input not found`);
        return false;
      }
      
      console.log(`[MultiAI] ${this.name} file upload input found, uploading file:`, file.name);
      
      // 使用 DataTransfer API 设置文件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // 设置 input 的 files
      fileInput.files = dataTransfer.files;
      
      // 触发 change 事件（这是关键！）
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // 有些应用可能需要 input 事件
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 有些应用可能需要自定义事件
      fileInput.dispatchEvent(new Event('file-selected', { bubbles: true }));
      
      console.log(`[MultiAI] ${this.name} file uploaded ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to upload file:`, error);
      return false;
    }
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
   * 启用深度思考（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getToolkitTriggerButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} toolkit trigger button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第二个 div.toolkit-item div.search-switch
      const switchDiv = await this.waitForElement(this.getDeepThinkSwitchSelector(), 3000);
      if (!switchDiv) {
        console.log(`[MultiAI] ${this.name} second toolkit-item switch not found, skipping...`);
        return true;
      }
      
      // 步骤3: 检查开关状态
      const checkbox = switchDiv.querySelector('input[type="checkbox"]');
      const isActive = checkbox && checkbox.checked === true;
      
      if (!isActive) {
        // 如果未激活，点击开关
        switchDiv.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      } else {
        console.log(`[MultiAI] ${this.name} deep think already enabled ✓`);
      }
 
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getRemoveDeepThinkButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} toolkit trigger button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`);      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getToolkitTriggerButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} toolkit trigger button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第二个 div.toolkit-item div.search-switch
      const switchDiv = await this.waitForElement(this.getWebSearchSwitchSelector(), 3000);
      if (!switchDiv) {
        console.log(`[MultiAI] ${this.name} second toolkit-item switch not found, skipping...`);
        return true;
      }
      
      // 步骤3: 检查开关状态
      const checkbox = switchDiv.querySelector('input[type="checkbox"]');
      const isActive = checkbox && checkbox.checked === true;
      
      if (!isActive) {
        // 如果未激活，点击开关
        switchDiv.click();
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
   * 禁用网络搜索（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 步骤1: 点击触发按钮打开菜单
      const triggerBtn = await this.waitForElement(this.getWebSearchButtonSelector(), 5000);
      if (!triggerBtn) {
        console.log(`[MultiAI] ${this.name} toolkit trigger button not found, skipping...`);
        return true;
      }
      
      // 点击触发按钮
      triggerBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 等待菜单出现，找到第二个 div.toolkit-item div.search-switch
      const switchDiv = await this.waitForElement('div.toolkit-item:nth-of-type(1) div.search-switch', 3000);
      if (!switchDiv) {
        console.log(`[MultiAI] ${this.name} second toolkit-item switch not found, skipping...`);
        return true;
      }
      
      // 步骤3: 检查开关状态
      const checkbox = switchDiv.querySelector('input[type="checkbox"]');
      const isActive = checkbox && checkbox.checked === true;
      
      if (isActive) {
        // 如果已激活，点击开关禁用
        switchDiv.click();
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
   * 启用生成图片（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    return false;
  }

  /**
   * 禁用生成图片（Kimi 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    return false;
  }

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false, genImage = false, file = null) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    console.log(`[MultiAI] ${this.name} - genImage:`, genImage);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果有文件，先上传文件
    if (file && this.canUploadFile()) {
      await this.uploadFile(file);
      // 等待文件上传处理完成
      await new Promise(resolve => setTimeout(resolve, 1000));
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

