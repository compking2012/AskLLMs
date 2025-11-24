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

  async sendQuery(query, startNewChat = false) {
    console.log(`[MultiAI] ${this.name} - startNewChat:`, startNewChat);
    
    // 如果启用了新对话，先开启新对话
    if (startNewChat) {
      await this.startNewChat();
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

