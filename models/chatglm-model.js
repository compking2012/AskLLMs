// 智谱清言模型实现
class ChatGLMModel extends AIModel {
  constructor() {
    super('智谱清言', 'https://chatglm.cn');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const chatglmThinkingBtn = await findElementByText('button', '推理') || await waitForElement('button[aria-label*="推理"], [class*="reasoning"], [class*="thinking"]', 5000);
        if (chatglmThinkingBtn) {
          chatglmThinkingBtn.click();
          console.log('[MultiAI] 智谱清言 deep thinking enabled ✓');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] 智谱清言 - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
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
      }
    `;
  }

  async executeQuery(query, options = {}) {
    return { success: true };
  }

  async enableDeepThinking() {
    // 通过注入脚本实现
  }

  getIconPath() {
    return 'icons/chatglm.png';
  }
}

