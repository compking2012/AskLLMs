// 腾讯元宝模型实现
class YuanbaoModel extends AIModel {
  constructor() {
    super('腾讯元宝', 'https://yuanbao.tencent.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        let yuanbaoThinkingBtn = await waitForElement('div.yb-switch-model-btn', 5000);
        if (yuanbaoThinkingBtn) {
          const btnText = yuanbaoThinkingBtn.textContent || '';
          if (btnText.includes('深度思考')) {
            const isChecked = yuanbaoThinkingBtn.classList.contains('checked');
            if (!isChecked) {
              yuanbaoThinkingBtn.click();
              console.log('[MultiAI] 腾讯元宝 deep thinking enabled ✓');
            } else {
              console.log('[MultiAI] 腾讯元宝 deep thinking already enabled ✓');
            }
          } else {
            const allBtns = Array.from(document.querySelectorAll('div.yb-switch-model-btn'));
            yuanbaoThinkingBtn = allBtns.find(btn => btn.textContent.includes('深度思考'));
            if (yuanbaoThinkingBtn) {
              const isChecked = yuanbaoThinkingBtn.classList.contains('checked');
              if (!isChecked) {
                yuanbaoThinkingBtn.click();
                console.log('[MultiAI] 腾讯元宝 deep thinking enabled ✓');
              }
            }
          }
        } else {
          console.log('[MultiAI] 腾讯元宝 deep thinking button not found');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] 腾讯元宝 - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
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
    `;
  }

  async executeQuery(query, options = {}) {
    return { success: true };
  }

  async enableDeepThinking() {
    // 通过注入脚本实现
  }

  getIconPath() {
    return 'icons/yuanbao.png';
  }
}

