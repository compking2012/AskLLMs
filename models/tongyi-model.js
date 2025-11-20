// 通义千问模型实现
class TongyiModel extends AIModel {
  constructor() {
    super('通义千问', 'https://www.tongyi.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const tongyiThinkingBtn = await waitForElement('div[data-log-params*="deepThink"]', 5000);
        if (tongyiThinkingBtn) {
          tongyiThinkingBtn.click();
          console.log('[MultiAI] 通义千问 deep thinking enabled ✓');
        } else {
          console.log('[MultiAI] 通义千问 deep thinking button not found');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Tongyi - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
        const el = await waitForElement('div.text-area-slot-container textarea');
        if (!el) {
          console.log('[MultiAI] Tongyi input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Tongyi input found:', el.placeholder);
        
        el.focus();
        el.click();
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(el, query);
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        
        console.log('[MultiAI] Tongyi text set:', query);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let btn = document.querySelector('div[class*="operateBtn"]');
        if (!btn) {
          const iconSpan = document.querySelector('span.anticon');
          if (iconSpan && iconSpan.parentElement && iconSpan.parentElement.tagName === 'DIV') {
            btn = iconSpan.parentElement;
          }
        }
        
        console.log('[MultiAI] Tongyi button found:', !!btn);
        
        if (btn) {
          btn.click();
          console.log('[MultiAI] Tongyi sent ✓');
        } else {
          console.log('[MultiAI] Tongyi button not found');
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
    return 'icons/tongyi.png';
  }
}

