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
    return 'button#composer-submit-button[data-testid="send-button"]';
  }

  getStopSendButtonSelector() {
    return 'button#composer-submit-button[data-testid="stop-button"]';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'a[data-testid="create-new-chat-button"][class*="gap-1.5"]';
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

  getPlusButtonSelector() {
    return 'button#composer-plus-btn';
  }

  getMoreButtonSelector() {
    return 'div[data-side="top"] div[role="group"] div[role="menuitem"]';
  }

  getRemoveDeepThinkButtonSelector() {
    return 'button.__composer-pill.group';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    // ChatGPT 的网络搜索按钮选择器（需要根据实际 DOM 调整）
    return 'div[data-side="right"] div[role="group"] div[role="menuitemradio"]:nth-of-type(2)';
  }
  
  getSendButtonSelector() {
    return 'button#composer-submit-button[data-testid="send-button"]';
  }

  getStopSendButtonSelector() {
    return 'button#composer-submit-button[data-testid="stop-button"]';
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
   * 获取文件上传按钮选择器
   * @returns {string}
   */
  getFileUploadButtonSelector() {
    return 'div[data-side="top"] div[role="group"] div[role="menuitem"]:nth-of-type(1)';
  }

  /**
   * 获取文件上传 input 选择器
   * @returns {string}
   */
  getFileUploadInputSelector() {
    // ChatGPT 的 file input 通常是隐藏的，并且带有 multiple + tabindex="-1"
    // 使用更宽泛但相对稳定的选择器，并允许多选择器回退
    return 'input[type="file"][multiple][tabindex="-1"], input[type="file"][multiple]';
  }

  /**
   * 获取响应区域选择器（ChatGPT 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    // ChatGPT 的响应区域通常在对话消息中
    return 'div[data-message-author-role="assistant"] div.markdown';
  }

  /**
   * 判断是否可进行深度思考
   *
   * 说明：ChatGPT 的"深度思考/思考"通过点击输入框左侧"+"菜单开启。
   * @returns {boolean}
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   *
   * 说明：ChatGPT 理论上支持网络搜索，但当前自动化启用存在已知问题，暂时返回 false。
   * @returns {boolean|string}
   */
  canWebSearch() {
    return false; // FIXME: ChatGPT 支持网络搜索, 但目前有bug无法启用
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean}
   */
  canGenImage() {
    return false; // FIXME: ChatGPT 支持生成图片, 但目前有bug无法启用
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} ChatGPT 支持上传文件
   */
  canUploadFile() {
    return true;
  }

  /**
   * 上传文件（ChatGPT 特殊实现）
   * @param {File|File[]} files - 要上传的文件对象或文件数组
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败
   */
  async uploadFiles(files) {
    try {
      const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
      if (fileArray.length === 0) return false;

      console.log(`[MultiAI] ${this.name} starting file upload...`);

      // 尝试直接查找 input[type="file"]（可能有多个）
      let fileInput = null;
      const nodeList = document.querySelectorAll(this.getFileUploadInputSelector());
      if (nodeList && nodeList.length === 1) {
        fileInput = nodeList[0];
      } else if (nodeList && nodeList.length > 1) {
        fileInput = Array.from(nodeList);
      }
      
      if (!fileInput) {
        console.log(`[MultiAI] ${this.name} file upload input not found`);
        return false;
      }
      
      console.log(`[MultiAI] ${this.name} file upload input found, uploading ${fileArray.length} file(s)`);
      
      // 使用基类方法上传
      if (!this.uploadFileToInput(fileInput, fileArray)) {
        return false;
      }
      
      // 等待前端接收（尽量通用：文件名出现 / DOM 变化）
      const usedInput = this._lastUsedFileInput || (Array.isArray(fileInput) ? fileInput[0] : fileInput);
      await this.waitForFileUploadAcknowledged(usedInput, fileArray, 15000);
      
      console.log(`[MultiAI] ${this.name} file upload completed ✓`);
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
      
      // 找到生成图片按钮（pill button）
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

  /**
   * 等待文件上传处理完成（通常通过检查发送按钮状态来判断）
   * @param {number} timeout 超时时间（毫秒）
   * @returns {Promise<boolean>}
   */
  async waitForUploadFinished(timeout = 30000) {
    console.log(`[MultiAI] ${this.name} waiting for upload to finish...`);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const selector = this.getSendButtonSelector();
      const btn = document.querySelector(selector);
      
      // 检查按钮是否存在且未被禁用
      if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
        console.log(`[MultiAI] ${this.name} upload finished ✓`);
        return true;
      }
      
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.warn(`[MultiAI] ${this.name} waitForUploadFinished timeout`);
    return false;
  }

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false, genImage = false, file = null) {
    console.log(`[MultiAI] ${this.name} - starting query...`);
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    console.log(`[MultiAI] ${this.name} - genImage:`, genImage);
    const fileInfo = file ? (Array.isArray(file) ? `${file.length} files` : file.name) : 'none';
    console.log(`[MultiAI] ${this.name} - file:`, fileInfo);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果有文件，先上传文件
    if (file && this.canUploadFile()) {
      await this.uploadFiles(file);
      // 等待文件上传处理完成（等待发送按钮变亮）
      await this.waitForUploadFinished(30000);
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
   * 判断是否处于查询模式
   * ChatGPT的发送按钮在生成时会变成停止按钮（aria-label包含"Stop"）
   * @returns {boolean}
   */
  isQueryingMode() {
    try {
      const btn = document.querySelector('button#composer-submit-button[data-testid="stop-button"]');
      if (btn && btn.offsetParent !== null) return true;     
      
      // Fallback checks if data-testid is not reliable or changes
      const sendBtn = document.querySelector('button#composer-submit-button') || document.querySelector(this.getSendButtonSelector());
      if (sendBtn && sendBtn.offsetParent !== null) {
        const ariaLabel = sendBtn.getAttribute('aria-label') || '';
        if (ariaLabel.toLowerCase().includes('stop') || ariaLabel.toLowerCase().includes('停止')) {
          return true;
        }
        const btnText = sendBtn.textContent || '';
        if (btnText.toLowerCase().includes('stop') || btnText.toLowerCase().includes('停止')) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} isQueryingMode error:`, error);
      return false;
    }
  }

  /**
   * 停止当前正在进行的查询
   * ChatGPT的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
   * @returns {Promise<boolean>}
   */
  async stopQuery() {
    try {
      const btn = await this.waitForElement(this.getStopSendButtonSelector(), 5000);
      if (btn) {
        // ChatGPT的发送按钮在生成时会变成停止按钮，直接点击即可
        // 检查按钮是否可见且可点击
        if (btn.offsetParent !== null && !btn.disabled) {
          btn.click();
          console.log(`[MultiAI] ${this.name} stopped query ✓`);
          return true;
        }
      }
      console.log(`[MultiAI] ${this.name} stop button not found or not available`);
      return false;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} stopQuery error:`, error);
      return false;
    }
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
   * 获取模型输出的 DOM 结果（ChatGPT 特殊实现）
   * @param {Function|null} onUpdate - 可选的回调函数，用于流式返回更新
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<string>} 返回完整的响应文本内容
   */
  async fetchResponse(onUpdate = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastContent = '';
      let isComplete = false;
      
      // 获取响应区域选择器
      const responseSelector = this.getResponseSelector();
      
      // 等待响应区域出现
      const checkForResponse = () => {
        const responseElements = document.querySelectorAll(responseSelector);
        if (responseElements.length > 0) {
          // 找到最新的响应元素（通常是最后一个）
          const latestResponse = Array.from(responseElements).pop();
          return latestResponse;
        }
        return null;
      };
      
      // 提取文本内容
      const extractText = (element) => {
        if (!element) return '';
        // 移除代码块中的特殊标记，保留文本内容
        return element.innerText || element.textContent || '';
      };
      
      // 检查是否完成
      const checkCompletion = () => {
        return !this.isQueryingMode();
      };
      
      let lastContentLength = 0;
      let lastContentTime = Date.now();
      
      // 轮询检查响应
      const pollInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeout) {
          clearInterval(pollInterval);
          if (observer) observer.disconnect();
          resolve(lastContent || '');
          return;
        }
        
        // Debug: 检查轮询状态
        console.log(`[ChatGPT] Polling response, elapsed: ${elapsed}ms`);
        
        const responseElement = checkForResponse();
        if (responseElement) {
          const currentContent = extractText(responseElement);
          
          // 如果内容有更新，调用回调
          if (currentContent !== lastContent) {
             if (onUpdate) onUpdate(currentContent);
             lastContentLength = currentContent.length;
             lastContentTime = Date.now();
          }
          
          lastContent = currentContent;
          
          // 检查是否完成
          if (checkCompletion()) {
             if (!isComplete) {
               isComplete = true;
               console.log('[ChatGPT] fetchResponse completed, stopping pollInterval');
               clearInterval(pollInterval);
               if (observer) observer.disconnect();
               resolve(lastContent);
             }
          } else {
             // 兜底检测：如果内容非空，且超过 10 秒没有变化，且没有 Stop 按钮，视为完成
             if (currentContent.length > 0 && 
                 currentContent.length === lastContentLength && 
                 (Date.now() - lastContentTime) > 10000) {
                 
                 const stopSelector = this.getStopSendButtonSelector();
                 const hasStopButton = document.querySelector(stopSelector);
                 
                 if (!hasStopButton) {
                   console.log('[ChatGPT] Content stable for 10s and no stop button, assuming complete');
                   isComplete = true;
                   clearInterval(pollInterval);
                   if (observer) observer.disconnect();
                   resolve(lastContent);
                 }
             }
          }
        }
      }, 500);
      
      // 使用 MutationObserver 监听 DOM 变化（更高效）
      let observer = null;
      if (document.body) {
        observer = new MutationObserver(() => {
          const responseElement = checkForResponse();
          if (responseElement) {
            const currentContent = extractText(responseElement);
            
            if (currentContent !== lastContent) {
              lastContent = currentContent;
              lastContentTime = Date.now(); // 更新最后变动时间
              if (onUpdate) {
                onUpdate(currentContent);
              }
              
              // 检查是否完成
              if (checkCompletion() && !isComplete) {
                setTimeout(() => {
                  const finalContent = extractText(responseElement);
                  if (finalContent === lastContent) {
                    isComplete = true;
                    clearInterval(pollInterval);
                    observer.disconnect();
                    resolve(finalContent);
                  }
                }, 1000);
              }
            }
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
      
      // 立即检查一次
      setTimeout(() => {
        const responseElement = checkForResponse();
        if (responseElement) {
          const currentContent = extractText(responseElement);
          lastContent = currentContent;
          if (onUpdate) {
            onUpdate(currentContent);
          }
        }
      }, 1000);
    });
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
