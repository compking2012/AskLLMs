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
    return [
      'button[role="button"][class*="ds-atom-button ds-basic-button"]',
      'button[class*="ds-"][class*="send"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]'
    ];
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
    return 'button.ds-toggle-button:first-of-type';
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return 'button.ds-toggle-button:nth-of-type(2)';
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
    return 'div input[type="file"][multiple]';
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
    return false;
  }

  /**
   * 上传文件（DeepSeek 特殊实现）
   * @param {File|File[]} files - 要上传的文件对象或文件数组
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败
   */
  async uploadFile(files) {
    try {
      // 支持单个文件或文件数组
      const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
      
      if (fileArray.length === 0) {
        console.log(`[MultiAI] ${this.name} no files provided for upload`);
        return false;
      }

      // 方法1: 尝试通过文件上传按钮找到 input
      // 如果提供了 input 选择器，直接查找
      let fileInput = await this.waitForElement(this.getFileUploadInputSelector(), 5000);
      if (!fileInput) {
        console.log(`[MultiAI] ${this.name} file upload input not found`);
        return false;
      }
      
      console.log(`[MultiAI] ${this.name} file upload input found, uploading ${fileArray.length} file(s):`, fileArray.map(f => f.name).join(', '));
      
      // 使用 DataTransfer API 设置文件
      const dataTransfer = new DataTransfer();
      fileArray.forEach(file => {
        dataTransfer.items.add(file);
      });
      
      // 设置 input 的 files
      fileInput.files = dataTransfer.files;
      
      // 验证文件是否成功设置的函数
      const verifyFileUpload = () => {
        if (!fileInput.files || fileInput.files.length === 0) {
          return false;
        }
        
        // 检查所有文件是否都存在且名称和大小匹配
        const uploadedFiles = Array.from(fileInput.files);
        const expectedFiles = fileArray.map(f => ({ name: f.name, size: f.size }));
        
        // 检查每个期望的文件是否都在上传的文件列表中
        for (const expectedFile of expectedFiles) {
          const found = uploadedFiles.some(uploadedFile => 
            uploadedFile.name === expectedFile.name && 
            uploadedFile.size === expectedFile.size
          );
          if (!found) {
            return false;
          }
        }
        
        // 确保上传的文件数量至少等于期望的文件数量
        return uploadedFiles.length >= expectedFiles.length;
      };
      
      // 立即验证文件是否成功设置
      if (!verifyFileUpload()) {
        console.error(`[MultiAI] ${this.name} file verification failed immediately`);
        return false;
      }
      
      // 触发 change 事件（这是关键！）
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // 有些应用可能需要 input 事件
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 有些应用可能需要自定义事件
      fileInput.dispatchEvent(new Event('file-selected', { bubbles: true }));
      
      // 持续验证文件是否成功上传，确保100%上传完成
      // 使用轮询方式检查文件是否成功设置到 input 中
      const maxWaitTime = 10000; // 最大等待10秒
      const checkInterval = 200; // 每200ms检查一次
      const startTime = Date.now();
      
      while ((Date.now() - startTime) < maxWaitTime) {
        // 检查文件是否成功上传
        if (verifyFileUpload()) {
          const elapsedTime = Date.now() - startTime;
          console.log(`[MultiAI] ${this.name} ${fileArray.length} file(s) uploaded ✓ (verified after ${elapsedTime}ms)`);
          return true;
        }
        
        // 等待一段时间后再次检查
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
      
      // 超时后最后检查一次
      if (verifyFileUpload()) {
        console.log(`[MultiAI] ${this.name} ${fileArray.length} file(s) uploaded ✓ (verified after timeout)`);
        return true;
      }
      
      console.error(`[MultiAI] ${this.name} file upload verification timeout or files were rejected`);
      return false;
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
    console.log(`[MultiAI] ${this.name} - file:`, file ? file.name : null);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
    }
    
    // 如果有文件，先上传文件
    if (file && this.canUploadFile()) {
      await this.uploadFile(file);
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
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new DeepSeek();
    return await instance.sendQuery(query);
  }
}
