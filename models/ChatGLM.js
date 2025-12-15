/**
 * 智谱清言模型类
 */
class ChatGLM extends AIModel {
  static NAME = '智谱清言';
  static URL = 'https://chatglm.cn';
  static ICON = 'icons/chatglm.png';
  static I18N_KEY = 'platformChatGLM';

  constructor() {
    super('智谱清言', 'chatglm.cn');
  }

  getInputSelector() {
    return 'div.input-box-inner textarea';
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
    // 使用 class="subject" 来定位，可能需要结合其他特征
    // 如果不够精确，startNewChat 方法中可以通过文本内容进一步筛选
    return 'div.subject';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div.mode-button'; // 需要通过文本内容进一步筛选
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return 'div.session-button-container div.mode-button:nth-of-type(2)';
  }

  /**
   * 获取生成图片按钮选择器
   * @returns {string}
   */
  getGenImageButtonSelector() {
    return ''; // TODO: 实现选择器
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} 智谱清言支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} 智谱清言支持网络搜索
   */
  canWebSearch() {
    return true;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} 智谱清言支持生成图片（自动）
   */
  canGenImage() {
    return "auto";
  }

  /**
   * 开启新对话
   * @returns {Promise<boolean>}
   */
  async startNewChat() {
    try {
      console.log(`[MultiAI] ${this.name} - starting new chat...`);
      
      // 由于 div.subject 可能匹配多个元素，需要通过特征来找到新对话按钮
      // 新对话按钮通常包含特定的图标（base64 图片）或在特定位置
      const maxWaitTime = 10000;
      const startTime = Date.now();
      let newChatBtn = null;
      
      while (!newChatBtn && (Date.now() - startTime) < maxWaitTime) {
        const allSubjects = document.querySelectorAll('div.subject');
        
        for (const subject of allSubjects) {
          // 查找包含图标的元素，新对话按钮通常有特定的图标
          const iconImg = subject.querySelector('img.subject-icon');
          if (iconImg && iconImg.src && iconImg.src.includes('data:image')) {
            // 检查是否是 base64 图片（新对话按钮的特征）
            // 或者检查文本内容是否包含特定关键词
            const textDiv = subject.querySelector('.subject-text');
            if (textDiv) {
              const text = textDiv.textContent.trim();
              // 如果文本是 "ChatGLM" 或空，可能是新对话按钮
              // 或者检查图标是否是新对话的图标
              if (text === 'ChatGLM' || text === '' || iconImg.src.includes('SidebarSession')) {
                newChatBtn = subject;
                break;
              }
            }
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
   * 启用深度思考（ChatGLM 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      // 等待模式按钮出现
      const maxWaitTime = 5000;
      const startTime = Date.now();
      let btn = null;
      
      while (!btn && (Date.now() - startTime) < maxWaitTime) {
        // 查找所有模式按钮
        const modeButtons = document.querySelectorAll('div.mode-button');
        
        for (const button of modeButtons) {
          // 查找包含"推理"文本的span
          const spans = button.querySelectorAll('span');
          for (const span of spans) {
            if (span.textContent.trim() === '推理') {
              btn = button;
              break;
            }
          }
          if (btn) break;
        }
        
        if (!btn) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // ChatGLM 的深度思考按钮点击即可切换
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（ChatGLM 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      // 等待模式按钮出现
      const maxWaitTime = 5000;
      const startTime = Date.now();
      let btn = null;
      
      while (!btn && (Date.now() - startTime) < maxWaitTime) {
        // 查找所有模式按钮
        const modeButtons = document.querySelectorAll('div.mode-button');
        
        for (const button of modeButtons) {
          // 查找包含"推理"文本的span
          const spans = button.querySelectorAll('span');
          for (const span of spans) {
            if (span.textContent.trim() === '推理') {
              btn = button;
              break;
            }
          }
          if (btn) break;
        }
        
        if (!btn) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // ChatGLM 的深度思考按钮点击即可切换
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（ChatGLM 特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      // 使用函数形式的 selector 获取第二个模式按钮
      const btn = await this.waitForElement(this.getWebSearchButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // ChatGLM 的网络搜索按钮点击即可切换
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索（ChatGLM 特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      // 使用函数形式的 selector 获取第二个模式按钮
      const btn = await this.waitForElement(this.getWebSearchButtonSelector(), 5000);
      
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // ChatGLM 的网络搜索按钮点击即可切换
      btn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（智谱清言特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    // 智谱清言自动支持生成图片，无需操作
    return true;
  }

  /**
   * 禁用生成图片（智谱清言特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    // 智谱清言自动支持生成图片，无需操作
    return true;
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
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new ChatGLM();
    return await instance.sendQuery(query);
  }
}

