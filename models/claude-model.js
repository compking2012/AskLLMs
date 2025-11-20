// Claude 模型实现
class ClaudeModel extends AIModel {
  constructor() {
    super('Claude', 'https://claude.ai');
  }

  canEnableDeepThinking() {
    return true;
  }

  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const claudeToolsBtn = await findElementByText('button', 'Search and Tools') || await waitForElement('button[aria-label*="Tools"]', 5000);
        if (claudeToolsBtn) {
          claudeToolsBtn.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          const useStyleBtn = await findElementByText('button', 'Use style') || await waitForElement('button[aria-label*="Use style"]', 3000);
          if (useStyleBtn) {
            useStyleBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            const thinkingClaude = await findElementByText('button, [role="menuitem"]', 'Thinking Claude');
            if (thinkingClaude) {
              thinkingClaude.click();
              console.log('[MultiAI] Claude deep thinking enabled ✓');
            }
          }
        }
      }
    `;
  }

  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] Claude - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
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
    return 'icons/claude.png';
  }
}

