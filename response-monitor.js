// 响应监控页面脚本
const responses = new Map(); // 存储每个平台的响应数据

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('clear-btn');
  clearBtn.addEventListener('click', clearAll);

  // 监听 chrome.storage 变化来获取响应更新
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      Object.keys(changes).forEach(key => {
        if (key.startsWith('response_')) {
          const platform = key.replace('response_', '');
          const newValue = changes[key].newValue;
          if (newValue) {
            updateResponse(platform, newValue.content, newValue.status);
          }
        }
      });
    }
  });

  // 请求获取已有的响应数据
  chrome.storage.local.get(null, (items) => {
    Object.keys(items).forEach(key => {
      if (key.startsWith('response_')) {
        const platform = key.replace('response_', '');
        const data = items[key];
        if (data) {
          updateResponse(platform, data.content, data.status);
        }
      }
    });
  });
});

// 更新响应显示
function updateResponse(platform, content, status = 'streaming') {
  responses.set(platform, { content, status, timestamp: Date.now() });

  const container = document.getElementById('response-container');
  
  // 移除空状态
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // 查找或创建响应卡片
  let card = document.getElementById(`response-${platform}`);
  if (!card) {
    card = createResponseCard(platform);
    container.appendChild(card);
  }

  // 更新内容
  const contentEl = card.querySelector('.response-content');
  contentEl.textContent = content || '';

  // 更新状态
  const statusEl = card.querySelector('.response-status');
  statusEl.textContent = getStatusText(status);
  statusEl.className = `response-status status-${status}`;

  // 更新时间戳
  const timeEl = card.querySelector('.response-time');
  timeEl.textContent = new Date().toLocaleTimeString();

  // 自动滚动到底部
  contentEl.scrollTop = contentEl.scrollHeight;
}

// 创建响应卡片
function createResponseCard(platform) {
  const card = document.createElement('div');
  card.id = `response-${platform}`;
  card.className = 'response-card';

  card.innerHTML = `
    <div class="response-header">
      <div class="response-title">${platform}</div>
      <div class="response-status status-streaming">等待中</div>
    </div>
    <div class="response-content"></div>
    <div class="response-footer">
      <span>最后更新: <span class="response-time">--</span></span>
      <span>字符数: <span class="response-length">0</span></span>
    </div>
  `;

  // 更新字符数
  const updateLength = () => {
    const contentEl = card.querySelector('.response-content');
    const lengthEl = card.querySelector('.response-length');
    lengthEl.textContent = (contentEl.textContent || '').length;
  };

  // 监听内容变化
  const observer = new MutationObserver(updateLength);
  const contentEl = card.querySelector('.response-content');
  observer.observe(contentEl, {
    childList: true,
    characterData: true,
    subtree: true
  });

  return card;
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    streaming: '流式输出中',
    complete: '已完成',
    error: '错误'
  };
  return statusMap[status] || '未知';
}

// 清空所有响应
function clearAll() {
  if (confirm('确定要清空所有响应吗？')) {
    responses.clear();
    const container = document.getElementById('response-container');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📡</div>
        <div class="empty-state-text">等待查询响应...</div>
      </div>
    `;
    
    // 清空 chrome.storage 中的响应数据
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = Object.keys(items).filter(key => key.startsWith('response_'));
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
      }
    });
  }
}

