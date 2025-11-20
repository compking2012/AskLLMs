// DeepSeek 模型实现
class DeepSeekModel extends AIModel {
  constructor() {
    super('DeepSeek', 'https://chat.deepseek.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await waitForElement('button.ds-atom-button.ds-toggle-button', 5000);
        const allToggleButtons = Array.from(document.querySelectorAll('button.ds-atom-button.ds-toggle-button'));
        if (allToggleButtons.length > 0) {
          const deepseekThinkingBtn = allToggleButtons[0];
          deepseekThinkingBtn.click();
          console.log('[MultiAI] DeepSeek deep thinking enabled ✓');
        } else {
          console.log('[MultiAI] DeepSeek deep thinking button not found');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] DeepSeek - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
        const el = await waitForElement('textarea[class*="ds-"], textarea[placeholder*="消息"], textarea[placeholder*="Message"], textarea');
        if (!el) {
          console.log('[MultiAI] DeepSeek input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] DeepSeek input found:', el.placeholder);
        setTextarea(el, query);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let btn = document.querySelector('button[class*="ds-"][class*="send"]');
        if (!btn) {
          btn = document.querySelector('button[aria-label*="Send"], button[aria-label*="发送"]');
        }
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const className = b.className.toLowerCase();
            const keywords = ['send', 'submit', '发送'];
            const matches = keywords.some(kw => text.includes(kw) || ariaLabel.includes(kw) || className.includes(kw));
            return matches && !b.disabled;
          });
        }
        
        if (!btn || btn.disabled) {
          console.log('[MultiAI] DeepSeek button not found or disabled, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          console.log('[MultiAI] DeepSeek sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] DeepSeek sent via button ✓');
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
    return 'icons/deepseek.png';
  }
}

