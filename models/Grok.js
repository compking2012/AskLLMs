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
   * 获取样式按钮选择器（第5个button.group）
   * @returns {string}
   */
  getModeButtonSelector() {
    // 返回选择器，用于查找第5个button.group
    return 'div[role="menu"] > div[role="menuitem"]';
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
    // Grok: <input class="hidden" multiple type="file" name="files">
    return 'input[name="files"][type="file"]';
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
    return false;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} Grok 支持生成图片
   */
  canGenImage() {
    return false;  // FIXME: Grok 支持生成图片, 但目前有bug暂不启用
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} Grok 支持上传文件
   */
  canUploadFile() {
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

      modelSelectBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 步骤2: 在 button 上触发完整的鼠标事件
      this.simulateClick(modelSelectBtn);
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤3: 找到菜单中的第3个menuitem（专家模式）
      const allMenuItems = await this.waitForElement(this.getModeButtonSelector(), 3000);
      if (allMenuItems.length < 3) {
        console.log(`[MultiAI] ${this.name} menu items not found, skipping...`);
        return true;
      }
      // 第3个菜单项是"专家模式"（enableDeepThink）
      console.log(`[MultiAI] ${this.name} expert mode menu item found, clicking...`);
      allMenuItems[2].click();
      
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
      // 步骤2: 在 button 上触发完整的鼠标事件
      this.simulateClick(modelSelectBtn);
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步骤3: 找到菜单中的第1个menuitem（快速模式）
      const allMenuItems = await this.waitForElement(this.getModeButtonSelector(), 3000);
      if (allMenuItems.length < 2) {
        console.log(`[MultiAI] ${this.name} menu items not found, skipping...`);
        return true;
      }
      // 第1个菜单项是"快速模式"（disableDeepThink）
      console.log(`[MultiAI] ${this.name} quick mode menu item found, clicking...`);
      allMenuItems[1].click();
      
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

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false, genImage = false, file = null) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    console.log(`[MultiAI] ${this.name} - genImage:`, genImage);
    console.log(`[MultiAI] ${this.name} - file:`, file ? file.name : null);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果有文件，先上传文件
    if (file && this.canUploadFile()) {
      await this.uploadFiles(file);
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
   * 判断是否处于查询模式
   * Grok的发送按钮在生成时会变成停止状态
   * @returns {boolean}
   */
  isQueryingMode() {
    try {
      let btn = this.findSendButton(this.getSendButtonSelector());
      if (!btn) {
        btn = this.findSendButtonByKeywords(['stop', '停止', 'cancel', '取消']);
      }
      
      if (!btn) return false;
      
      // 检查按钮文本或aria-label是否包含停止相关关键词
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const btnText = btn.textContent || '';
      const combined = (ariaLabel + ' ' + btnText).toLowerCase();
      
      if (combined.includes('stop') || combined.includes('停止') || 
          combined.includes('cancel') || combined.includes('取消')) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} isQueryingMode error:`, error);
      return false;
    }
  }

  /**
   * 停止当前正在进行的查询
   * Grok的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
   * @returns {Promise<boolean>}
   */
  async stopQuery() {
    try {
      let btn = this.findSendButton(this.getSendButtonSelector());
      if (!btn) {
        btn = this.findSendButtonByKeywords(['stop', '停止', 'cancel', '取消']);
      }
      if (btn && !btn.disabled) {
        btn.click();
        console.log(`[MultiAI] ${this.name} stopped query ✓`);
        return true;
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
   * 获取响应区域选择器（Grok 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    return 'div[data-testid="message-content"], div.message-content';
  }

  /**
   * 获取模型输出的 DOM 结果（Grok 特殊实现）
   * @param {Function|null} onUpdate - 可选的回调函数，用于流式返回更新
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<string>} 返回完整的响应文本内容
   */
  async fetchResponse(onUpdate = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastContent = '';
      let isComplete = false;
      
      const responseSelector = this.getResponseSelector();
      
      const checkForResponse = () => {
        const responseElements = document.querySelectorAll(responseSelector);
        if (responseElements.length > 0) {
          return Array.from(responseElements).pop();
        }
        return null;
      };
      
      const extractText = (element) => {
        if (!element) return '';
        return element.innerText || element.textContent || '';
      };
      
      const checkCompletion = () => {
        const isStreaming = document.querySelector('div[class*="loading"], div[class*="streaming"]') !== null;
        return !isStreaming;
      };
      
      const pollInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > timeout) {
          clearInterval(pollInterval);
          if (observer) observer.disconnect();
          resolve(lastContent || '');
          return;
        }
        
        const responseElement = checkForResponse();
        if (responseElement) {
          const currentContent = extractText(responseElement);
          
          if (currentContent !== lastContent && onUpdate) {
            onUpdate(currentContent);
          }
          
          lastContent = currentContent;
          
          if (checkCompletion() && !isComplete) {
            setTimeout(() => {
              const finalContent = extractText(responseElement);
              if (finalContent === lastContent) {
                isComplete = true;
                clearInterval(pollInterval);
                if (observer) observer.disconnect();
                resolve(finalContent);
              }
            }, 2000);
          }
        }
      }, 500);
      
      let observer = null;
      if (document.body) {
        observer = new MutationObserver(() => {
          const responseElement = checkForResponse();
          if (responseElement) {
            const currentContent = extractText(responseElement);
            
            if (currentContent !== lastContent) {
              lastContent = currentContent;
              if (onUpdate) {
                onUpdate(currentContent);
              }
              
              if (checkCompletion() && !isComplete) {
                setTimeout(() => {
                  const finalContent = extractText(responseElement);
                  if (finalContent === lastContent) {
                    isComplete = true;
                    clearInterval(pollInterval);
                    observer.disconnect();
                    resolve(finalContent);
                  }
                }, 2000);
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
    const instance = new Grok();
    return await instance.sendQuery(query);
  }
}

