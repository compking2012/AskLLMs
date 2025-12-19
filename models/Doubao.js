/**
 * 豆包模型类
 */
class Doubao extends AIModel {
  static NAME = '豆包';
  static URL = 'https://www.doubao.com';
  static ICON = 'icons/doubao.png';
  static I18N_KEY = 'platformDoubao';

  constructor() {
    super('豆包', 'www.doubao.com');
  }

  getInputSelector() {
    return 'textarea.semi-input-textarea';
  }

  getSendButtonSelector() {
    return 'button[id="flow-end-msg-send"]';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return 'div[data-testid="flow_chat_sidebar"]>div.relative:not([data-testid="chat_list_wrapper"])>div>div>div';
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div[data-testid="use-deep-thinking-switch-btn"]';
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
   * 判断是否可进行深度思考
   * @returns {boolean} 豆包支持深度思考
   */
  canDeepThink() {
    return true;
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean} 豆包支持网络搜索
   */
  canWebSearch() {
    return false;
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} 豆包支持生成图片
   */
  canGenImage() {
    return false; //FIXME: 豆包支持生成图片, 但目前有bug暂不启用
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} 豆包支持上传文件
   */
  canUploadFile() {
    return true;
  }

  /**
   * 上传文件（豆包特殊实现）
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
   * 启用深度思考（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling deep think...`);
      
      const div = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!div) {
        console.log(`[MultiAI] ${this.name} deep think div not found, skipping...`);
        return true;
      }
      
      // 查找内部的 button 元素来检查状态
      const btn = div.querySelector('button');
      if (!btn) {
        console.log(`[MultiAI] ${this.name} button not found inside div, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 data-checked 属性）
      let isActive = btn.getAttribute('data-checked') === 'true';
      
      if (!isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 在 button 上触发完整的鼠标事件
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
        
        // 方法3: 也在 div 上点击
        div.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 重新检查状态
        const newBtn = div.querySelector('button');
        if (newBtn) {
          isActive = newBtn.getAttribute('data-checked') === 'true';
          
          // 如果还是没有激活，尝试再次点击
          if (!isActive) {
            console.log(`[MultiAI] ${this.name} deep think not activated, retrying...`);
            btn.click();
            div.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 最后检查状态
            const finalBtn = div.querySelector('button');
            if (finalBtn) {
              isActive = finalBtn.getAttribute('data-checked') === 'true';
            }
          }
        }
      }
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`, isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用深度思考（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableDeepThink() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling deep think...`);
      
      const div = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!div) {
        console.log(`[MultiAI] ${this.name} deep think div not found, skipping...`);
        return true;
      }
      
      // 查找内部的 button 元素来检查状态
      const btn = div.querySelector('button');
      if (!btn) {
        console.log(`[MultiAI] ${this.name} button not found inside div, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 data-checked 属性）
      let isActive = btn.getAttribute('data-checked') === 'true';
      
      if (isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 在 button 上触发完整的鼠标事件
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
        
        // 方法3: 也在 div 上点击
        div.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 重新检查状态
        const newBtn = div.querySelector('button');
        if (newBtn) {
          isActive = newBtn.getAttribute('data-checked') === 'true';
          
          // 如果还是激活状态，尝试再次点击
          if (isActive) {
            console.log(`[MultiAI] ${this.name} deep think not deactivated, retrying...`);
            btn.click();
            div.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 最后检查状态
            const finalBtn = div.querySelector('button');
            if (finalBtn) {
              isActive = finalBtn.getAttribute('data-checked') === 'true';
            }
          }
        }
      }
      
      console.log(`[MultiAI] ${this.name} deep think disabled ✓`, !isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用网络搜索（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - enabling web search...`);
      
      const div = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!div) {
        console.log(`[MultiAI] ${this.name} web search div not found, skipping...`);
        return true;
      }
      
      // 查找内部的 button 元素来检查状态
      const btn = div.querySelector('button');
      if (!btn) {
        console.log(`[MultiAI] ${this.name} button not found inside div, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 data-checked 属性）
      let isActive = btn.getAttribute('data-checked') === 'true';
      
      if (!isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 在 button 上触发完整的鼠标事件
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
        
        // 方法3: 也在 div 上点击
        div.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 重新检查状态
        const newBtn = div.querySelector('button');
        if (newBtn) {
          isActive = newBtn.getAttribute('data-checked') === 'true';
          
          // 如果还是没有激活，尝试再次点击
          if (!isActive) {
            console.log(`[MultiAI] ${this.name} web search not activated, retrying...`);
            btn.click();
            div.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 最后检查状态
            const finalBtn = div.querySelector('button');
            if (finalBtn) {
              isActive = finalBtn.getAttribute('data-checked') === 'true';
            }
          }
        }
      }
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`, isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 禁用网络搜索（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableWebSearch() {
    try {
      console.log(`[MultiAI] ${this.name} - disabling web search...`);
      
      const div = await this.waitForElement(this.getDeepThinkButtonSelector(), 5000);
      if (!div) {
        console.log(`[MultiAI] ${this.name} web search div not found, skipping...`);
        return true;
      }
      
      // 查找内部的 button 元素来检查状态
      const btn = div.querySelector('button');
      if (!btn) {
        console.log(`[MultiAI] ${this.name} button not found inside div, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活（通过 data-checked 属性）
      let isActive = btn.getAttribute('data-checked') === 'true';
      
      if (isActive) {
        // 尝试多种方式点击
        // 方法1: 滚动到元素位置
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 方法2: 在 button 上触发完整的鼠标事件
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
        
        // 方法3: 也在 div 上点击
        div.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 重新检查状态
        const newBtn = div.querySelector('button');
        if (newBtn) {
          isActive = newBtn.getAttribute('data-checked') === 'true';
          
          // 如果还是激活状态，尝试再次点击
          if (isActive) {
            console.log(`[MultiAI] ${this.name} web search not deactivated, retrying...`);
            btn.click();
            div.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 最后检查状态
            const finalBtn = div.querySelector('button');
            if (finalBtn) {
              isActive = finalBtn.getAttribute('data-checked') === 'true';
            }
          }
        }
      }
      
      console.log(`[MultiAI] ${this.name} web search disabled ✓`, !isActive);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to disable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 启用生成图片（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async enableGenImage() {
    // 豆包自动支持生成图片，无需操作
    return true;
  }

  /**
   * 禁用生成图片（豆包特殊实现）
   * @returns {Promise<boolean>}
   */
  async disableGenImage() {
    // 豆包自动支持生成图片，无需操作
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
      return false;
    }
    
    console.log(`[MultiAI] ${this.name} input found:`, el.placeholder);
    this.setTextarea(el, query);
    
    // 等待更长时间让按钮激活
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 查找发送按钮
    let btn = document.querySelector(this.getSendButtonSelector());
    
    console.log(`[MultiAI] ${this.name} button found:`, !!btn, 'disabled:', btn?.disabled);
    
    if (btn && !btn.disabled) {
      btn.click();
      console.log(`[MultiAI] ${this.name} sent via button ✓`);
    } else if (!btn) {
      // 如果找不到按钮，尝试模拟 Enter 键
      console.log(`[MultiAI] ${this.name} button not found, trying Enter key`);
      this.simulateEnterKey(el);
      console.log(`[MultiAI] ${this.name} sent via Enter ✓`);
    } else {
      console.log(`[MultiAI] ${this.name} button disabled, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!btn.disabled) {
        btn.click();
        console.log(`[MultiAI] ${this.name} sent after retry ✓`);
      }
    }
    
    return true;
  }


  /**
   * 静态回退方法（当模型类未正确加载时使用）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  static async fallback(query) {
    const instance = new Doubao();
    return await instance.sendQuery(query);
  }
}

