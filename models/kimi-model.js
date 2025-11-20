// Kimi 模型实现
class KimiModel extends AIModel {
  constructor() {
    super('Kimi', 'https://www.kimi.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const kimiThinkingBtn = await findElementByText('button', '长思考') || await waitForElement('button[aria-label*="长思考"], [class*="long-thinking"], [class*="thinking"]', 5000);
        if (kimiThinkingBtn) {
          kimiThinkingBtn.click();
          console.log('[MultiAI] Kimi deep thinking enabled ✓');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Kimi - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
        let el = await waitForElement('div.chat-input-editor[contenteditable="true"][data-lexical-editor="true"]');
        if (!el) {
          const el2 = await waitForElement('div[contenteditable="true"][data-lexical-editor="true"], div.chat-input-editor[contenteditable="true"], textarea[placeholder*="请输入"], textarea[placeholder*="输入"]');
          if (!el2) {
            console.log('[MultiAI] Kimi input not found after waiting');
            return false;
          }
          console.log('[MultiAI] Kimi input found (fallback), tag:', el2.tagName);
          if (el2.tagName === 'TEXTAREA') {
            setTextarea(el2, query);
            await new Promise(resolve => setTimeout(resolve, 1000));
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
        
        console.log('[MultiAI] Kimi input found, tag:', el.tagName);
        setLexicalEditor(el, query);
        console.log('[MultiAI] Kimi text set:', query);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let btn = document.querySelector('button[aria-label*="发送"]');
        if (!btn) {
          btn = document.querySelector('button.send-button');
        }
        if (!btn) {
          btn = document.querySelector('button[type="submit"]:not([disabled])');
        }
        if (!btn) {
          const buttons = Array.from(document.querySelectorAll('button'));
          btn = buttons.find(b => {
            const text = b.textContent.trim().toLowerCase();
            const ariaLabel = (b.getAttribute('aria-label') || '').toLowerCase();
            const keywords = ['发送', 'send', 'submit'];
            const matches = keywords.some(kw => text.includes(kw) || ariaLabel.includes(kw));
            return matches && !b.disabled;
          });
        }
        
        if (!btn || btn.disabled) {
          console.log('[MultiAI] Kimi button not found or disabled, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          console.log('[MultiAI] Kimi sent via Enter ✓');
        } else {
          btn.click();
          console.log('[MultiAI] Kimi sent via button ✓');
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
    return 'icons/kimi.png';
  }
}

