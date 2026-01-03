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
   * @returns {Promise<Element|Element[]|null>} 如果找到多个元素，返回数组；如果找到单个元素，返回该元素；如果未找到，返回null
   */
  waitForElement(selector, timeout = 15000) {
    return new Promise((resolve) => {
      // 检查函数：查找元素并返回结果
      const checkElements = () => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1) {
          // 如果找到多个元素，返回数组
          return Array.from(elements);
        } else if (elements.length === 1) {
          // 如果只找到一个元素，返回单个元素
          return elements[0];
        }
        return null;
      };
      
      // 首先检查元素是否已经存在
      const result = checkElements();
      if (result) {
        resolve(result);
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
        const result = checkElements();
        if (result) {
          resolve(result);
          return;
        }
        
        // 如果 body 不存在，无法使用 MutationObserver
        if (!document.body) {
          console.warn(`[MultiAI] ${this.name} document.body not available for MutationObserver`);
          setTimeout(() => resolve(null), timeout);
          return;
        }
        
        const observer = new MutationObserver(() => {
          const result = checkElements();
          if (result) {
            observer.disconnect();
            resolve(result);
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
    return '';
  }

  /**
   * 获取新聊天按钮选择器
   * @returns {string}
   */
  getNewChatButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 获取深度思考按钮选择器
   * @returns {string}
   */
  getDeepThinkButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 获取网络搜索按钮选择器
   * @returns {string}
   */
  getWebSearchButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 获取生成图片按钮选择器
   * @returns {string}
   */
  getGenImageButtonSelector() {
    return '';
  }

  /**
   * 获取文件上传按钮选择器（由子类实现）
   * @returns {string} 返回文件上传按钮的选择器
   */
  getFileUploadButtonSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 获取文件上传 input 选择器（由子类实现）
   * @returns {string} 返回隐藏的 input[type="file"] 选择器
   */
  getFileUploadInputSelector() {
    return ''; // 默认返回空字符串，表示未实现
  }

  /**
   * 判断是否处于查询模式（即发送按钮是否是"中止"状态）
   * 子类必须实现此方法，用于判断当前是否正在执行查询
   * @returns {boolean} 返回true表示处于查询模式（正在执行查询），false表示处于等待输入模式
   */
  isQueryingMode() {
    throw new Error('isQueryingMode must be implemented by subclass');
  }

  /**
   * 判断是否可进行深度思考
   * @returns {boolean} 返回true表示支持深度思考，false表示不支持
   */
  canDeepThink() {
    return true; // 默认返回true，子类可以重写此方法
  }

  /**
   * 判断是否可进行网络搜索
   * @returns {boolean|string} 返回true表示支持网络搜索，false表示不支持, "auto"表示自动，"exclusive"表示互斥, "inclusive"表示包含
   */
  canWebSearch() {
    return true; // 默认返回true，子类可以重写此方法
  }

  /**
   * 判断是否可生成图片
   * @returns {boolean} 返回true表示支持生成图片，false表示不支持
   */
  canGenImage() {
    return false; // 默认返回false，子类可以重写此方法
  }

  /**
   * 判断是否可上传文件
   * @returns {boolean} 返回true表示支持上传文件，false表示不支持
   */
  canUploadFile() {
    return false; // 默认返回false，子类可以重写此方法
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
   * 启用深度思考（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async enableDeepThink() {
    throw new Error('enableDeepThink must be implemented by subclass');
  }

  /**
   * 禁用深度思考（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async disableDeepThink() {
    throw new Error('disableDeepThink must be implemented by subclass');
  }

  /**
   * 启用网络搜索（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async enableWebSearch() {
    throw new Error('enableWebSearch must be implemented by subclass');
  }

  /**
   * 禁用网络搜索（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async disableWebSearch() {
    throw new Error('disableWebSearch must be implemented by subclass');
  }

  /**
   * 启用生成图片（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async enableGenImage() {
    throw new Error('enableGenImage must be implemented by subclass');
  }

  /**
   * 禁用生成图片（由子类实现）
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败或不需要
   */
  async disableGenImage() {
    throw new Error('disableGenImage must be implemented by subclass');
  }

  /**
   * 将文件设置到 input 元素中并触发事件
   * @param {HTMLInputElement|HTMLInputElement[]} inputElement - input[type="file"] 元素或元素数组
   * @param {File|File[]} files - 要上传的文件或文件数组
   * @returns {boolean} 是否成功设置
   */
  uploadFileToInput(inputElement, files) {
    if (!inputElement || !files) return false;
    
    try {
      const fileArray = Array.isArray(files) ? files : [files];
      if (fileArray.length === 0) return false;
      
      // 选择最佳 input（当传入多个 input 时根据 accept 匹配）
      const targetInput = this.pickBestFileInput(inputElement, fileArray);
      if (!targetInput) return false;

      // 如果 input 不支持 multiple，但用户传了多个文件：只上传第一个（避免覆盖/不确定行为）
      const effectiveFiles = (!targetInput.multiple && fileArray.length > 1)
        ? [fileArray[0]]
        : fileArray;

      if (!targetInput.multiple && fileArray.length > 1) {
        console.warn(`[MultiAI] ${this.name} input does not support multiple files, only uploading the first file: ${fileArray[0]?.name || ''}`);
      }

      // 如果 input 有 accept 限制，则过滤掉不被接受的文件（避免被平台前端拒绝或触发异常）
      const acceptedFiles = this.filterFilesByAccept(targetInput, effectiveFiles);
      if (acceptedFiles.length === 0) {
        console.warn(`[MultiAI] ${this.name} no files matched input.accept, upload aborted. accept="${targetInput.accept || ''}"`);
        return false;
      }

      if (acceptedFiles.length !== effectiveFiles.length) {
        const skipped = effectiveFiles.filter(f => !acceptedFiles.includes(f)).map(f => f?.name).filter(Boolean);
        if (skipped.length > 0) {
          console.warn(`[MultiAI] ${this.name} some files are not accepted by input.accept and will be skipped:`, skipped);
        }
      }

      const ok = this.setFilesToFileInput(targetInput, acceptedFiles);
      if (ok) {
        // 记录最近一次使用的 input，便于后续等待/调试
        this._lastUsedFileInput = targetInput;
      }
      return ok;
    } catch (e) {
      console.error(`[MultiAI] ${this.name} uploadFileToInput error:`, e);
      return false;
    }
  }

  /**
   * 选择最匹配的 file input（支持传入单个或多个 input）
   * @param {HTMLInputElement|HTMLInputElement[]} inputElement
   * @param {File[]} fileArray
   * @returns {HTMLInputElement|null}
   */
  pickBestFileInput(inputElement, fileArray) {
    if (!inputElement) return null;
    const inputs = Array.isArray(inputElement) ? inputElement : [inputElement];
    if (inputs.length === 0) return null;

    // 优先使用第一个文件来决定 input（大多数平台每次只能选一种类型的 input）
    const firstFile = fileArray?.[0];
    const name = (firstFile?.name || '').toLowerCase();
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    const mime = (firstFile?.type || '').toLowerCase();
    const mimeGroup = mime.includes('/') ? (mime.split('/')[0] + '/*') : '';

    const parseAccept = (accept) => {
      return (accept || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    };

    const acceptsFile = (input, file) => {
      const acceptItems = parseAccept(input?.accept);
      if (acceptItems.length === 0) return true; // 没限制就认为可用

      const fName = (file?.name || '').toLowerCase();
      const fExt = fName.includes('.') ? '.' + fName.split('.').pop() : '';
      const fMime = (file?.type || '').toLowerCase();
      const fMimeGroup = fMime.includes('/') ? (fMime.split('/')[0] + '/*') : '';

      return acceptItems.some(item => {
        if (item === '*/*') return true;
        if (item.startsWith('.')) return item === fExt;
        if (item.endsWith('/*')) return item === fMimeGroup;
        // 精确 MIME
        if (fMime) return item === fMime;
        return false;
      });
    };

    // 先找“accept 匹配”的 input
    if (firstFile) {
      const matched = inputs.find(input => acceptsFile(input, firstFile));
      if (matched) return matched;
    }

    // 退化：返回第一个
    return inputs[0];
  }

  /**
   * 设置 files 到 input[type=file] 并触发必要事件
   * @param {HTMLInputElement} input
   * @param {File[]} files
   * @returns {boolean}
   */
  setFilesToFileInput(input, files) {
    if (!input || !files || files.length === 0) return false;
    try {
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;

      // 触发一系列事件以确保网页检测到变化
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('file-selected', { bubbles: true, cancelable: true })); // 某些框架可能使用自定义事件
      return true;
    } catch (e) {
      console.error(`[MultiAI] ${this.name} setFilesToFileInput error:`, e);
      return false;
    }
  }

  /**
   * 根据 input.accept 过滤文件列表（如果 accept 为空则不过滤）
   * @param {HTMLInputElement} input
   * @param {File[]} files
   * @returns {File[]}
   */
  filterFilesByAccept(input, files) {
    const list = Array.isArray(files) ? files : (files ? [files] : []);
    if (!input) return list;

    const acceptRaw = (input.accept || '').trim().toLowerCase();
    if (!acceptRaw) return list; // 没限制

    const acceptItems = acceptRaw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (acceptItems.length === 0) return list;

    const matches = (file) => {
      const name = (file?.name || '').toLowerCase();
      const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
      const mime = (file?.type || '').toLowerCase();
      const mimeGroup = mime.includes('/') ? (mime.split('/')[0] + '/*') : '';

      return acceptItems.some(item => {
        if (item === '*/*') return true;
        if (item.startsWith('.')) return item === ext;
        if (item.endsWith('/*')) return item === mimeGroup;
        if (mime) return item === mime;
        return false;
      });
    };

    return list.filter(matches);
  }

  /**
   * 等待“上传动作被前端接收”的信号（尽量通用：文件名出现 / DOM 发生变化 / input.files 有值）
   * 注意：这不是 100% 的“已上传到服务器”判定，但能显著降低“文件还没被前端接收就发送”的概率。
   * @param {HTMLInputElement} input
   * @param {File[]} files
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForFileUploadAcknowledged(input, files, timeout = 15000) {
    const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
    if (!input || fileArray.length === 0) return false;

    const root = input.closest('form') || input.parentElement || document.body;
    const names = fileArray.map(f => f?.name).filter(Boolean);

    let mutated = false;
    let observer = null;
    try {
      observer = new MutationObserver(() => {
        mutated = true;
      });
      if (root) {
        observer.observe(root, { childList: true, subtree: true, attributes: true });
      }
    } catch (e) {
      // ignore
    }

    const start = Date.now();
    try {
      while (Date.now() - start < timeout) {
        // 1) 文件名在可见文本/属性中出现（最强信号）
        if (names.length > 0 && root) {
          const text = (root.innerText || root.textContent || '');
          const okByText = names.every(n => text.includes(n));
          if (okByText) return true;

          // 备用：检查 title / aria-label（有些 UI 不在 innerText 中展示）
          const labeled = root.querySelectorAll('[title],[aria-label]');
          const labelsText = Array.from(labeled).map(el => (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || '')).join('\n');
          const okByLabel = names.every(n => labelsText.includes(n));
          if (okByLabel) return true;
        }

        // 2) DOM 有变化且 input.files 有值（弱信号，但通常意味着前端接收了 change）
        if (mutated && input.files && input.files.length > 0) return true;

        // 3) input.files 有值且持续一段时间（非常弱，但至少说明已写入 input）
        if (input.files && input.files.length > 0 && (Date.now() - start) > 300) {
          // 如果没有任何更强信号，也先认为可继续（避免卡死）
          return true;
        }

        await new Promise(r => setTimeout(r, 200));
      }
      console.warn(`[MultiAI] ${this.name} waitForFileUploadAcknowledged timeout`);
      return false;
    } finally {
      if (observer) observer.disconnect();
    }
  }

  /**
   * 等待文件上传完成（通过检查UI变化）
   * @param {string} selector - 文件附件/预览元素的 CSS 选择器
   * @param {number} minCount - 期望的最小文件数量
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<boolean>}
   */
  async waitForFileUpload(selector, minCount = 1, timeout = 15000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= minCount) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          console.warn(`[MultiAI] ${this.name} waitForFileUpload timeout: found ${elements.length}, expected ${minCount}`);
          resolve(false);
          return;
        }
        
        requestAnimationFrame(check);
      };
      
      check();
    });
  }

  /**
   * 上传文件（支持单个或多个文件）
   * @param {File|File[]} files - 要上传的文件对象或文件数组
   * @returns {Promise<boolean>} 返回true表示成功，false表示失败
   */
  async uploadFiles(files) {
    try {
      const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
      if (fileArray.length === 0) return false;

      // 默认实现：尝试获取文件上传 input
      const inputSelector = this.getFileUploadInputSelector();
      if (!inputSelector) {
        console.warn(`[MultiAI] ${this.name} getFileUploadInputSelector not implemented`);
        return false;
      }

      let fileInput = await this.waitForElement(inputSelector, 2000);
      
      // 如果没找到，尝试点击上传按钮（如果有）
      if (!fileInput) {
        const btnSelector = this.getFileUploadButtonSelector();
        if (btnSelector) {
          const btn = await this.waitForElement(btnSelector, 2000);
          if (btn) {
            console.log(`[MultiAI] ${this.name} clicking upload button to reveal input`);
            btn.click();
            await new Promise(r => setTimeout(r, 1000));
            // 再次尝试查找 input
            fileInput = await this.waitForElement(inputSelector, 3000);
          }
        }
      }

      if (!fileInput) {
        console.warn(`[MultiAI] ${this.name} file input not found using selector: ${inputSelector}`);
        return false;
      }

      console.log(`[MultiAI] ${this.name} uploading ${fileArray.length} file(s)`);

      // 如果有多个 input（例如：不同 accept 的输入框），则按 accept 自动分组上传
      if (Array.isArray(fileInput)) {
        return await this.uploadFilesToMultipleInputs(fileInput, fileArray, 15000);
      }

      const ok = this.uploadFileToInput(fileInput, fileArray);
      if (!ok) return false;

      // 等待前端接收（尽量通用）
      const usedInput = this._lastUsedFileInput || fileInput;
      await this.waitForFileUploadAcknowledged(usedInput, fileArray, 15000);
      return true;
    } catch (error) {
      console.error(`[MultiAI] ${this.name} uploadFiles error:`, error);
      return false;
    }
  }

  /**
   * 多 input 场景：根据每个 input 的 accept 自动分组上传
   * @param {HTMLInputElement[]} inputs
   * @param {File[]} files
   * @param {number} timeoutPerGroup
   * @returns {Promise<boolean>}
   */
  async uploadFilesToMultipleInputs(inputs, files, timeoutPerGroup = 15000) {
    const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
    if (!inputs || inputs.length === 0 || fileArray.length === 0) return false;

    // 为每个文件选择最匹配的 input（按 accept）
    const groups = new Map(); // input -> File[]
    for (const file of fileArray) {
      const target = this.pickBestFileInput(inputs, [file]);
      if (!target) continue;
      const list = groups.get(target) || [];
      list.push(file);
      groups.set(target, list);
    }

    if (groups.size === 0) return false;

    let anySuccess = false;
    for (const [input, groupFiles] of groups.entries()) {
      // 非 multiple 输入：只取第一个文件
      const effective = (!input.multiple && groupFiles.length > 1) ? [groupFiles[0]] : groupFiles;
      if (!input.multiple && groupFiles.length > 1) {
        console.warn(`[MultiAI] ${this.name} input does not support multiple files, only uploading the first file for this input: ${groupFiles[0]?.name || ''}`);
      }

      const accepted = this.filterFilesByAccept(input, effective);
      if (accepted.length === 0) {
        console.warn(`[MultiAI] ${this.name} no acceptable files for one input group, skipping`);
        continue;
      }

      const ok = this.setFilesToFileInput(input, accepted);
      if (!ok) continue;

      this._lastUsedFileInput = input;
      await this.waitForFileUploadAcknowledged(input, accepted, timeoutPerGroup);
      anySuccess = true;
    }

    return anySuccess;
  }


  /**
   * 获取模型输出的 DOM 结果（由子类实现）
   * 注意：每个大模型 sendQuery 执行之后，response 都是流式返回的
   * 所以要么可以支持不停的流式返回，要么在所有 response 输出完之后一次性返回
   * 
   * @param {Function|null} onUpdate - 可选的回调函数，用于流式返回更新。如果提供，每次内容更新时调用 onUpdate(content)
   * @param {number} timeout - 超时时间（毫秒），默认 60000（60秒）
   * @returns {Promise<string>} 返回完整的响应文本内容。如果提供了 onUpdate，也会在每次更新时调用回调
   */
  async fetchResponse(onUpdate = null, timeout = 60000) {
    throw new Error('fetchResponse must be implemented by subclass');
  }

  /**
   * 发送查询（抽象方法，由子类实现）
   * @param {string} query - 查询文本
   * @param {boolean} startNewChat - 是否开启新对话
   * @param {boolean} deepThink - 是否启用深度思考
   * @param {boolean} webSearch - 是否启用网络搜索
   * @param {boolean} genImage - 是否启用生成图片
   * @param {File|File[]|null} file - 要上传的文件（可选）
   * @returns {Promise<boolean>}
   */
  async sendQuery(query, startNewChat = false, deepThink = false, webSearch = false, genImage = false, file = null) {
    throw new Error('sendQuery must be implemented by subclass');
  }

  /**
   * 停止当前正在进行的查询（抽象方法，由子类实现）
   * 通常通过点击发送按钮（当它处于"停止"状态时）来实现
   * @returns {Promise<boolean>} 返回true表示成功停止，false表示失败或没有正在进行的查询
   */
  async stopQuery() {
    throw new Error('stopQuery must be implemented by subclass');
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
   * 等待文件上传处理完成（抽象方法，由子类实现）
   * @param {number} timeout 超时时间（毫秒）
   * @returns {Promise<boolean>}
   */
  async waitForUploadFinished(timeout = 30000) {
    throw new Error('waitForUploadFinished must be implemented by subclass');
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
