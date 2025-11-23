/**
 * AI Model 基类
 * 所有 AI 平台模型的基类，提供通用的方法
 */
class AIModel {
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
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
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
   * 发送查询（抽象方法，由子类实现）
   * @param {string} query - 查询文本
   * @returns {Promise<boolean>}
   */
  async sendQuery(query) {
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
   * 平台图标映射
   */
  static PLATFORM_ICONS = {
    "ChatGPT": "icons/chatgpt.png",
    "Claude": "icons/claude.png",
    "Gemini": "icons/gemini.png",
    "Grok": "icons/grok.png",
    "千问": "icons/tongyi.png",
    "豆包": "icons/doubao.png",
    "DeepSeek": "icons/deepseek.png",
    "Kimi": "icons/kimi.png",
    "文心一言": "icons/wenxin.png",
    "智谱清言": "icons/chatglm.png",
    "MiniMax": "icons/minimax.png",
    "腾讯元宝": "icons/yuanbao.png"
  };

  /**
   * 平台名称到 i18n 键的映射（只对中文名字）
   */
  static PLATFORM_I18N_KEYS = {
    "千问": "platformTongyi",
    "豆包": "platformDoubao",
    "文心一言": "platformWenxin",
    "智谱清言": "platformChatGLM",
    "腾讯元宝": "platformYuanbao"
  };

  /**
   * 默认设置
   */
  static DEFAULT_SETTINGS = {
    theme: 'auto',
    language: 'auto',
    visiblePlatforms: ['ChatGPT', 'Claude', 'Gemini', 'Grok', '千问', '豆包', 'DeepSeek', 'Kimi', '文心一言', '智谱清言', 'MiniMax', '腾讯元宝'],
    tabGroupTitle: '',
    colorMode: 'random',
    fixedColor: 'blue'
  };

  /**
   * 获取平台显示名称（支持 i18n）
   * @param {string} platform - 平台名称
   * @param {Function} i18n - i18n 函数
   * @returns {string} 显示名称
   */
  static getPlatformDisplayName(platform, i18n) {
    const i18nKey = AIModel.PLATFORM_I18N_KEYS[platform];
    if (i18nKey && i18n) {
      return i18n(i18nKey);
    }
    return platform; // 英文名字直接返回
  }
}

