/**
 * 千问模型类
 */
class Qwen extends AIModel {
  static NAME = '千问';
  static URL = 'https://www.qianwen.com';
  static ICON = 'icons/tongyi.png';
  static I18N_KEY = 'platformTongyi';

  constructor() {
    super('千问', 'www.qianwen.com');
  }

  getInputSelector() {
    return 'div.text-area-slot-container textarea';
  }

  getSendButtonSelector() {
    return ['div[class*="operateBtn"]'];
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'button.new-chat-btn';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div:not([aria-hidden="true"])>button[data-log-name="tool_bar"][data-log-params*="deepThink"]';
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
    // Qwen: 有两个 <input name="file" type="file">，分别对应文档（multiple）/图片（single）
    return 'input[name="file"][type="file"]';
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} 千问支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   *
   * 说明：千问的"联网搜索"与"深度思考"存在联动关系：
   * - `"inclusive"`：开启深度思考时会自动包含联网能力；但也允许用户显式开启联网 toggle。
   * 该返回值会影响 popup 中能力图标的展示逻辑（见 `popup.js` 的 `shouldShowWebSearchIcon`）。
   *
   * @returns {boolean|string} false | true | "auto" | "exclusive" | "inclusive"
   */
  canWebSearch() {
    return false; //  FIXME: 千问支持网络搜索, 但目前有bug暂不启用
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} 千问支持生成图片
   */
  canGenImage() {
    return false; // FIXME: 千问支持生成图片, 但目前有bug暂不启用
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} 千问支持上传文件
   */
  canUploadFile() {
    return true;
  }

  /**
   * 上传文件（兼容旧接口）
   * @param {File|File[]} files
   * @returns {Promise<boolean>}
   */
  async uploadFile(files) {
    return this.uploadFiles(files);
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
   * 启用深度思考（千问特殊实现）
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
      
      // 检查是否已经激活（通过类名或其他属性判断）
      // 千问的深度思考按钮点击即可切换，所以直接点击
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（千问特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 先尝试通过选择器查找深度思考按钮
      let deepThinkBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
           
      if (!deepThinkBtn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // 检查是否已激活（通过 selected- 类名判断）
      const isActive = deepThinkBtn.classList.toString().includes('selected-');
      
      if (isActive) {
        // 如果已激活，查找内部的关闭按钮并点击
        let closeBtn = deepThinkBtn.querySelector('div.flex.items-center.justify-center.overflow-hidden');
           
        if (closeBtn) {
          closeBtn.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`[MultiAI] ${this.name} deep think disabled ✓`);
        } else {
          console.log(`[MultiAI] ${this.name} close button not found, skipping...`);
        }
      } else {
        console.log(`[MultiAI] ${this.name} deep think is not active, skipping...`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（千问特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 先尝试通过选择器查找
      let btn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // 检查是否已经激活（通过类名或其他属性判断）
      // 千问的网络搜索按钮点击即可切换，所以直接点击
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索（千问特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 先尝试通过选择器查找网络搜索按钮
      let webSearchBtn = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
           
      if (!webSearchBtn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // 检查是否已激活（通过 selected- 类名判断）
      const isActive = webSearchBtn.classList.toString().includes('selected-');
      
      if (isActive) {
        // 如果已激活，查找内部的关闭按钮并点击
        let closeBtn = webSearchBtn.querySelector('div.flex.items-center.justify-center.overflow-hidden');
           
        if (closeBtn) {
          closeBtn.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`[MultiAI] ${this.name} web search disabled ✓`);
        } else {
          console.log(`[MultiAI] ${this.name} close button not found, skipping...`);
        }
      } else {
        console.log(`[MultiAI] ${this.name} web search is not active, skipping...`);
      }
      
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（千问特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    // TODO: 实现生成图片功能
    return true;
  }

  /**
   * 禁用生成图片（千问特殊实现）
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
    
    const el = await this.waitForElement(this.getInputSelector());
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
    
    // 聚焦
    el.focus();
    el.click();
    
    // 设置值 - 使用原生setter触发React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, query);
    
    // 触发多种事件
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    console.log(`[MultiAI] ${this.name} text set:`, query);
    
    // 等待更长时间让按钮激活
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试找发送按钮
    let btn = document.querySelector('div[class*="operateBtn"]');
    
    // 如果没找到，通过 span.anticon 找到父级 div
    if (!btn) {
      const iconSpan = document.querySelector('span.anticon');
      if (iconSpan && iconSpan.parentElement && iconSpan.parentElement.tagName === 'DIV') {
        btn = iconSpan.parentElement;
      }
    }
    
    console.log(`[MultiAI] ${this.name} button found:`, !!btn, 'tag:', btn?.tagName, 'class:', btn?.className);
    
    if (btn) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button not found`);
    }
    
    return true;
  }

  /**
   * 判断是否处于查询模式
   * 千问的发送按钮在生成时会变成停止状态
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
   * 千问的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
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
   * 获取响应区域选择器（Qwen 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    return 'div[class*="message-content"], div[class*="response"]';
  }

  /**
   * 获取模型输出的 DOM 结果（Qwen 特殊实现）
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
    const instance = new Qwen();
    return await instance.sendQuery(query);
  }
}

