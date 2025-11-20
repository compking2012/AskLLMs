// ChatGPT 模型实现
class ChatGPTModel extends AIModel {
  constructor() {
    super('ChatGPT', 'https://chatgpt.com');
  }

  canEnableDeepThinking() {
    return true;
  }

  // 生成深度思考的注入代码
  getEnableDeepThinkingCode() {
    return `
      async function enableDeepThinking() {
        await sleep(1000);
        
        // 检查是否已经启用了深度思考
        const existingThinkingPill = await waitForElement('button.__composer-pill[aria-label*="思考"]', 2000);
        if (existingThinkingPill) {
          console.log('[MultiAI] ChatGPT deep thinking already enabled ✓');
          return;
        }
        
        // 找到并点击 composer-plus-btn
        const chatgptPlusBtn = await waitForElement('button#composer-plus-btn[data-testid="composer-plus-btn"]', 5000);
        if (!chatgptPlusBtn) {
          console.log('[MultiAI] ChatGPT plus button not found');
          return;
        }
        
        chatgptPlusBtn.click();
        await sleep(500);
        
        // 找到外层的 role="group" 容器
        const outerGroup = await waitForElement('div[role="group"]', 2000);
        if (!outerGroup) {
          console.log('[MultiAI] ChatGPT outer group not found');
          return;
        }
        
        // 在外层 group 内部找到内层的 role="group"
        const innerGroup = outerGroup.querySelector('div[role="group"]');
        if (!innerGroup) {
          console.log('[MultiAI] ChatGPT inner group not found');
          return;
        }
        
        // 在内层 group 中找到所有的 menuitemradio 元素
        const menuItems = Array.from(innerGroup.querySelectorAll('div[role="menuitemradio"]'));
        
        // 找到第二个 menuitemradio（文本内容是"思考"的那个）
        let thinkingOption = null;
        if (menuItems.length >= 2) {
          // 优先通过文本内容查找
          for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            const textContent = item.textContent || '';
            if (textContent.includes('思考') || textContent.includes('Thinking')) {
              thinkingOption = item;
              break;
            }
          }
          // 如果没找到，直接使用第二个元素（根据用户描述，第二个就是"思考"）
          if (!thinkingOption) {
            thinkingOption = menuItems[1];
          }
        }
        
        if (thinkingOption) {
          thinkingOption.click();
          console.log('[MultiAI] ChatGPT deep thinking enabled ✓');
          await sleep(300);
        } else {
          console.log('[MultiAI] ChatGPT thinking option not found');
        }
      }
    `;
  }

  // 生成执行查询的注入代码
  getExecuteQueryCode() {
    return `
      async function executeQuery(query, deepThinking) {
        console.log('[MultiAI] ChatGPT - waiting for input...');
        
        if (deepThinking) {
          await enableDeepThinking();
        }
        
        const el = await waitForElement('div.ProseMirror#prompt-textarea[contenteditable="true"]');
        if (!el) {
          console.log('[MultiAI] ChatGPT input not found after waiting');
          return false;
        }
        
        console.log('[MultiAI] ChatGPT input found, setting text...');
        setContentEditable(el, query);
        console.log('[MultiAI] ChatGPT text set:', query);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const btn = await waitForElement('button[data-testid="send-button"]:not([disabled])');
        if (btn) {
          btn.click();
          console.log('[MultiAI] ChatGPT sent ✓');
        } else {
          console.log('[MultiAI] ChatGPT button not ready');
        }
        
        return true;
      }
    `;
  }

  // 执行查询（在 background 中调用）
  async executeQuery(query, options = {}) {
    // 这个方法会在 background.js 中被调用
    // 实际执行通过注入脚本完成
    return { success: true };
  }

  // 启用深度思考（在 background 中调用）
  async enableDeepThinking() {
    // 这个方法会在 background.js 中被调用
    // 实际执行通过注入脚本完成
  }

  getIconPath() {
    return 'icons/chatgpt.png';
  }
}

