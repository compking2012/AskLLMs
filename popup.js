// i18n 支持函数
function i18n(messageName, substitutions) {
  return chrome.i18n.getMessage(messageName, substitutions);
}

// 初始化 i18n
function initI18n() {
  // 翻译所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageName = element.getAttribute('data-i18n');
    element.textContent = i18n(messageName);
  });
  
  // 翻译所有带有 data-i18n-placeholder 属性的元素
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const messageName = element.getAttribute('data-i18n-placeholder');
    element.placeholder = i18n(messageName);
  });
  
  // 翻译所有带有 data-i18n-title 属性的元素
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const messageName = element.getAttribute('data-i18n-title');
    element.title = i18n(messageName);
  });
}

const textarea = document.getElementById('query-input');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('status');
const platformBtns = document.querySelectorAll('.platform-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressCount = document.getElementById('progress-count');
const progressDetail = document.getElementById('progress-detail');

// 页面元素
const mainPage = document.getElementById('main-page');
const settingsPage = document.getElementById('settings-page');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');

// 平台图标映射
const PLATFORM_ICONS = {
  "ChatGPT": "icons/chatgpt.png",
  "Claude": "icons/claude.png",
  "Gemini": "icons/gemini.png",
  "Grok": "icons/grok.png",
  "通义千问": "icons/tongyi.png",
  "豆包": "icons/doubao.png",
  "DeepSeek": "icons/deepseek.png",
  "Kimi": "icons/kimi.png",
  "文心一言": "icons/wenxin.png",
  "智谱清言": "icons/chatglm.png",
  "MiniMax": "icons/minimax.png",
  "腾讯元宝": "icons/yuanbao.png"
};

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'auto',
  language: 'auto',
  visiblePlatforms: ['ChatGPT', 'Claude', 'Gemini', 'Grok', '通义千问', '豆包', 'DeepSeek', 'Kimi', '文心一言', '智谱清言', 'MiniMax', '腾讯元宝'],
  tabGroupTitle: '',
  colorMode: 'random',
  fixedColor: 'blue'
};

// 应用主题
async function applyTheme(themeSetting) {
  let theme = themeSetting;
  
  if (theme === 'auto') {
    // 检测系统主题
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      theme = darkModeQuery.matches ? 'dark' : 'light';
      
      // 监听系统主题变化（只在auto模式下）
      if (!window._themeListener) {
        darkModeQuery.addEventListener('change', async (e) => {
          // 检查当前设置是否仍然是auto
          const result = await new Promise(resolve => {
            chrome.storage.local.get(['settings'], resolve);
          });
          const currentTheme = result.settings?.theme || 'auto';
          if (currentTheme === 'auto') {
            applyTheme('auto');
          }
        });
        window._themeListener = true;
      }
    } else {
      theme = 'light';
    }
  }
  
  // 应用主题类
  document.body.classList.remove('dark-theme', 'light-theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.add('light-theme');
  }
}

// 加载并应用设置
async function loadAndApplySettings() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  const settings = result.settings || DEFAULT_SETTINGS;
  
  // 应用主题设置
  await applyTheme(settings.theme || 'auto');
  
  // 应用语言设置
  if (settings.language !== 'auto') {
    // 设置语言（需要重新加载i18n）
    chrome.i18n.getAcceptLanguages((languages) => {
      // 这里可以强制设置语言，但Chrome扩展的i18n机制比较复杂
      // 暂时先保持自动检测
    });
  }
  
  // 应用可见平台设置
  applyVisiblePlatforms(settings.visiblePlatforms);
  
  return settings;
}

// 应用可见平台设置
function applyVisiblePlatforms(visiblePlatforms) {
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    if (visiblePlatforms.includes(platform)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

// 初始化设置页面
function initSettingsPage() {
  // 生成平台复选框
  const platformCheckboxes = document.getElementById('platform-checkboxes');
  platformCheckboxes.innerHTML = '';
  
  const allPlatforms = Array.from(platformBtns).map(btn => btn.dataset.platform);
  allPlatforms.forEach(platform => {
    const checkbox = document.createElement('label');
    checkbox.className = 'settings-checkbox';
    checkbox.innerHTML = `
      <input type="checkbox" value="${platform}" data-platform="${platform}">
      <span class="icon"><img src="${PLATFORM_ICONS[platform]}" alt="${platform}"></span>
      <span>${platform}</span>
    `;
    platformCheckboxes.appendChild(checkbox);
  });
  
  // 加载设置并填充表单
  loadSettingsToForm();
  
  // 颜色模式切换
  document.querySelectorAll('input[name="color-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const colorSelector = document.getElementById('color-selector');
      if (e.target.value === 'fixed') {
        colorSelector.style.display = 'block';
      } else {
        colorSelector.style.display = 'none';
      }
    });
  });
}

// 加载设置到表单
async function loadSettingsToForm() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  const settings = result.settings || DEFAULT_SETTINGS;
  
  // 主题设置
  const themeValue = settings.theme || 'auto';
  document.getElementById(`theme-${themeValue}`).checked = true;
  
  // 语言设置
  document.getElementById(`lang-${settings.language === 'auto' ? 'auto' : settings.language === 'zh_CN' ? 'zh' : 'en'}`).checked = true;
  
  // 可见平台设置
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    const platform = checkbox.dataset.platform;
    checkbox.checked = settings.visiblePlatforms.includes(platform);
    const label = checkbox.closest('.settings-checkbox');
    if (checkbox.checked) {
      label.classList.add('active');
    } else {
      label.classList.remove('active');
    }
  });
  
  // 标签组标题
  document.getElementById('tab-group-title').value = settings.tabGroupTitle || '';
  
  // 颜色模式
  document.getElementById(`color-${settings.colorMode}`).checked = true;
  if (settings.colorMode === 'fixed') {
    document.getElementById('color-selector').style.display = 'block';
    document.querySelector(`input[name="color"][value="${settings.fixedColor}"]`).checked = true;
  }
  
  // 复选框点击事件
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const label = e.target.closest('.settings-checkbox');
      if (e.target.checked) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    });
  });
}

// 保存设置
async function saveSettings() {
  const settings = {
    theme: document.querySelector('input[name="theme"]:checked').value,
    language: document.querySelector('input[name="language"]:checked').value,
    visiblePlatforms: Array.from(document.querySelectorAll('#platform-checkboxes input[type="checkbox"]:checked'))
      .map(cb => cb.dataset.platform),
    tabGroupTitle: document.getElementById('tab-group-title').value.trim(),
    colorMode: document.querySelector('input[name="color-mode"]:checked').value,
    fixedColor: document.querySelector('input[name="color"]:checked')?.value || 'blue'
  };
  
  await new Promise(resolve => {
    chrome.storage.local.set({ settings }, resolve);
  });
  
  // 应用设置
  await loadAndApplySettings();
  
  // 返回主页面
  showMainPage();
}

// 页面切换
function showMainPage() {
  mainPage.classList.add('active');
  settingsPage.classList.remove('active');
}

function showSettingsPage() {
  mainPage.classList.remove('active');
  settingsPage.classList.add('active');
  initSettingsPage();
  // 重新初始化i18n（设置页面可能刚显示）
  initI18n();
}

// 事件监听
settingsBtn.addEventListener('click', showSettingsPage);
backBtn.addEventListener('click', showMainPage);
cancelSettingsBtn.addEventListener('click', showMainPage);
saveSettingsBtn.addEventListener('click', saveSettings);

// 初始化 i18n
initI18n();

// 加载设置
loadAndApplySettings();

// 获取所有平台名称（只返回可见的）
function getAllPlatforms() {
  return Array.from(platformBtns)
    .filter(btn => btn.style.display !== 'none')
    .map(btn => btn.dataset.platform);
}

// 从 chrome.storage 加载选中的平台
async function loadSelectedPlatforms() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedPlatforms'], (result) => {
      if (result.selectedPlatforms) {
        resolve(result.selectedPlatforms);
      } else {
        resolve(getAllPlatforms()); // 默认全选
      }
    });
  });
}

// 保存选中的平台到 chrome.storage
function saveSelectedPlatforms(platforms) {
  chrome.storage.local.set({ selectedPlatforms: platforms });
}

// 获取当前选中的平台
function getSelectedPlatforms() {
  return Array.from(platformBtns)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => btn.dataset.platform);
}

// 初始化平台按钮状态
async function initPlatformButtons() {
  const selectedPlatforms = await loadSelectedPlatforms();
  
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    if (selectedPlatforms.includes(platform)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 平台按钮点击事件
platformBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    
    const selected = getSelectedPlatforms();
    saveSelectedPlatforms(selected);
  });
});

// 初始化
initPlatformButtons();

// 自动调整输入框高度
textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// 更新进度条
function updateProgress(progress) {
  const { total, opened, loading, completed, currentAction } = progress;
  
  // 显示进度容器
  progressContainer.classList.add('active');
  statusDiv.style.display = 'none';
  
  // 计算进度百分比（已完成的算100%，加载中的算50%，已打开的算25%）
  const progressValue = (completed * 100 + loading * 50 + (opened - loading - completed) * 25) / total;
  const percentage = Math.min(100, Math.max(0, progressValue));
  
  // 更新进度条
  progressBar.style.width = percentage + '%';
  
  // 更新计数
  progressCount.textContent = `${completed}/${total}`;
  
  // 更新详细文本
  const detailParts = [];
  if (opened > 0) detailParts.push(i18n('progressOpened', [opened.toString()]));
  if (loading > 0) detailParts.push(i18n('progressLoading', [loading.toString()]));
  if (completed > 0) detailParts.push(i18n('progressCompleted', [completed.toString()]));
  
  if (detailParts.length > 0) {
    progressDetail.textContent = detailParts.join(' • ');
  } else {
    progressDetail.textContent = i18n('progressPreparing');
  }
  
  // 更新状态文本
  if (currentAction) {
    progressText.textContent = currentAction;
  } else if (completed === total) {
    progressText.textContent = i18n('progressAllCompleted');
  } else {
    progressText.textContent = i18n('progressStatus');
  }
}

// 重置进度条
function resetProgress() {
  progressContainer.classList.remove('active');
  progressBar.style.width = '0%';
  progressCount.textContent = '0/0';
  progressDetail.textContent = '';
  statusDiv.style.display = '';
}

// 进度监听器
let progressListenerActive = false;
let storageChangeListener = null;

function startProgressListening() {
  if (progressListenerActive) {
    console.log('[Popup] Progress listener already active');
    return;
  }
  
  console.log('[Popup] Starting progress listener');
  progressListenerActive = true;
  
  // 方式1: 使用 storage.onChanged 监听器（推荐）
  storageChangeListener = (changes, areaName) => {
    if (areaName !== 'local') return;
    
    if (changes.progressUpdate) {
      const newProgress = changes.progressUpdate.newValue;
      if (newProgress) {
        console.log('[Popup] Progress updated via storage.onChanged:', newProgress);
        updateProgress(newProgress);
      }
    }
    
    if (changes.progressComplete) {
      const isComplete = changes.progressComplete.newValue;
      if (isComplete) {
        console.log('[Popup] Progress complete via storage.onChanged!');
        stopProgressListening();
        chrome.storage.local.get(['progressUpdate'], (result) => {
          if (result.progressUpdate) {
            setTimeout(() => {
              showStatus(i18n('statusSuccess', [result.progressUpdate.total.toString()]), 'success');
              resetProgress();
              textarea.value = '';
              textarea.style.height = 'auto';
              sendBtn.disabled = false;
              sendBtn.textContent = i18n('sendButton');
              
              // 清除进度数据
              chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
              
              // 2秒后关闭popup
              setTimeout(() => {
                window.close();
              }, 2000);
            }, 500);
          }
        });
      }
    }
  };
  
  chrome.storage.onChanged.addListener(storageChangeListener);
  
  // 方式2: 轮询作为备选（每500ms检查一次）
  const pollInterval = setInterval(() => {
    chrome.storage.local.get(['progressUpdate', 'progressComplete'], (result) => {
      if (result.progressUpdate) {
        console.log('[Popup] Progress update via polling:', result.progressUpdate);
        updateProgress(result.progressUpdate);
        
        if (result.progressComplete) {
          console.log('[Popup] Progress complete via polling!');
          clearInterval(pollInterval);
          stopProgressListening();
          setTimeout(() => {
            showStatus(i18n('statusSuccess', [result.progressUpdate.total.toString()]), 'success');
            resetProgress();
            textarea.value = '';
            textarea.style.height = 'auto';
            sendBtn.disabled = false;
            sendBtn.textContent = i18n('sendButton');
            
            chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
            
            setTimeout(() => {
              window.close();
            }, 2000);
          }, 500);
        }
      }
    });
  }, 500);
  
  // 保存 interval ID 以便清理
  window._progressPollInterval = pollInterval;
}

function stopProgressListening() {
  if (window._progressPollInterval) {
    clearInterval(window._progressPollInterval);
    window._progressPollInterval = null;
  }
  if (storageChangeListener) {
    chrome.storage.onChanged.removeListener(storageChangeListener);
    storageChangeListener = null;
  }
  progressListenerActive = false;
  console.log('[Popup] Progress listener stopped');
}

// 暂时禁用进度监听功能
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'progressUpdate') {
//     updateProgress(message.progress);
//     chrome.storage.local.set({ 
//       progressUpdate: message.progress,
//       progressUpdateTime: Date.now()
//     });
//   } else if (message.action === 'progressComplete') {
//     stopProgressListening();
//     updateProgress(message.progress);
//     setTimeout(() => {
//       showStatus(i18n('statusSuccess', [message.progress.total.toString()]), 'success');
//       resetProgress();
//       textarea.value = '';
//       textarea.style.height = 'auto';
//       sendBtn.disabled = false;
//       sendBtn.textContent = i18n('sendButton');
//       chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
//       setTimeout(() => {
//         window.close();
//       }, 2000);
//     }, 500);
//   } else if (message.action === 'progressError') {
//     stopProgressListening();
//     showStatus(i18n('errorSendFailed', [message.error || '']), 'error');
//     resetProgress();
//     sendBtn.disabled = false;
//     sendBtn.textContent = i18n('sendButton');
//     chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
//   }
// });

// 发送函数
function sendQuery() {
  const query = textarea.value.trim();
  
  if (!query) {
    showStatus(i18n('errorNoQuery'), 'error');
    return;
  }
  
  const selectedPlatforms = getSelectedPlatforms();
  
  if (selectedPlatforms.length === 0) {
    showStatus(i18n('errorNoPlatform'), 'error');
    return;
  }
  
  // 禁用按钮
  sendBtn.disabled = true;
  sendBtn.textContent = i18n('sending');
  
  // 暂时禁用进度条功能
  // resetProgress();
  // const initialProgress = {
  //   total: selectedPlatforms.length,
  //   opened: 0,
  //   loading: 0,
  //   completed: 0,
  //   currentAction: i18n('progressStarting')
  // };
  // updateProgress(initialProgress);
  // chrome.storage.local.set({
  //   progressUpdate: initialProgress,
  //   progressUpdateTime: Date.now()
  // }).catch(() => {});
  // startProgressListening();
  
  // 发送消息到 background，包含选中的平台
  chrome.runtime.sendMessage({ 
    action: 'sendToAllAIs', 
    query,
    platforms: selectedPlatforms
  }, (response) => {
    if (chrome.runtime.lastError) {
      // stopProgressListening();
      showStatus(i18n('errorSendFailed', [chrome.runtime.lastError.message]), 'error');
      // resetProgress();
      sendBtn.disabled = false;
      sendBtn.textContent = i18n('sendButton');
      // chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
    } else {
      showStatus(i18n('statusSuccess', [selectedPlatforms.length.toString()]), 'success');
      textarea.value = '';
      textarea.style.height = 'auto';
      sendBtn.disabled = false;
      sendBtn.textContent = i18n('sendButton');
      
      // 1秒后关闭popup
      setTimeout(() => {
        window.close();
      }, 1000);
    }
  });
}

// 显示状态
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  
  if (type === 'error') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}

// 点击发送按钮
sendBtn.addEventListener('click', sendQuery);

// 按 Enter 发送（Shift+Enter 换行）
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
});

// 自动聚焦
textarea.focus();

