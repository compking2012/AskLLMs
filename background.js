const AI_SITES = [
    { name: "ChatGPT", url: "https://chatgpt.com" },
    { name: "Claude", url: "https://claude.ai" },
    { name: "Gemini", url: "https://gemini.google.com" },
    { name: "Grok", url: "https://grok.com" },
    { name: "通义千问", url: "https://www.tongyi.com" },
    { name: "豆包", url: "https://www.doubao.com" },
    { name: "DeepSeek", url: "https://chat.deepseek.com" },
    { name: "Kimi", url: "https://www.kimi.com" },
    { name: "文心一言", url: "https://yiyan.baidu.com" },
    { name: "智谱清言", url: "https://chatglm.cn" },
    { name: "MiniMax", url: "https://agent.minimaxi.com" },
    { name: "腾讯元宝", url: "https://yuanbao.tencent.com" }
  ];
  
  // 注入到目标 AI 页面的脚本（发送 query）
  function sendQueryToPage(query) {
    const host = window.location.hostname;
  
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
    
    // 专门用于 Lexical 编辑器的输入函数（同步版本）
    function setLexicalEditor(el, text) {
      el.focus();
      el.click();
      
      // 方法1: 尝试使用 execCommand (适用于 Lexical)
      // execCommand 会自动触发 input 事件，所以不需要手动触发
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
        console.log('[MultiAI] Lexical editor: text inserted via execCommand');
        return; // execCommand 成功，直接返回，不需要手动触发事件
      } catch (e) {
        console.log('[MultiAI] execCommand failed, trying Range API');
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
        
        // 只在 Range API 方法时触发事件（因为 execCommand 已经自动触发了）
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
  
    // 通用函数：设置textarea的内容
    function setTextarea(el, text) {
      el.focus();
      
      // 使用原生setter触发React
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, text);
      
      // 触发事件
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  
    const actions = {
      'chatgpt.com': async () => {
        console.log('[MultiAI] ChatGPT - waiting for input...');
        
        // 等待输入框出现
        const el = await waitForElement('div.ProseMirror#prompt-textarea[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] ChatGPT input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] ChatGPT input found, setting text...');
        setContentEditable(el, query);
        console.log('[MultiAI] ChatGPT text set:', query);
        
        // 等待发送按钮出现并激活
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const btn = await waitForElement('button[data-testid="send-button"]:not([disabled])');
        if (btn) {
          btn.click();
          console.log('[MultiAI] ChatGPT sent ✓');
        } else {
          console.log('[MultiAI] ChatGPT button not ready');
        }
        
        return true;
      },
      'claude.ai': async () => {
        console.log('[MultiAI] Claude - waiting for input...');
        
        const el = await waitForElement('div[data-testid="chat-input"][contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] Claude input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Claude input found, setting text...');
        setContentEditable(el, query);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const btn = await waitForElement('button[aria-label="Send message"]');
        if (btn) {
          btn.click();
          console.log('[MultiAI] Claude sent ✓');
        } else {
          console.log('[MultiAI] Claude button not found');
        }
        
        return true;
      },
      'gemini.google.com': async () => {
        console.log('[MultiAI] Gemini - waiting for input...');
        
        const el = await waitForElement('rich-textarea .ql-editor[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] Gemini input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Gemini input found, setting text...');
        setContentEditable(el, query);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const btn = await waitForElement('button.send-button[aria-label="发送"], button[aria-label*="发送"]');
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] Gemini sent ✓');
        } else {
          console.log('[MultiAI] Gemini button not ready');
        }
        
        return true;
      },
      'www.tongyi.com': async () => {
        console.log('[MultiAI] Tongyi - waiting for input...');
        
        // 使用父容器定位 textarea
        const el = await waitForElement('div.text-area-slot-container textarea');
        if (!el) {
          console.log('[MultiAI] Tongyi input not found after waiting');
          // 打印所有textarea元素帮助调试
          const allTextareas = document.querySelectorAll('textarea');
          console.log('[MultiAI] Tongyi found textareas:', allTextareas.length);
          allTextareas.forEach((ta, i) => {
            console.log(`  [${i}] placeholder: "${ta.placeholder}", class: "${ta.className}"`);
          });
          return false;
        }
        
        console.log('[MultiAI] Tongyi input found:', el.placeholder);
        
        // 聚焦
        el.focus();
        el.click();
        
        // 设置值 - 使用原生setter触发React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, query);
        
        // 触发多种事件
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        
        console.log('[MultiAI] Tongyi text set:', query);
        
        // 等待更长时间让按钮激活
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 尝试找发送按钮 - 优先直接选择 div.operateBtn
        let btn = document.querySelector('div[class*="operateBtn"]');
        
        // 如果没找到，通过 span.anticon 找到父级 div
        if (!btn) {
          const iconSpan = document.querySelector('span.anticon');
          if (iconSpan && iconSpan.parentElement && iconSpan.parentElement.tagName === 'DIV') {
            btn = iconSpan.parentElement;
          }
        }
        
        console.log('[MultiAI] Tongyi button found:', !!btn, 'tag:', btn?.tagName, 'class:', btn?.className);
        
        if (btn) {
          // 点击 div，即使它有 disabled 属性也尝试点击
          btn.click();
          console.log('[MultiAI] Tongyi sent ✓');
        } else {
          console.log('[MultiAI] Tongyi button not found');
        }
        
        return true;
      },
      'www.doubao.com': async () => {
        console.log('[MultiAI] Doubao - waiting for input...');
        
        // 豆包使用真正的 textarea
        const el = await waitForElement('textarea.semi-input-textarea');
        if (!el) {
          console.log('[MultiAI] Doubao input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Doubao input found:', el.placeholder);
        setTextarea(el, query);
        
        // 等待更长时间让按钮激活
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 查找发送按钮 - 使用具体的 ID
        let btn = document.querySelector('button[id="flow-end-msg-send"]');
        
        console.log('[MultiAI] Doubao button found:', !!btn, 'disabled:', btn?.disabled);
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] Doubao sent via button ✓');
        } else if (!btn) {
          // 如果找不到按钮，尝试模拟 Enter 键
          console.log('[MultiAI] Doubao button not found, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter', 
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
          console.log('[MultiAI] Doubao sent via Enter ✓');
        } else {
          console.log('[MultiAI] Doubao button disabled, waiting...');
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!btn.disabled) {
            btn.click();
            console.log('[MultiAI] Doubao sent after retry ✓');
          }
        }
        
        return true;
      },
      'deepseek.com': async () => {
        console.log('[MultiAI] DeepSeek - waiting for input...');
        
        // 尝试多个可能的选择器
        const el = await waitForElement('textarea[class*="ds-"], textarea[placeholder*="消息"], textarea[placeholder*="Message"], textarea');
        if (!el) {
          console.log('[MultiAI] DeepSeek input not found after waiting');
          // 打印所有textarea帮助调试
          const allTextareas = document.querySelectorAll('textarea');
          console.log('[MultiAI] DeepSeek found textareas:', allTextareas.length);
          allTextareas.forEach((ta, i) => {
            console.log(`  [${i}] placeholder: "${ta.placeholder}", class: "${ta.className}"`);
          });
          return false;
        }
        
        console.log('[MultiAI] DeepSeek input found:', el.placeholder);
        setTextarea(el, query);
        
        // 等待更长时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = null;
        
        // 方法1: 通过 class (ds-前缀)
        btn = document.querySelector('button[class*="ds-"][class*="send"]');
        console.log('[MultiAI] DeepSeek button method 1 (ds-class):', !!btn);
        
        // 方法2: 通过 aria-label
        if (!btn) {
          btn = document.querySelector('button[aria-label*="Send"], button[aria-label*="发送"]');
          console.log('[MultiAI] DeepSeek button method 2 (aria-label):', !!btn);
        }
        
        // 方法3: 查找所有按钮
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          console.log('[MultiAI] DeepSeek total buttons:', buttons.length);
          
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const className = b.className.toLowerCase();
            
            // 查找包含发送相关关键词的按钮
            const keywords = ['send', 'submit', '发送'];
            const matches = keywords.some(kw => 
              text.includes(kw) || ariaLabel.includes(kw) || className.includes(kw)
            );
            
            return matches && !b.disabled;
          });
          console.log('[MultiAI] DeepSeek button method 3 (search):', !!btn);
        }
        
        // 方法4: 如果还没找到，尝试模拟 Enter 键
        if (!btn || btn.disabled) {
          console.log('[MultiAI] DeepSeek button not found or disabled, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter', 
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
          console.log('[MultiAI] DeepSeek sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] DeepSeek sent via button ✓');
        }
        
        return true;
      },
      'www.kimi.com': async () => {
        console.log('[MultiAI] Kimi - waiting for input...');
        
        // Kimi 使用 Lexical 编辑器，是 contenteditable div
        // 优先选择精确的 Lexical 编辑器选择器
        const el = await waitForElement('div.chat-input-editor[contenteditable="true"][data-lexical-editor="true"]');
        if (!el) {
          // 备选选择器
          const el2 = await waitForElement('div[contenteditable="true"][data-lexical-editor="true"], div.chat-input-editor[contenteditable="true"], textarea[placeholder*="请输入"], textarea[placeholder*="输入"]');
          if (!el2) {
            console.log('[MultiAI] Kimi input not found after waiting');
            return false;
          }
          console.log('[MultiAI] Kimi input found (fallback), tag:', el2.tagName, 'contenteditable:', el2.contentEditable);
          if (el2.tagName === 'TEXTAREA') {
            setTextarea(el2, query);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 尝试点击发送按钮或按 Enter
            const btn = document.querySelector('button[aria-label*="发送"], button[type="submit"]');
            if (btn && !btn.disabled) {
              btn.click();
              console.log('[MultiAI] Kimi sent via button ✓');
            } else {
              el2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
              console.log('[MultiAI] Kimi sent via Enter ✓');
            }
            return true;
          } else {
            setLexicalEditor(el2, query);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 尝试点击发送按钮或按 Enter
            const btn = document.querySelector('button[aria-label*="发送"], button[type="submit"]');
            if (btn && !btn.disabled) {
              btn.click();
              console.log('[MultiAI] Kimi sent via button ✓');
            } else {
              el2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
              console.log('[MultiAI] Kimi sent via Enter ✓');
            }
            return true;
          }
        }
        
        console.log('[MultiAI] Kimi input found, tag:', el.tagName, 'contenteditable:', el.contentEditable, 'data-lexical-editor:', el.getAttribute('data-lexical-editor'));
        
        // 使用专门的 Lexical 编辑器输入函数
        setLexicalEditor(el, query);
        console.log('[MultiAI] Kimi text set:', query);
        
        // 等待更长时间让按钮激活
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = null;
        
        // 方法1: 通过 aria-label
        btn = document.querySelector('button[aria-label*="发送"]');
        console.log('[MultiAI] Kimi button method 1 (aria-label):', !!btn);
        
        // 方法2: 通过 class
        if (!btn) {
          btn = document.querySelector('button.send-button');
          console.log('[MultiAI] Kimi button method 2 (class):', !!btn);
        }
        
        // 方法3: 通过 type
        if (!btn) {
          btn = document.querySelector('button[type="submit"]:not([disabled])');
          console.log('[MultiAI] Kimi button method 3 (type):', !!btn);
        }
        
        // 方法4: 查找所有按钮
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          console.log('[MultiAI] Kimi total buttons:', buttons.length);
          
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const keywords = ['发送', 'send', 'submit'];
            const matches = keywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
            return matches && !b.disabled;
          });
          console.log('[MultiAI] Kimi button method 4 (search):', !!btn);
        }
        
        // 方法5: 如果还没找到，尝试模拟 Enter 键
        if (!btn || btn.disabled) {
          console.log('[MultiAI] Kimi button not found or disabled, trying Enter key');
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
          console.log('[MultiAI] Kimi sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] Kimi sent via button ✓');
        }
        
        return true;
      },
      'grok.com': async () => {
        console.log('[MultiAI] Grok - waiting for input...');
        
        const el = await waitForElement('textarea[placeholder*="Ask"], textarea[placeholder*="问"], textarea, div[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] Grok input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Grok input found, tag:', el.tagName);
        
        if (el.tagName === 'TEXTAREA') {
          setTextarea(el, query);
        } else {
          setContentEditable(el, query);
        }
        
        // 等待更长时间
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = null;
        
        // 方法1: 通过 data-testid
        btn = document.querySelector('button[data-testid="send-button"], button[data-testid*="send"]');
        console.log('[MultiAI] Grok button method 1 (data-testid):', !!btn);
        
        // 方法2: 通过 aria-label
        if (!btn) {
          btn = document.querySelector('button[aria-label*="Send"], button[aria-label*="发送"]');
          console.log('[MultiAI] Grok button method 2 (aria-label):', !!btn);
        }
        
        // 方法3: 查找所有按钮
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          console.log('[MultiAI] Grok total buttons:', buttons.length);
          
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const dataTestId = (b.getAttribute('data-testid') || '').toLowerCase();
            
            // 查找包含发送相关关键词的按钮
            const keywords = ['send', 'submit', '发送'];
            const matches = keywords.some(kw => 
              text.includes(kw) || ariaLabel.includes(kw) || dataTestId.includes(kw)
            );
            
            return matches && !b.disabled;
          });
          console.log('[MultiAI] Grok button method 3 (search):', !!btn);
        }
        
        // 方法4: 如果还没找到，尝试模拟 Enter 键
        if (!btn || btn.disabled) {
          console.log('[MultiAI] Grok button not found or disabled, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter', 
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          }));
          console.log('[MultiAI] Grok sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] Grok sent via button ✓');
        }
        
        return true;
      },
      'yiyan.baidu.com': async () => {
        console.log('[MultiAI] 文心一言 - waiting for input...');
        
        // 百度文心一言可能使用 textarea 或 contenteditable
        const el = await waitForElement('textarea[placeholder*="输入"], textarea[placeholder*="请输入"], textarea, div[contenteditable="true"][role="textbox"]');
        if (!el) {
          console.log('[MultiAI] 文心一言 input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] 文心一言 input found, tag:', el.tagName);
        
        if (el.tagName === 'TEXTAREA') {
          setTextarea(el, query);
        } else {
          setContentEditable(el, query);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = document.querySelector('button[aria-label*="发送"], button[type="submit"], button[class*="send"]');
        
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text.includes('发送') || ariaLabel.includes('发送')) && !b.disabled;
          });
        }
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] 文心一言 sent via button ✓');
        } else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          console.log('[MultiAI] 文心一言 sent via Enter ✓');
        }
        
        return true;
      },
      'chatglm.cn': async () => {
        console.log('[MultiAI] 智谱清言 - waiting for input...');
        
        // 智谱清言可能使用 textarea 或 contenteditable
        const el = await waitForElement('textarea[placeholder*="输入"], textarea[placeholder*="请输入"], textarea, div[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] 智谱清言 input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] 智谱清言 input found, tag:', el.tagName);
        
        if (el.tagName === 'TEXTAREA') {
          setTextarea(el, query);
        } else {
          setContentEditable(el, query);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = document.querySelector('button[aria-label*="发送"], button[type="submit"], button[class*="send"]');
        
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text.includes('发送') || ariaLabel.includes('发送')) && !b.disabled;
          });
        }
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] 智谱清言 sent via button ✓');
        } else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          console.log('[MultiAI] 智谱清言 sent via Enter ✓');
        }
        
        return true;
      },
      'agent.minimaxi.com': async () => {
        console.log('[MultiAI] MiniMax - waiting for input...');
        
        // MiniMax 可能使用 textarea 或 contenteditable
        const el = await waitForElement('textarea[placeholder*="输入"], textarea[placeholder*="请输入"], textarea, div[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] MiniMax input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] MiniMax input found, tag:', el.tagName);
        
        if (el.tagName === 'TEXTAREA') {
          setTextarea(el, query);
        } else {
          setContentEditable(el, query);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = document.querySelector('button[aria-label*="发送"], button[aria-label*="Send"], button[type="submit"], button[class*="send"]');
        
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text.includes('发送') || text.includes('send') || ariaLabel.includes('发送') || ariaLabel.includes('send')) && !b.disabled;
          });
        }
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] MiniMax sent via button ✓');
        } else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          console.log('[MultiAI] MiniMax sent via Enter ✓');
        }
        
        return true;
      },
      'yuanbao.tencent.com': async () => {
        console.log('[MultiAI] 腾讯元宝 - waiting for input...');
        
        // 腾讯元宝可能使用 textarea 或 contenteditable
        const el = await waitForElement('textarea[placeholder*="输入"], textarea[placeholder*="请输入"], textarea, div[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] 腾讯元宝 input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] 腾讯元宝 input found, tag:', el.tagName);
        
        if (el.tagName === 'TEXTAREA') {
          setTextarea(el, query);
        } else {
          setContentEditable(el, query);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 尝试多种方式查找按钮
        let btn = document.querySelector('button[aria-label*="发送"], button[type="submit"], button[class*="send"]');
        
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text.includes('发送') || ariaLabel.includes('发送')) && !b.disabled;
          });
        }
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] 腾讯元宝 sent via button ✓');
        } else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          console.log('[MultiAI] 腾讯元宝 sent via Enter ✓');
        }
        
        return true;
      }
    };
  
    // 使用立即执行的async函数来处理
    (async () => {
    for (const domain in actions) {
      if (host.includes(domain)) {
          console.log('[MultiAI] Detected:', domain);
          await actions[domain]();
          return;
        }
      }
      console.log('[MultiAI] Unknown domain:', host);
    })();
  }
  
  // 注入到当前页面的临时输入 UI 脚本
  function injectInputUI() {
    if (document.getElementById('ai-multi-prompt-overlay')) return; // 防重复
  
    const style = document.createElement('style');
    style.textContent = `
      #ai-multi-prompt-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      #ai-multi-prompt-ui {
        position: relative;
        background: #ffffff;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
        width: 680px;
        max-width: 90%;
      }
      #ai-multi-prompt-ui .header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e8e8e8;
      }
      #ai-multi-prompt-ui .emoji {
        font-size: 24px;
      }
      #ai-multi-prompt-ui .title {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        letter-spacing: -0.02em;
        flex: 1;
      }
      #ai-multi-prompt-ui .close {
        cursor: pointer;
        font-size: 20px;
        color: #999;
        line-height: 1;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      #ai-multi-prompt-ui .close:hover {
        background: #f0f0f0;
        color: #333;
      }
      #ai-multi-prompt-ui .input-wrapper {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      #ai-multi-prompt-ui textarea {
        flex: 1;
        min-height: 48px;
        max-height: 200px;
        padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        resize: vertical;
        box-sizing: border-box;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
        transition: all 0.2s;
        outline: none;
        background: #fafafa;
      }
      #ai-multi-prompt-ui textarea:focus {
        border-color: #6366f1;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      #ai-multi-prompt-ui textarea::placeholder {
        color: #9ca3af;
      }
      #ai-multi-prompt-ui #ai-send-btn {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        border: none;
        padding: 0 24px;
        height: 48px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
      }
      #ai-multi-prompt-ui #ai-send-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      }
      #ai-multi-prompt-ui #ai-send-btn:active {
        transform: translateY(0);
      }
      #ai-multi-prompt-ui .platforms-section {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e8e8e8;
      }
      #ai-multi-prompt-ui .platforms-label {
        font-size: 13px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 12px;
        letter-spacing: -0.01em;
      }
      #ai-multi-prompt-ui .platforms-grid {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      #ai-multi-prompt-ui .platform-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 10px;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
      }
      #ai-multi-prompt-ui .platform-btn .icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.2s;
      }
      #ai-multi-prompt-ui .platform-btn .icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: grayscale(100%) opacity(0.2);
        transition: all 0.2s;
      }
      #ai-multi-prompt-ui .platform-btn:hover .icon img {
        filter: grayscale(50%) opacity(0.5);
        transform: scale(1.1);
      }
      #ai-multi-prompt-ui .platform-btn.active .icon img {
        filter: grayscale(0%) opacity(1);
      }
      #ai-multi-prompt-ui .platform-btn.active:hover .icon img {
        filter: grayscale(0%) opacity(1);
        transform: scale(1.1);
      }
      #ai-multi-prompt-ui .platform-btn::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: -32px;
        left: 50%;
        transform: translateX(-50%) scale(0.9);
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        font-size: 11px;
        font-weight: 500;
        border-radius: 6px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
      }
      #ai-multi-prompt-ui .platform-btn:hover::after {
        opacity: 1;
        transform: translateX(-50%) scale(1);
      }
    `;
    document.head.appendChild(style);
  
    const overlay = document.createElement('div');
    overlay.id = 'ai-multi-prompt-overlay';
    // 获取 i18n 消息（在注入的脚本中需要使用 chrome.i18n）
    const getI18nMessage = (messageName, substitutions) => {
      try {
        return chrome.i18n.getMessage(messageName, substitutions);
      } catch (e) {
        // 如果 i18n 不可用，返回默认英文
        const defaults = {
          'title': 'AI Multi-Model Query',
          'inputPlaceholder': 'Enter your question, press Enter to send...',
          'sendButton': 'Send',
          'selectPlatforms': 'Select AI Platforms',
          'errorNoQuery': 'Please enter a question',
          'errorNoPlatform': 'Please select at least one platform',
          'sending': 'Sending...',
          'statusSuccess': `✓ Sent to ${substitutions || '0'} AI(s)`
        };
        return defaults[messageName] || messageName;
      }
    };
    
    overlay.innerHTML = `
      <div id="ai-multi-prompt-ui">
        <div class="header">
          <span class="emoji">💬</span>
          <div class="title">${getI18nMessage('title')}</div>
          <span class="close">×</span>
        </div>
        <div class="input-wrapper">
          <textarea placeholder="${getI18nMessage('inputPlaceholder')}" rows="1"></textarea>
          <button id="ai-send-btn">${getI18nMessage('sendButton')}</button>
        </div>
        <div class="platforms-section">
          <div class="platforms-label">${getI18nMessage('selectPlatforms')}</div>
          <div class="platforms-grid">
            <button class="platform-btn active" data-platform="ChatGPT" data-tooltip="ChatGPT" title="ChatGPT">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/chatgpt.png')}" alt="ChatGPT"></span>
            </button>
            <button class="platform-btn active" data-platform="Claude" data-tooltip="Claude" title="Claude">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/claude.png')}" alt="Claude"></span>
            </button>
            <button class="platform-btn active" data-platform="Gemini" data-tooltip="Gemini" title="Gemini">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/gemini.png')}" alt="Gemini"></span>
            </button>
            <button class="platform-btn active" data-platform="Grok" data-tooltip="Grok" title="Grok">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/grok.png')}" alt="Grok"></span>
            </button>
            <button class="platform-btn active" data-platform="通义千问" data-tooltip="通义千问" title="通义千问">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/tongyi.png')}" alt="通义千问"></span>
            </button>
            <button class="platform-btn active" data-platform="豆包" data-tooltip="豆包" title="豆包">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/doubao.png')}" alt="豆包"></span>
            </button>
            <button class="platform-btn active" data-platform="DeepSeek" data-tooltip="DeepSeek" title="DeepSeek">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/deepseek.png')}" alt="DeepSeek"></span>
            </button>
            <button class="platform-btn active" data-platform="Kimi" data-tooltip="Kimi" title="Kimi">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/kimi.png')}" alt="Kimi"></span>
            </button>
            <button class="platform-btn active" data-platform="文心一言" data-tooltip="文心一言" title="文心一言">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/wenxin.png')}" alt="文心一言"></span>
            </button>
            <button class="platform-btn active" data-platform="智谱清言" data-tooltip="智谱清言" title="智谱清言">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/chatglm.png')}" alt="智谱清言"></span>
            </button>
            <button class="platform-btn active" data-platform="MiniMax" data-tooltip="MiniMax" title="MiniMax">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/minimax.png')}" alt="MiniMax"></span>
            </button>
            <button class="platform-btn active" data-platform="腾讯元宝" data-tooltip="腾讯元宝" title="腾讯元宝">
              <span class="icon"><img src="${chrome.runtime.getURL('icons/yuanbao.png')}" alt="腾讯元宝"></span>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  
    const textarea = overlay.querySelector('textarea');
    const sendBtn = overlay.querySelector('#ai-send-btn');
    const platformBtns = overlay.querySelectorAll('.platform-btn');
  
    // 从 chrome.storage 加载选中的平台
    chrome.storage.local.get(['selectedPlatforms'], (result) => {
      if (result.selectedPlatforms && result.selectedPlatforms.length > 0) {
        // 先全部取消选中
        platformBtns.forEach(btn => btn.classList.remove('active'));
        // 然后选中保存的平台
        platformBtns.forEach(btn => {
          if (result.selectedPlatforms.includes(btn.dataset.platform)) {
            btn.classList.add('active');
          }
        });
      }
    });
  
    // 平台按钮点击事件
    platformBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        
        // 保存选中状态
        const selected = Array.from(platformBtns)
          .filter(b => b.classList.contains('active'))
          .map(b => b.dataset.platform);
        chrome.storage.local.set({ selectedPlatforms: selected });
      });
    });
  
    // 自动聚焦到输入框
    setTimeout(() => textarea.focus(), 100);
  
    // 自动调整输入框高度
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });
  
    // 发送函数
    const sendQuery = () => {
      const query = textarea.value.trim();
      if (!query) {
        alert(getI18nMessage('errorNoQuery'));
        return;
      }
      
      const selectedPlatforms = Array.from(platformBtns)
        .filter(btn => btn.classList.contains('active'))
        .map(btn => btn.dataset.platform);
      
      if (selectedPlatforms.length === 0) {
        alert(getI18nMessage('errorNoPlatform'));
        return;
      }
      
      chrome.runtime.sendMessage({ 
        action: 'sendToAllAIs', 
        query,
        platforms: selectedPlatforms
      });
      overlay.remove();
    };
  
    // 按 Enter 发送（Shift+Enter 换行）
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
      }
    });
  
    // 点击发送按钮
    sendBtn.onclick = sendQuery;
  
    // 点击关闭按钮
    overlay.querySelector('.close').onclick = () => {
      overlay.remove();
    };
  
    // 点击背景（overlay）关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
  }
  
  // 等待标签页加载完成
  function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status === 'complete') {
            resolve(true);
          } else {
            setTimeout(checkTab, 200);
          }
        } catch (e) {
          resolve(false);
        }
      };
      checkTab();
    });
  }
  
  // 发送进度更新（使用 storage 和 runtime message 双重方式）
  function sendProgressUpdate(progress) {
    console.log('[Background] Sending progress update:', progress);
    
    // 方式1: 存储到 chrome.storage（popup 可以轮询）
    chrome.storage.local.set({ 
      progressUpdate: progress,
      progressUpdateTime: Date.now()
    }).then(() => {
      console.log('[Background] Progress saved to storage');
    }).catch((err) => {
      console.error('[Background] Failed to save progress to storage:', err);
    });
    
    // 方式2: 发送 runtime message（如果 popup 打开）
    try {
      chrome.runtime.sendMessage({
        action: 'progressUpdate',
        progress: progress
      }).then(() => {
        console.log('[Background] Progress message sent');
      }).catch((err) => {
        // 如果 popup 已关闭，忽略错误
        console.log('[Background] Progress message failed (popup may be closed):', err.message);
      });
    } catch (e) {
      console.error('[Background] Error sending progress message:', e);
    }
  }
  
  // 打开或复用 AI 标签页并发送
  async function openAndSend(url, query, progressTracker, siteName) {
    console.log('[Background] Opening:', url, 'for site:', siteName);
    
    // 提取域名用于更灵活的匹配
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 尝试查找已存在的标签页（匹配同域名）
    const allTabs = await chrome.tabs.query({});
    const existingTab = allTabs.find(tab => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        return tabUrl.hostname === domain || tabUrl.hostname.endsWith('.' + domain);
      } catch {
        return false;
      }
    });
    
    let tab;
    let isNewTab = false;
    
    if (existingTab) {
      // 复用已存在的标签页
      tab = existingTab;
      // 注册tab（在reload之前，这样监听器能捕获到reload事件）
      progressTracker.registerTab(tab.id, siteName);
      sendProgressUpdate(progressTracker.getProgress());
      
      await chrome.tabs.update(tab.id, { active: false }); // 不抢焦点
      await chrome.tabs.reload(tab.id); // 刷新页面以确保干净状态
      isNewTab = false;
      console.log('[Background] Reusing tab:', tab.id);
    } else {
      // 创建新标签页
      tab = await chrome.tabs.create({ url, active: false });
      // 注册tab（创建后立即注册，监听器会捕获后续的loading状态）
      progressTracker.registerTab(tab.id, siteName);
      sendProgressUpdate(progressTracker.getProgress());
      
      isNewTab = true;
      console.log('[Background] Created new tab:', tab.id);
    }
  
    // 等待页面加载完成（tab监听器会自动更新状态为loading和complete）
    await waitForTabLoad(tab.id);
    
    // 新标签页需要更长的等待时间，让JS完全初始化
    if (isNewTab) {
      await new Promise(r => setTimeout(r, 3000));
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }
  
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: sendQueryToPage,
        args: [query]
      });
      console.log('[Background] Script injected to tab:', tab.id);
      // 注意：状态已经在tab监听器中更新为completed了
    } catch (e) {
      console.error("[Background] 发送失败", url, e);
      // 即使失败也标记为完成（避免卡住）
      progressTracker.updateStatus(siteName, 'completed');
      sendProgressUpdate(progressTracker.getProgress());
    }
    return tab.id;
  }
  
  // 进度跟踪器类
  class ProgressTracker {
    constructor(total, sites) {
      this.total = total;
      this.sites = sites; // [{name, url}]
      this.statuses = {}; // {siteName: 'opening'|'loading'|'completed'}
      this.tabMap = {}; // {tabId: siteName} - 映射tab ID到site名称
      this.currentAction = '';
      this.tabUpdateListener = null;
    }
    
    // 注册tab ID和site名称的映射
    registerTab(tabId, siteName) {
      this.tabMap[tabId] = siteName;
      // 初始状态为opening
      if (!this.statuses[siteName]) {
        this.statuses[siteName] = 'opening';
      }
    }
    
    // 根据tab的实际状态更新进度
    updateTabStatus(tabId, status) {
      const siteName = this.tabMap[tabId];
      if (!siteName) return;
      
      // status可能是 'loading' 或 'complete'
      if (status === 'loading') {
        this.statuses[siteName] = 'loading';
      } else if (status === 'complete') {
        this.statuses[siteName] = 'completed';
      }
      
      this.updateCurrentAction();
      sendProgressUpdate(this.getProgress());
    }
    
    // 手动更新状态（用于特殊情况）
    updateStatus(siteName, status) {
      this.statuses[siteName] = status;
      this.updateCurrentAction();
    }
    
    updateCurrentAction() {
      // 更新当前操作文本
      const loadingSites = this.getSitesByStatus('loading');
      const openingSites = this.getSitesByStatus('opening');
      
      if (loadingSites.length > 0) {
        this.currentAction = `Loading: ${loadingSites[0]}`;
      } else if (openingSites.length > 0) {
        this.currentAction = `Opening: ${openingSites[0]}`;
      } else {
        this.currentAction = '';
      }
    }
    
    getSitesByStatus(status) {
      return Object.entries(this.statuses)
        .filter(([name, s]) => s === status)
        .map(([name]) => name);
    }
    
    getProgress() {
      const opened = Object.keys(this.statuses).length;
      const loading = this.getSitesByStatus('loading').length;
      const completed = this.getSitesByStatus('completed').length;
      
      return {
        total: this.total,
        opened: opened,
        loading: loading,
        completed: completed,
        currentAction: this.currentAction
      };
    }
    
    // 设置tab更新监听器
    setupTabListener() {
      if (this.tabUpdateListener) return; // 已经设置过了
      
      this.tabUpdateListener = (tabId, changeInfo, tab) => {
        // 只处理我们跟踪的tab
        if (!this.tabMap[tabId]) return;
        
        // 当tab开始加载时
        if (changeInfo.status === 'loading') {
          console.log('[Background] Tab', tabId, 'started loading for', this.tabMap[tabId]);
          this.updateTabStatus(tabId, 'loading');
        }
        // 当tab加载完成时
        else if (changeInfo.status === 'complete') {
          console.log('[Background] Tab', tabId, 'completed loading for', this.tabMap[tabId]);
          this.updateTabStatus(tabId, 'complete');
        }
      };
      
      chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
      console.log('[Background] Tab update listener registered');
    }
    
    // 清理监听器
    cleanup() {
      if (this.tabUpdateListener) {
        chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
        this.tabUpdateListener = null;
        console.log('[Background] Tab update listener removed');
      }
    }
  }
  
  // 创建标签组或复用现有组
  async function createTabGroup(tabIds) {
    console.log('[Background] ===== createTabGroup START =====');
    console.log('[Background] Input tabIds:', tabIds);
    console.log('[Background] chrome.tabs.group exists:', typeof chrome.tabs.group !== 'undefined');
    
    if (!chrome.tabs.group) {
      console.error('[Background] chrome.tabs.group API not available!');
      console.error('[Background] chrome.tabs methods:', Object.keys(chrome.tabs || {}));
      return;
    }
    
    if (!tabIds || tabIds.length === 0) {
      console.warn('[Background] No tab IDs provided');
      return;
    }
    
    try {
      // 验证标签页是否存在
      console.log('[Background] Step 1: Validating tabs...');
      const allTabs = await chrome.tabs.query({});
      console.log('[Background] Total tabs in browser:', allTabs.length);
      
      const validTabIds = tabIds.filter(id => {
        const exists = allTabs.some(tab => tab.id === id);
        if (!exists) {
          console.warn('[Background] Tab ID', id, 'does not exist');
        }
        return exists;
      });
      
      console.log('[Background] Valid tab IDs:', validTabIds, 'out of', tabIds.length);
      
      if (validTabIds.length === 0) {
        console.error('[Background] No valid tab IDs found!');
        return;
      }
      
      // 获取标签页信息
      console.log('[Background] Step 2: Getting tab info...');
      const tabInfo = await chrome.tabs.get(validTabIds[0]);
      console.log('[Background] First tab info:', { id: tabInfo.id, windowId: tabInfo.windowId, url: tabInfo.url });
      const windowId = tabInfo.windowId;
      
      // 查询现有组（使用 chrome.tabs API 获取标签页的 groupId）
      console.log('[Background] Step 3: Querying existing groups...');
      let existingGroupId = null;
      try {
        // 检查所有标签页，查找标题为"大模型"的组
        // 通过检查标签页的 groupId，然后尝试获取组信息
        const TAB_GROUP_ID_NONE = chrome.tabs.TAB_GROUP_ID_NONE || -1;
        
        // 获取所有标签页的 groupId
        const groupIds = new Set();
        for (const tabId of validTabIds) {
          const tab = await chrome.tabs.get(tabId);
          if (tab.groupId !== undefined && tab.groupId !== TAB_GROUP_ID_NONE && tab.groupId >= 0) {
            groupIds.add(tab.groupId);
          }
        }
        
        console.log('[Background] Found groupIds from tabs:', Array.from(groupIds));
        
        // 尝试通过 chrome.tabGroups 查询（如果可用）
        if (typeof chrome.tabGroups !== 'undefined' && chrome.tabGroups.query) {
          try {
            const allGroups = await chrome.tabGroups.query({ windowId });
            console.log('[Background] Found', allGroups.length, 'tab groups in window', windowId);
            if (allGroups.length > 0) {
              console.log('[Background] Groups:', allGroups.map(g => ({ id: g.id, title: g.title })));
              // 查找匹配的组（使用设置中的标题或默认标题）
              const expectedTitle = await getTabGroupTitle();
              const targetGroup = allGroups.find(group => group.title === expectedTitle);
              if (targetGroup && targetGroup.id >= 0) {
                existingGroupId = targetGroup.id;
                console.log('[Background] Found existing group:', existingGroupId, 'with title:', expectedTitle);
              }
            }
          } catch (queryError) {
            console.warn('[Background] Error querying tabGroups:', queryError);
          }
        }
        
        // 如果没找到，但标签页已经在某个组中，使用第一个组
        if (!existingGroupId && groupIds.size > 0) {
          const firstGroupId = Array.from(groupIds)[0];
          if (firstGroupId >= 0) {
            existingGroupId = firstGroupId;
            console.log('[Background] Using existing group from tabs:', existingGroupId);
          }
        }
      } catch (queryError) {
        console.warn('[Background] Error checking existing groups:', queryError);
      }
      
      // 验证 existingGroupId 是否有效
      const TAB_GROUP_ID_NONE = chrome.tabs.TAB_GROUP_ID_NONE || -1;
      if (existingGroupId !== null && existingGroupId !== undefined && existingGroupId >= 0 && existingGroupId !== TAB_GROUP_ID_NONE) {
        // 复用现有组
        console.log('[Background] Step 4: Reusing existing group...');
        console.log('[Background] Validated existingGroupId:', existingGroupId);
        try {
          await chrome.tabs.group({ groupId: existingGroupId, tabIds: validTabIds });
          console.log('[Background] ✓ Reused existing tab group:', existingGroupId);
          
          // 确保现有组的标题和颜色正确
          const color = await getTabGroupColor();
          await updateGroupTitleAndColor(existingGroupId, color);
        } catch (groupError) {
          console.error('[Background] Error adding tabs to existing group:', groupError);
          console.error('[Background] Error details:', groupError.message, groupError.stack);
          console.log('[Background] Falling back to creating new group...');
          // 如果失败，尝试创建新组
          await createNewGroup(validTabIds, windowId);
        }
      } else {
        // 创建新组
        console.log('[Background] Step 4: Creating new group...');
        console.log('[Background] No valid existing group found (existingGroupId:', existingGroupId, ')');
        await createNewGroup(validTabIds, windowId);
      }
    } catch (e) {
      console.error('[Background] Unexpected error in createTabGroup:', e);
      console.error('[Background] Error stack:', e.stack);
    }
    console.log('[Background] ===== createTabGroup END =====');
  }
  
  // 创建新标签组
  async function createNewGroup(tabIds, windowId) {
    const color = await getTabGroupColor();
    
    console.log('[Background] createNewGroup called with', tabIds.length, 'tabs, windowId:', windowId);
    console.log('[Background] Selected color:', color);
    
    try {
      console.log('[Background] Step 4.1: Calling chrome.tabs.group...');
        const groupId = await chrome.tabs.group({ tabIds });
      console.log('[Background] ✓ Tab group created, groupId:', groupId);
      
      // 使用重试机制尝试更新组标题和颜色
      await updateGroupTitleAndColor(groupId, color);
      
    } catch (createError) {
      console.error('[Background] Error in createNewGroup:', createError);
      console.error('[Background] Error message:', createError.message);
      console.error('[Background] Error stack:', createError.stack);
      throw createError;
    }
  }
  
  // 获取设置
  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || {
          tabGroupTitle: '',
          colorMode: 'random',
          fixedColor: 'blue'
        };
        resolve(settings);
      });
    });
  }
  
  // 获取标签组标题
  async function getTabGroupTitle() {
    const settings = await getSettings();
    if (settings.tabGroupTitle && settings.tabGroupTitle.trim()) {
      return settings.tabGroupTitle.trim();
    }
    // 默认值：根据浏览器语言
    const lang = chrome.i18n.getUILanguage();
    return lang.startsWith('zh') ? '大模型' : 'LLM';
  }
  
  // 获取标签组颜色
  async function getTabGroupColor() {
    const settings = await getSettings();
    if (settings.colorMode === 'fixed') {
      return settings.fixedColor || 'blue';
    }
    // 随机颜色
    const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // 更新标签组标题和颜色（带重试机制）
  async function updateGroupTitleAndColor(groupId, color) {
    const title = await getTabGroupTitle();
    console.log('[Background] Attempting to update group', groupId, 'with title', title, 'and color', color);
    
    // 重试最多5次，每次等待时间递增
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const waitTime = attempt * 200; // 200ms, 400ms, 600ms, 800ms, 1000ms
      console.log(`[Background] Attempt ${attempt}/${maxRetries}: Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // 检查 chrome.tabGroups 是否可用
      if (typeof chrome.tabGroups !== 'undefined' && chrome.tabGroups.update) {
        try {
          console.log(`[Background] Attempt ${attempt}: chrome.tabGroups is available, updating...`);
          await chrome.tabGroups.update(groupId, { title: title, color: color });
          console.log('[Background] ✓ Tab group updated successfully with title', title, 'and color', color);
          
          // 验证更新
          try {
            const updatedGroup = await chrome.tabGroups.get(groupId);
            console.log('[Background] Group after update:', { 
              id: updatedGroup.id, 
              title: updatedGroup.title, 
              color: updatedGroup.color 
            });
            
            if (updatedGroup.title === title && updatedGroup.color === color) {
              console.log('[Background] ✓ Group title and color confirmed');
              return; // 成功，退出重试循环
            } else {
              console.warn('[Background] Group update may not have taken effect:', {
                expected: { title: title, color: color },
                actual: { title: updatedGroup.title, color: updatedGroup.color }
              });
            }
          } catch (verifyError) {
            console.warn('[Background] Could not verify group update:', verifyError);
          }
          
          // 如果更新成功，退出重试循环
          return;
        } catch (updateError) {
          console.warn(`[Background] Attempt ${attempt} failed:`, updateError.message);
          if (attempt === maxRetries) {
            console.error('[Background] All attempts failed. Group created but title/color not set.');
            console.error('[Background] Error:', updateError);
          }
        }
      } else {
        console.log(`[Background] Attempt ${attempt}: chrome.tabGroups not available yet`);
        if (attempt === maxRetries) {
          console.warn('[Background] chrome.tabGroups API never became available');
          console.warn('[Background] Group created successfully (groupId:', groupId, '), but title/color cannot be set');
        }
      }
    }
  }
  
  // 监听页面发来的发送请求
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToAllAIs') {
      const query = request.query;
      const selectedPlatforms = request.platforms || AI_SITES.map(s => s.name); // 默认全部
      
      console.log('[Background] Received sendToAllAIs request');
      console.log('[Background] Query:', query);
      console.log('[Background] Selected platforms:', selectedPlatforms);
      
      // 根据选中的平台过滤要打开的站点
      const sitesToOpen = AI_SITES.filter(site => selectedPlatforms.includes(site.name));
      console.log('[Background] Will open', sitesToOpen.length, 'tabs');
      
      if (sitesToOpen.length === 0) {
        sendResponse({ success: false, error: 'No platforms selected' });
        return false;
      }
      
      // 创建进度跟踪器
      const progressTracker = new ProgressTracker(sitesToOpen.length, sitesToOpen);
      
      // 设置tab状态监听器（监听所有tab的加载状态）
      progressTracker.setupTabListener();
      
      const promises = [];
      
      for (const site of sitesToOpen) {
        console.log('[Background] Processing:', site.name, site.url);
        // 直接传递 progressTracker 和 siteName
        const promise = openAndSend(site.url, query, progressTracker, site.name).then(id => {
          console.log('[Background] Completed:', site.name, 'tab id:', id);
          return id;
        }).catch(err => {
          console.error('[Background] Failed:', site.name, err);
          // 即使失败也标记为完成
          progressTracker.updateStatus(site.name, 'completed');
          sendProgressUpdate(progressTracker.getProgress());
          return null; // 返回 null 而不是 undefined
        });
        promises.push(promise);
      }
      
      // 等待所有标签页打开后创建标签组
      Promise.all(promises).then(async (ids) => {
        // 过滤掉 null（失败的标签页）
        const tabIds = ids.filter(id => id !== null);
        console.log('[Background] All tabs opened, tabIds:', tabIds);
        console.log('[Background] Creating group with', tabIds.length, 'tabs');
        
        if (tabIds.length > 0) {
          try {
            await createTabGroup(tabIds);
          } catch (groupError) {
            console.error('[Background] Error creating tab group:', groupError);
          }
        } else {
          console.warn('[Background] No valid tab IDs to group');
        }
        
        // 清理tab监听器
        progressTracker.cleanup();
        
        // 发送完成消息
        const finalProgress = progressTracker.getProgress();
        console.log('[Background] Final progress:', finalProgress);
        
        // 存储最终进度（分两步，确保 onChanged 能触发）
        chrome.storage.local.set({ 
          progressUpdate: finalProgress,
          progressUpdateTime: Date.now()
        }).then(() => {
          // 延迟设置完成标志，确保进度更新先触发
          setTimeout(() => {
            chrome.storage.local.set({ 
              progressComplete: true
            }).then(() => {
              console.log('[Background] Progress complete flag set');
            }).catch((err) => {
              console.error('[Background] Failed to set progressComplete:', err);
            });
          }, 100);
        }).catch((err) => {
          console.error('[Background] Failed to save final progress:', err);
        });
        
        try {
          chrome.runtime.sendMessage({
            action: 'progressComplete',
            progress: finalProgress
          }).catch(() => {
            // 如果 popup 已关闭，忽略错误
          });
        } catch (e) {
          // 忽略错误
        }
        
        sendResponse({ success: true, count: tabIds.length });
      }).catch(err => {
        console.error('[Background] Error in Promise.all:', err);
        
        // 清理tab监听器
        progressTracker.cleanup();
        
        // 发送错误消息
        try {
          chrome.runtime.sendMessage({
            action: 'progressError',
            error: err.message
          }).catch(() => {
            // 如果 popup 已关闭，忽略错误
          });
        } catch (e) {
          // 忽略错误
        }
        
        sendResponse({ success: false, error: err.message });
      });
      
      return true; // 保持消息通道开放以进行异步响应
    }
  });
  
  // 快捷键或点击图标触发：在当前页面注入输入框
  async function triggerInputUI() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.startsWith('http')) return;
  
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectInputUI
      });
    } catch (e) {
      console.error("无法注入输入框，请确保页面允许脚本运行", e);
      // 可选：显示通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png', // 可选，需添加 icon
        title: 'AI Multi-Sender',
        message: '请在普通网页中使用此功能（不能在 chrome:// 页面使用）'
      });
    }
  }
  
  chrome.action.onClicked.addListener(triggerInputUI);
  
  // 快捷键也触发
  // 注意：_execute_action 已绑定到 action.onClicked（见 manifest）
  // 所以无需额外监听 commands