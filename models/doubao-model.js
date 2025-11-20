// 豆包模型实现
class DoubaoModel extends AIModel {
  constructor() {
    super('豆包', 'https://www.doubao.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const doubaoThinkingContainer = await waitForElement('div[data-testid="use-deep-thinking-switch-btn"]', 5000);
        if (doubaoThinkingContainer) {
          const doubaoThinkingBtn = doubaoThinkingContainer.querySelector('button');
          if (doubaoThinkingBtn) {
            const isChecked = doubaoThinkingBtn.getAttribute('data-checked') === 'true';
            if (!isChecked) {
              doubaoThinkingBtn.focus();
              await new Promise(resolve => setTimeout(resolve, 100));
              doubaoThinkingBtn.click();
              await new Promise(resolve => setTimeout(resolve, 300));
              const newChecked = doubaoThinkingBtn.getAttribute('data-checked') === 'true';
              if (newChecked) {
                console.log('[MultiAI] 豆包 deep thinking enabled ✓');
              } else {
                console.log('[MultiAI] 豆包 button click failed, trying container');
                doubaoThinkingContainer.click();
                console.log('[MultiAI] 豆包 deep thinking enabled (via container) ✓');
              }
            } else {
              console.log('[MultiAI] 豆包 deep thinking already enabled ✓');
            }
          } else {
            doubaoThinkingContainer.click();
            console.log('[MultiAI] 豆包 deep thinking enabled (via container, no button) ✓');
          }
        } else {
          console.log('[MultiAI] 豆包 deep thinking container not found');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Doubao - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
        const el = await waitForElement('textarea.semi-input-textarea');
        if (!el) {
          console.log('[MultiAI] Doubao input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] Doubao input found:', el.placeholder);
        setTextarea(el, query);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let btn = document.querySelector('button[id="flow-end-msg-send"]');
        
        console.log('[MultiAI] Doubao button found:', !!btn, 'disabled:', btn?.disabled);
        
        if (btn && !btn.disabled) {
          btn.click();
          console.log('[MultiAI] Doubao sent via button ✓');
        } else if (!btn) {
          console.log('[MultiAI] Doubao button not found, trying Enter key');
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
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
    return 'icons/doubao.png';
  }
}

