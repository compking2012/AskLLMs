// MiniMax 模型实现
class MiniMaxModel extends AIModel {
  constructor() {
    super('MiniMax', 'https://agent.minimaxi.com');
  }

  canEnableDeepThinking() {
    return false; // MiniMax 不支持深度思考
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        console.log('[MultiAI] MiniMax does not support deep thinking');
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] MiniMax - waiting for input...');
        
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
      }
    `;
  }

  async executeQuery(query, options = {}) {
    return { success: true };
  }

  async enableDeepThinking() {
    throw new Error('MiniMax does not support deep thinking');
  }

  getIconPath() {
    return 'icons/minimax.png';
  }
}

