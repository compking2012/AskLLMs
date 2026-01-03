/**
 * 文心一言模型类
 */
class Wenxin extends AIModel {
  static NAME = '文心一言';
  static URL = 'https://yiyan.baidu.com';
  static ICON = 'icons/wenxin.png';
  static I18N_KEY = 'platformWenxin';

  constructor() {
    super('文心一言', 'yiyan.baidu.com');
  }

  getInputSelector() {
    return 'div.yc-editor[contenteditable="true"][role="textbox"]';
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
    // 使用 class 名称的部分匹配，CSS Modules 的哈希值会变化，但 "newSession" 部分应该稳定
    return 'div[class*="sideBarTop"]>div>div[class*="newSession"]';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getMenuButtonSelector() {
    // 深度思考按钮，包含"思考·自动"文本
    return 'div[class*="footbarLeft"] div[class*="box"]>div[class*="item"]';
  }

  /**
   * 获取样式按钮选择器（第5个button.group）
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    // 返回选择器，用于查找第2个button.group
    return 'div[class="ant-popover-inner-content"] div[class*="dtModeContainer"]>div[class*="dtModeItem"]:nth-of-type(2)';
  }

  /**
   * 获取样式按钮选择器（第5个button.group）
   * @returns {string}
   */
  getRemoveDeepThinkButtonSelector() {
    // 返回选择器，用于查找第3个button.group
    return 'div[class="ant-popover-inner-content"] div[class*="dtModeContainer"]>div[class*="dtModeItem"]:nth-of-type(3)';
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
    // Wenxin: 页面中有多组 <input type="file" accept=... multiple style="display:none">（文档/图片/音频/视频）
    // 用 accept 过滤，避免误命中其他 file input
    return 'input[type="file"][accept]';
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
   * @returns {boolean} 文心一言不支持网络搜索
   */
  canWebSearch() {
    return false;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} 文心一言不支持生成图片
   */
  canGenImage() {
    return false;
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} 文心一言支持上传文件
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
      
      // 步骤1: 找到并点击深度思考按钮
      const menuButton = await this.waitForElement(this.getMenuButtonSelector(), 5000);
      if (!menuButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      console.log(`[MultiAI] ${this.name} deep think button found, clicking...`);
      menuButton.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第二个dtModeItem（开启）
      const deepThinkButton = await this.waitForElement(this.getDeepThinkButtonSelector(), 3000);
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      // 第二个菜单项是"开启"
      console.log(`[MultiAI] ${this.name} enable deep think menu item found, clicking...`);
      deepThinkButton.click();
      
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
      
      // 步骤1: 找到并点击深度思考按钮
      const menuButton = await this.waitForElement(this.getMenuButtonSelector(), 5000);
      if (!menuButton) {
        console.log(`[MultiAI] ${this.name} deep think button not found, may already be disabled`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} deep think button found, clicking...`);
      menuButton.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第三个dtModeItem（关闭）
      const removeDeepThinkButton = await this.waitForElement(this.getRemoveDeepThinkButtonSelector(), 3000);
      if(!removeDeepThinkButton) {
        console.log(`[MultiAI] ${this.name} remove deep think button not found, may already be disabled`);
        return true;
      }
      
      // 第三个菜单项是"关闭"
      console.log(`[MultiAI] ${this.name} disable deep think menu item found, clicking...`);
      removeDeepThinkButton.click();
      
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
      
      // 步骤1: 找到并点击深度思考按钮
      const deepThinkButton = await this.waitForElement('div.ant-popover-open', 5000);
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} web search button found, clicking...`);
      deepThinkButton.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第二个dtModeItem（开启）
      const menuItems = await this.waitForElement('div.dtModeItem__R58Gzmsu', 3000);
      if (!menuItems) {
        console.log(`[MultiAI] ${this.name} menu items not found, skipping...`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div.dtModeItem__R58Gzmsu');
      if (allMenuItems.length < 2) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), skipping...`);
        return true;
      }
      
      // 第二个菜单项是"开启"
      const enableButton = allMenuItems[1];
      console.log(`[MultiAI] ${this.name} enable web search menu item found, clicking...`);
      enableButton.click();
      
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
      
      // 步骤1: 找到并点击深度思考按钮
      const deepThinkButton = await this.waitForElement('.ant-popover-open', 5000);
      if (!deepThinkButton) {
        console.log(`[MultiAI] ${this.name} web search button not found, may already be disabled`);
        return true;
      }
      
      console.log(`[MultiAI] ${this.name} web search button found, clicking...`);
      deepThinkButton.click();
      
      // 等待菜单出现
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步骤2: 找到菜单中的第三个dtModeItem（关闭）
      const menuItems = await this.waitForElement('div.dtModeItem__R58Gzmsu', 3000);
      if (!menuItems) {
        console.log(`[MultiAI] ${this.name} menu items not found, may already be disabled`);
        return true;
      }
      
      // 查找所有菜单项
      const allMenuItems = document.querySelectorAll('div.dtModeItem__R58Gzmsu');
      if (allMenuItems.length < 3) {
        console.log(`[MultiAI] ${this.name} not enough menu items found (found ${allMenuItems.length}), may already be disabled`);
        return true;
      }
      
      // 第三个菜单项是"关闭"
      const disableButton = allMenuItems[2];
      console.log(`[MultiAI] ${this.name} disable web search menu item found, clicking...`);
      disableButton.click();
      
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
   * 启用生成图片
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    // 文心一言自动支持生成图片，无需操作
    return true;
  }

  /**
   * 禁用生成图片
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    // 文心一言自动支持生成图片，无需操作
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
      btn = this.findSendButtonByKeywords(['发送']);
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
   * 文心一言的发送按钮在生成时会变成停止状态
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
   * 文心一言的停止按钮就是发送按钮，当正在生成时，按钮会变成停止状态
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
   * 获取响应区域选择器（Wenxin 特殊实现）
   * @returns {string} 返回响应区域的选择器
   */
  getResponseSelector() {
    return 'div[class*="message-content"], div[class*="response"]';
  }

  /**
   * 获取模型输出的 DOM 结果（Wenxin 特殊实现）
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
    const instance = new Wenxin();
    return await instance.sendQuery(query);
  }
}
