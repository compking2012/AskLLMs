// Gemini 模型实现
class GeminiModel extends AIModel {
  constructor() {
    super('Gemini', 'https://gemini.google.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const geminiThinkingBtn = await findElementByText('button', '思考') || await findElementByText('button', 'Thinking') || await waitForElement('button[aria-label*="思考"], button[aria-label*="Thinking"]', 5000);
        if (geminiThinkingBtn) {
          geminiThinkingBtn.click();
          console.log('[MultiAI] Gemini deep thinking enabled ✓');
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Gemini - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
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
    return 'icons/gemini.png';
  }
}

