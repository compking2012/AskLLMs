// AI 模型工具函数（用于页面操作）
// 这些函数会被注入到目标页面中执行
// 注意：这些函数需要在页面上下文中执行，所以会被序列化为字符串注入

// 生成工具函数的代码字符串（用于注入到页面）
function getModelUtilsCode() {
  return `
    // 等待元素出现
    function waitForElement(selector, timeout = 10000) {
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

    // 通用函数：设置contenteditable元素的内容
    function setContentEditable(el, text) {
      el.focus();
      el.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = text;
      el.appendChild(p);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 专门用于 Lexical 编辑器的输入函数
    function setLexicalEditor(el, text) {
      el.focus();
      el.click();
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
        console.log('[MultiAI] Lexical editor: text inserted via execCommand');
        return;
      } catch (e) {
        console.log('[MultiAI] execCommand failed, trying Range API');
        const range = document.createRange();
        range.selectNodeContents(el);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 设置 textarea 的值
    function setTextarea(el, text) {
      el.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 辅助函数：延迟等待
    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, ms);
      });
    }

    // 辅助函数：查找包含文本的元素
    function findElementByText(selector, text, timeout = 5000) {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const check = () => {
          const elements = Array.from(document.querySelectorAll(selector));
          const found = elements.find(el => {
            const elText = el.textContent.trim().toLowerCase();
            const searchText = text.toLowerCase();
            return elText.includes(searchText);
          });
          if (found) {
            resolve(found);
            return;
          }
          if (Date.now() - startTime < timeout) {
            setTimeout(check, 200);
          } else {
            resolve(null);
          }
        };
        check();
      });
    }
  `;
}

