/**
 * AI Model 基类
 * 所有 AI 平台模型的基类，提供通用的方法
 */
class AIModel {
  // 静态属性：平台信息（子类应覆盖这些属性）
  static NAME = '';
  static URL = '';
  static ICON = '';
  static I18N_KEY = null; // 如果有 i18n 键，子类应设置此属性

  constructor(name, domain) {
    this.name = name;
    this.domain = domain;
  }

  /**
   * 等待元素出现
   * @param {string} selector - CSS 选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<Element|null>}
   */
  waitForElement(selector, timeout = 15000) {
    return new Promise((resolve) => {
      // 首先检查元素是否已经存在
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      // 等待 document.body 存在
      const waitForBody = () => {
        if (document.body) {
          startObserving();
        } else {
          // 如果 body 不存在，等待 DOMContentLoaded
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving, { once: true });
          } else {
            // 如果已经加载完成但 body 仍不存在，可能是特殊页面
            setTimeout(() => {
              if (document.body) {
                startObserving();
              } else {
                console.warn(`[MultiAI] ${this.name} document.body not available, element may not be found`);
                resolve(null);
              }
            }, 100);
          }
        }
      };
      
      const startObserving = () => {
        // 再次检查元素（可能在等待 body 时已经出现）
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }
        
        // 如果 body 不存在，无法使用 MutationObserver
        if (!document.body) {
          console.warn(`[MultiAI] ${this.name} document.body not available for MutationObserver`);
          setTimeout(() => resolve(null), timeout);
          return;
        }
        
        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });
        
        try {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: false
          });
        } catch (e) {
          console.error(`[MultiAI] ${this.name} MutationObserver error:`, e);
          observer.disconnect();
          resolve(null);
          return;
        }
        
        // 设置超时
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      };
      
      waitForBody();
    });
  }

  /**
   * 设置 contenteditable 元素的内容
   * @param {HTMLElement} el - 元素
   * @param {string} text - 文本内容
   */
  setContentEditable(el, text) {
    el.focus();
    
    // 清空现有内容
    el.innerHTML = '';
    
    // 创建段落元素
    const p = document.createElement('p');
    p.textContent = text;
    el.appendChild(p);
    
    // 触发各种输入事件
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * 设置 textarea 的内容
   * @param {HTMLTextAreaElement} el - textarea 元素
   * @param {string} text - 文本内容
   */
  setTextarea(el, text) {
    el.focus();
    
    // 使用原生setter触发React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, text);
    
    // 触发事件
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * 设置 Lexical 编辑器的内容
   * @param {HTMLElement} el - Lexical 编辑器元素
   * @param {string} text - 文本内容
   */
  setLexicalEditor(el, text) {
    el.focus();
    el.click();
    
    // 方法1: 尝试使用 execCommand (适用于 Lexical)
    try {
      // 选中所有内容
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 删除选中的内容
      document.execCommand('delete', false, null);
      // 插入文本（这会自动触发 input 事件）
      document.execCommand('insertText', false, text);
      console.log(`[MultiAI] ${this.name} Lexical editor: text inserted via execCommand`);
      return; // execCommand 成功，直接返回
    } catch (e) {
      console.log(`[MultiAI] ${this.name} execCommand failed, trying Range API`);
      // 方法2: 使用 Range 和 Selection API（需要手动触发事件）
      const range = document.createRange();
      range.selectNodeContents(el);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.collapse(false);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 触发事件
      el.dispatchEvent(new InputEvent('beforeinput', { 
        bubbles: true, 
        cancelable: true, 
        inputType: 'insertText', 
        data: text 
      }));
      el.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        inputType: 'insertText', 
        data: text 
      }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * 查找发送按钮（通用方法）
   * @param {Array<string>} selectors - 选择器数组，按优先级排序
   * @returns {HTMLElement|null}
   */
  findSendButton(selectors) {
    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn && !btn.disabled) {
        return btn;
      }
    }
    return null;
  }

  /**
   * 通过关键词搜索发送按钮
   * @param {Array<string>} keywords - 关键词数组
   * @returns {HTMLElement|null}
   */
  findSendButtonByKeywords(keywords) {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(b => {
      const text = b.textContent.trim().toLowerCase();
      const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
      const dataTestId = (b.getAttribute('data-testid') || '').toLowerCase();
      const className = b.className.toLowerCase();
      
      const matches = keywords.some(kw => 
        text.includes(kw) || ariaLabel.includes(kw) || dataTestId.includes(kw) || className.includes(kw)
      );
      
      return matches && !b.disabled;
    }) || null;
  }

  /**
   * 模拟 Enter 键按下
   * @param {HTMLElement} el - 目标元素
   */
  simulateEnterKey(el) {
    el.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    }));
    el.dispatchEvent(new KeyboardEvent('keypress', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    }));
    el.dispatchEvent(new KeyboardEvent('keyup', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    }));
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 开启新对话（可选方法，由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async startNewChat() {
    // 默认实现：返回true表示不需要开启新对话或功能未实现
    return true;
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 启用深度思考（可选方法，由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async enableDeepThink() {
    try {
      const selector = this.getDeepThinkButtonSelector();
      if (!selector) {
        return true; // 如果未实现，返回true表示跳过
      }
      
      const btn = await this.waitForElement(selector, 5000);
      if (!btn) {
        console.log(`[MultiAI] ${this.name} deep think button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活
      const isActive = btn.checked || btn.classList.contains('active') || 
                       btn.getAttribute('aria-pressed') === 'true' ||
                       btn.getAttribute('data-active') === 'true';
      
      if (!isActive) {
        btn.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[MultiAI] ${this.name} deep think enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable deep think:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 启用网络搜索（可选方法，由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async enableWebSearch() {
    try {
      const selector = this.getWebSearchButtonSelector();
      if (!selector) {
        return true; // 如果未实现，返回true表示跳过
      }
      
      const btn = await this.waitForElement(selector, 5000);
      if (!btn) {
        console.log(`[MultiAI] ${this.name} web search button not found, skipping...`);
        return true;
      }
      
      // 检查按钮是否已经激活
      const isActive = btn.checked || btn.classList.contains('active') || 
                       btn.getAttribute('aria-pressed') === 'true' ||
                       btn.getAttribute('data-active') === 'true';
      
      if (!isActive) {
        btn.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[MultiAI] ${this.name} web search enabled ✓`);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} failed to enable web search:`, error);
      return true; // 即使失败也继续执行
    }
  }

  /**
   * 发送查询（抽象方法，由子类实现）
   * @param {string} query - 查询文本
   * @param {boolean} startNewChat - 是否开启新对话
   * @param {boolean} deepThink - 是否启用深度思考
   * @param {boolean} webSearch - 是否启用网络搜索
   * @returns {Promise<boolean>}
   */
  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false) {
    throw new Error('sendQuery must be implemented by subclass');
  }

  /**
   * 获取输入框选择器（由子类实现）
   * @returns {string|Array<string>}
   */
  getInputSelector() {
    throw new Error('getInputSelector must be implemented by subclass');
  }

  /**
   * 获取发送按钮选择器（由子类实现）
   * @returns {string|Array<string>}
   */
  getSendButtonSelector() {
    throw new Error('getSendButtonSelector must be implemented by subclass');
  }

  /**
   * 静态方法：创建临时实例用于回退
   * @param {Function} ModelClass - 模型类构造函数
   * @returns {AIModel} 模型实例
   */
  static createInstance(ModelClass) {
    return new ModelClass();
  }

  /**
   * 获取平台信息（使用静态属性）
   * @returns {{name: string, url: string}}
   */
  static getSiteInfo() {
    return {
      name: this.NAME || '',
      url: this.URL || ''
    };
  }

  /**
   * 获取平台显示名称（支持 i18n）
   * 注意：此方法只处理当前类的显示名称，不涉及其他子类
   * @param {Function} i18n - i18n 函数
   * @returns {string} 显示名称
   */
  static getDisplayName(i18n) {
    if (this.I18N_KEY && i18n) {
      return i18n(this.I18N_KEY);
    }
    return this.NAME || ''; // 如果没有 i18n 键，直接返回名称
  }
}

