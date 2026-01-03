/**
 * DeepSeek 模型类
 */
class DeepSeek extends AIModel {
  static NAME = 'DeepSeek';
  static URL = 'https://chat.deepseek.com';
  static ICON = 'icons/deepseek.png';
  static I18N_KEY = null;

  constructor() {
    super('DeepSeek', 'deepseek.com');
  }

  getInputSelector() {
    return ['textarea[class*="ds-"]', 'textarea[placeholder*="消息"]', 'textarea[placeholder*="Message"]', 'textarea'];
  }

  getSendButtonSelector() {
    return 'input[type="file"][multiple]~div div[role="button"]';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    // 返回空字符串，因为需要通过文本内容查找
    // startNewChat 方法中会通过 JavaScript 查找包含特定文本的元素
    return '';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div[role="button"].ds-toggle-button:first-of-type';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return 'div[role="button"].ds-toggle-button:nth-of-type(2)';
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
    return 'div[role="button"][tabindex="0"].ds-icon-button.ds-icon-button--l.ds-icon-button--sizing-container';
  }

  /**
   * 获取文件上传 input 选择器
   * @returns {string}
   */
  getFileUploadInputSelector() {
    return 'input[type="file"][multiple]';
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} DeepSeek 支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} DeepSeek 支持网络搜索
   */
  canWebSearch() {
    return true;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} DeepSeek 不支持生成图片
   */
  canGenImage() {
    return false;
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} DeepSeek 支持上传文件
   */
  canUploadFile() {
    return true;
  }

  /**
   * 上传文件（DeepSeek 特殊实现）
   * @param {File|File[]} files - 要上传的文件对象或文件数组
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败
   */
  async uploadFiles(files) {
    try {
      const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
      if (fileArray.length === 0) return false;

      // 1. 尝试找到 input
      let fileInput = await this.waitForElement(this.getFileUploadInputSelector(), 2000);
      
      // 2. 如果没找到，尝试点击上传按钮
      if (!fileInput) {
        const btnSelector = this.getFileUploadButtonSelector();
        if (btnSelector) {
          const btn = await this.waitForElement(btnSelector, 2000);
          if (btn) {
            console.log(`[MultiAI] ${this.name} clicking upload button to reveal input`);
            btn.click();
            await new Promise(r => setTimeout(r, 1000));
            fileInput = await this.waitForElement(this.getFileUploadInputSelector(), 3000);
          }
        }
      }

      if (!fileInput) {
        console.log(`[MultiAI] ${this.name} file upload input not found`);
        return false;
      }
      
      console.log(`[MultiAI] ${this.name} file upload input found, uploading ${fileArray.length} file(s)`);
      
      // 3. 使用基类方法设置文件
      if (!this.uploadFileToInput(fileInput, fileArray)) {
        return false;
      }

      // 4. 等待前端接收（尽量通用：文件名出现 / DOM 变化）
      const usedInput = this._lastUsedFileInput || (Array.isArray(fileInput) ? fileInput[0] : fileInput);
      await this.waitForFileUploadAcknowledged(usedInput, fileArray, 15000);

      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to upload files:`, error);
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
      
      // 由于 CSS 选择器无法直接匹配文本，我们需要通过 JavaScript 查找
      // 查找所有包含 "开启新对话" 或 "New Chat" 文本的 span，然后找到其父 div
      const maxWaitTime = 10000;
      const startTime = Date.now();
      let newChatBtn = null;
      
      while (!newChatBtn && (Date.now() - startTime) < maxWaitTime) {
        // 查找所有 span 元素
        const allSpans = document.querySelectorAll('span');
        
        for (const span of allSpans) {
          const text = span.textContent.trim();
          if (text === '开启新对话' || text === 'New Chat' || text.includes('新对话')) {
            // 找到包含该文本的 span，向上查找可点击的父元素
            let parent = span.parentElement;
            while (parent && parent !== document.body) {
              // 检查父元素是否可点击（有 cursor-pointer 或可点击的样式）
              if (parent.tagName === 'DIV' || parent.tagName === 'BUTTON' || parent.tagName === 'A') {
                newChatBtn = parent;
                break;
              }
              parent = parent.parentElement;
            }
            if (newChatBtn) break;
          }
        }
        
        if (!newChatBtn) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
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
   * 启用深度思考（DeepSeek 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 先尝试通过选择器查找
      let btn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 aria-pressed 或 class 判断）
      let isActive = btn.classList.contains('ds-toggle-button--selected')
      
      if (!isActive) {       
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 触发完整的鼠标事件序列
        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        for (const eventType of mouseEvents) {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          btn.dispatchEvent(event);
        }
        
        // 方法3: 直接点击
        btn.click();
      }
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`, isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（DeepSeek 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 先尝试通过选择器查找
      let btn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 aria-pressed 或 class 判断）
      let isActive = btn.classList.contains('ds-toggle-button--selected');
      
      if (isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 触发完整的鼠标事件序列
        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        for (const eventType of mouseEvents) {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          btn.dispatchEvent(event);
        }
        
        // 方法3: 直接点击
        btn.click();
      }
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`, !isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（DeepSeek 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 先尝试通过选择器查找
      let btn = await this.waitForElement(this.getWebSearchButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 aria-pressed 或 class 判断）
      let isActive = btn.classList.contains('ds-toggle-button--selected')
      
      if (!isActive) {       
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 触发完整的鼠标事件序列
        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        for (const eventType of mouseEvents) {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          btn.dispatchEvent(event);
        }
        
        // 方法3: 直接点击
        btn.click();
      }
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`, isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索（DeepSeek 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 先尝试通过选择器查找
      let btn = await this.waitForElement(this.getWebSearchButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 aria-pressed 或 class 判断）
      let isActive = btn.classList.contains('ds-toggle-button--selected');
      
      if (isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 触发完整的鼠标事件序列
        const mouseEvents = ['mousedown', 'mouseup', 'click'];
        for (const eventType of mouseEvents) {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
          });
          btn.dispatchEvent(event);
        }
        
        // 方法3: 直接点击
        btn.click();
      }
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`, !isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（DeepSeek 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    return false;
  }

  /**
   * 禁用生成图片（DeepSeek 特殊实现）
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
    const fileInfo = file ? (Array.isArray(file) ? `${file.length} files` : file.name) : 'none';
    console.log(`[MultiAI] ${this.name} - file:`, fileInfo);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果有文件，先上传文件
    if (file && this.canUploadFile()) {
      await this.uploadFiles(file);
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
      const allTextareas = document.querySelectorAll('textarea');
      console.log(`[MultiAI] ${this.name} found textareas:`, allTextareas.length);
      allTextareas.forEach((ta, i) => {
        console.log(`  [${i}] placeholder: "${ta.placeholder}", class: "${ta.className}"`);
      });
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found:`, el.placeholder);
    this.setTextarea(el, query);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试多种方式查找按钮
    let btn = await this.waitForElement(this.getSendButtonSelector());    
    if (btn) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not found.`);
    }
    
    return true;
  }

  /**
   * 判断是否处于查询模式
   * DeepSeek的发送按钮在生成时会变成停止状态
   * @returns {boolean}
   */
  isQueryingMode() {
    try {
      // 先尝试通过选择器查找按钮
      let btn = this.findSendButton(this.getSendButtonSelector());
      
      // 如果找不到，尝试通过关键词查找
      if (!btn) {
        btn = this.findSendButtonByKeywords(['停止', 'stop', '取消', 'cancel']);
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
   * DeepSeek的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
   * @returns {Promise<boolean>}
   */
  async stopQuery() {
    try {
      const btn = await this.waitForElement(this.getSendButtonSelector(), 5000);
      if (btn && !btn.disabled) {
        btn.click();
        console.log(`[MultiAI] ${this.name} stopped query ✓`);
        return true;
      }
      // 尝试通过关键词查找停止按钮
      const stopBtn = this.findSendButtonByKeywords(['停止', 'stop', '取消', 'cancel']);
      if (stopBtn && !stopBtn.disabled) {
        stopBtn.click();
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
   * 获取响应区域选择器（DeepSeek 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    return 'div[class*="ds-message"], div[class*="message-content"]';
  }

  /**
   * 获取模型输出的 DOM 结果（DeepSeek 特殊实现）
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
    const instance = new DeepSeek();
    return await instance.sendQuery(query);
  }
}
