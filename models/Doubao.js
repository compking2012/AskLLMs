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
    return 'div[data-testid="create_conversation_button"]';
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
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return 'div[data-testid="use-deep-thinking-switch-btn"]';
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
    return true;
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
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // TODO: 实现选择器
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

  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    console.log(`[MultiAI] ${this.name} - deepThink:`, deepThink);
    console.log(`[MultiAI] ${this.name} - webSearch:`, webSearch);
    
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

