/**
 * MiniMax 模型类
 */
class MiniMax extends AIModel {
  static NAME = 'MiniMax';
  static URL = 'https://agent.minimaxi.com';
  static ICON = 'icons/minimax.png';
  static I18N_KEY = null;

  constructor() {
    super('MiniMax', 'agent.minimaxi.com');
  }

  getInputSelector() {
    return 'div.chat-input textarea';
  }

  getSendButtonSelector() {
    return [
      'button[class*="send"]'
    ];
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'div.new-task-text-div';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return ''; // TODO: 实现选择器
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
    return ''; // TODO: 实现选择器
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} MiniMax 不支持深度思考
   */
  canDeepThink() {
    return false;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} MiniMax 不支持网络搜索
   */
  canWebSearch() {
    return false;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} MiniMax 支持生成图片
   */
  canGenImage() {
    return false; // FIXME: MiniMax 支持生成图片, 但目前有bug暂不启用
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} MiniMax 不支持上传文件
   */
  canUploadFile() {
    return false;
  }

  /**
   * 上传文件（MiniMax 特殊实现）
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
   * 启用深度思考（MiniMax 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    // MiniMax 不支持深度思考，直接返回 true 表示跳过
    return true;
  }

  /**
   * 禁用深度思考（MiniMax 不支持深度思考）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    // MiniMax 不支持深度思考，直接返回 true 表示跳过
    return true;
  }

  /**
   * 启用网络搜索（MiniMax 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    // MiniMax 的网络搜索实现，暂时和深度思考一致
    return true;
  }

  /**
   * 禁用网络搜索（MiniMax 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    // MiniMax 的网络搜索实现，暂时和深度思考一致
    return true;
  }

  /**
   * 启用生成图片（MiniMax 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    return false;
  }

  /**
   * 禁用生成图片（MiniMax 特殊实现）
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
    console.log(`[MultiAI] ${this.name} - file:`, file ? file.name : null);
    
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
      btn = this.findSendButtonByKeywords(['发送', 'send']);
    }
    
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else {
      this.simulateEnterKey(el);
      console.log(`[MultiAI] ${this.name} sent via Enter ✓`);
    }
    
    return true;
  }

  /**
   * 判断是否处于查询模式
   * MiniMax的发送按钮在生成时会变成停止状态
   * @returns {boolean}
   */
  isQueryingMode() {
    try {
      let btn = this.findSendButton(this.getSendButtonSelector());
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
   * MiniMax的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
   * @returns {Promise<boolean>}
   */
  async stopQuery() {
    try {
      let btn = this.findSendButton(this.getSendButtonSelector());
      if (!btn) {
        btn = this.findSendButtonByKeywords(['停止', 'stop', '取消', 'cancel']);
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
   * 获取响应区域选择器（MiniMax 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    return 'div[class*="message-content"], div[class*="response"]';
  }

  /**
   * 获取模型输出的 DOM 结果（MiniMax 特殊实现）
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
    const instance = new MiniMax();
    return await instance.sendQuery(query);
  }
}

