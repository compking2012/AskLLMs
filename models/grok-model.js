// Grok 模型实现
class GrokModel extends AIModel {
  constructor() {
    super('Grok', 'https://grok.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const grokModeBtn = await findElementByText('button', '快速模式') || await findElementByText('button', 'Fast mode') || await findElementByText('button', '专家模式') || await findElementByText('button', 'Expert mode') || await waitForElement('button[aria-label*="mode"]', 5000);
        if (grokModeBtn) {
          const btnText = grokModeBtn.textContent.trim();
          const isExpert = btnText.includes('专家') || btnText.includes('Expert');
          if (!isExpert) {
            grokModeBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            const expertMode = await findElementByText('button, [role="menuitem"]', '专家模式') || await findElementByText('button, [role="menuitem"]', 'Expert mode') || await findElementByText('button, [role="menuitem"]', '专家') || await findElementByText('button, [role="menuitem"]', 'Expert');
            if (expertMode) {
              expertMode.click();
              console.log('[MultiAI] Grok deep thinking enabled ✓');
            }
          } else {
            console.log('[MultiAI] Grok already in expert mode ✓');
          }
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Grok - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
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
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let btn = document.querySelector('button[data-testid="send-button"], button[data-testid*="send"]');
        if (!btn) {
          btn = document.querySelector('button[aria-label*="Send"], button[aria-label*="发送"]');
        }
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const dataTestId = (b.getAttribute('data-testid') || '').toLowerCase();
            const keywords = ['send', 'submit', '发送'];
            const matches = keywords.some(kw => text.includes(kw) || ariaLabel.includes(kw) || dataTestId.includes(kw));
            return matches && !b.disabled;
          });
        }
        
        if (!btn || btn.disabled) {
          console.log('[MultiAI] Grok button not found or disabled, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          console.log('[MultiAI] Grok sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] Grok sent via button ✓');
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
    return 'icons/grok.png';
  }
}

