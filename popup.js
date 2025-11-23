// 消息缓存
let messagesCache = {
  en: null,
  zh_CN: null
};

// 当前语言（同步访问）
let currentLanguage = null;

// 加载消息文件
async function loadMessages(locale) {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }
  
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
    const messages = await response.json();
    messagesCache[locale] = messages;
    return messages;
  } catch (e) {
    console.error(`Failed to load messages for ${locale}:`, e);
    return null;
  }
}

// 获取当前语言设置（同步版本，使用缓存）
function getCurrentLanguageSync() {
  if (currentLanguage !== null) {
    return currentLanguage;
  }
  
  // 如果缓存未设置，使用浏览器语言作为默认值
  const browserLang = chrome.i18n.getUILanguage();
  return browserLang.startsWith('zh') ? 'zh_CN' : 'en';
}

// 更新当前语言（从设置中读取）
async function updateCurrentLanguage() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  const language = result.settings?.language || 'auto';
  
  if (language === 'auto') {
    // 使用浏览器语言
    const browserLang = chrome.i18n.getUILanguage();
    currentLanguage = browserLang.startsWith('zh') ? 'zh_CN' : 'en';
  } else {
    currentLanguage = language;
  }
  
  // 预加载当前语言的消息
  await loadMessages(currentLanguage);
}

// i18n 支持函数（同步版本，支持用户语言设置）
function i18n(messageName, substitutions) {
  const locale = getCurrentLanguageSync();
  const messages = messagesCache[locale];
  
  if (messages && messages[messageName]) {
    let message = messages[messageName].message;
    
    // 处理占位符
    if (substitutions && messages[messageName].placeholders) {
      Object.keys(messages[messageName].placeholders).forEach(placeholder => {
        const placeholderInfo = messages[messageName].placeholders[placeholder];
        const index = parseInt(placeholderInfo.content.replace('$', '')) - 1;
        if (substitutions[index] !== undefined) {
          message = message.replace(`$${placeholder}$`, substitutions[index]);
        }
      });
    }
    
    return message;
  }
  
  // 回退到 Chrome 默认 i18n
  return chrome.i18n.getMessage(messageName, substitutions);
}

// 初始化 i18n
async function initI18n() {
  // 更新当前语言
  await updateCurrentLanguage();
  
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
  
  // 更新平台按钮的 tooltip 和 title（支持 i18n）
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    const displayName = AIModel.getPlatformDisplayName(platform, i18n);
    btn.setAttribute('data-tooltip', displayName);
    btn.setAttribute('title', displayName);
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
const settingsPageContainer = document.getElementById('settings-page-container');
const settingsBtn = document.getElementById('settings-btn');
let settingsPage = null;
let backBtn = null;

// 获取平台显示名称的包装函数（使用 AIModel 的静态方法）
function getPlatformDisplayName(platform) {
  return AIModel.getPlatformDisplayName(platform, i18n);
}

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
  
  const settings = result.settings || AIModel.DEFAULT_SETTINGS;
  
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

// 设置页面相关函数已移至 settings.js
// 使用 settings.js 中的函数
function initSettingsPage() {
  if (typeof window.initSettingsPageFromSettings === 'function') {
    window.initSettingsPageFromSettings(platformBtns, AIModel.PLATFORM_ICONS, getPlatformDisplayName, AIModel.DEFAULT_SETTINGS, loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

async function loadSettingsToForm() {
  if (typeof window.loadSettingsToFormFromSettings === 'function') {
    await window.loadSettingsToFormFromSettings(AIModel.DEFAULT_SETTINGS, loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

async function saveSettings() {
  if (typeof window.saveSettingsFromSettings === 'function') {
    await window.saveSettingsFromSettings(loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

// 页面切换
function showMainPage() {
  mainPage.classList.add('active');
  if (settingsPage) {
    settingsPage.classList.remove('active');
  }
}

async function showSettingsPage() {
  // 如果设置页面还未加载，则动态加载
  if (!settingsPage) {
    try {
      const response = await fetch(chrome.runtime.getURL('settings.html'));
      const html = await response.text();
      settingsPageContainer.innerHTML = html;
      settingsPage = document.getElementById('settings-page');
      backBtn = document.getElementById('back-btn');
      
      // 绑定返回按钮事件
      if (backBtn) {
        backBtn.addEventListener('click', showMainPage);
      }
      
      // 初始化设置页面
      initSettingsPage();
      // 重新初始化i18n（设置页面可能刚显示）
      initI18n();
    } catch (error) {
      console.error('Failed to load settings page:', error);
      showStatus(i18n('errorLoadSettings') || '加载设置页面失败', 'error');
      return;
    }
  }
  
  mainPage.classList.remove('active');
  settingsPage.classList.add('active');
  
  // 重新初始化设置页面（确保数据是最新的）
  initSettingsPage();
  // 重新初始化i18n（设置页面可能刚显示）
  initI18n();
}

// 事件监听
settingsBtn.addEventListener('click', showSettingsPage);

// 初始化 i18n
initI18n();

// 加载设置
loadAndApplySettings();

// 检查是否有进行中的进度并恢复
async function checkAndRestoreProgress() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['progressUpdate', 'progressComplete', 'progressUpdateTime'], resolve);
  });
  
  // 检查是否有进度数据，且不是已完成状态，且时间在最近5分钟内（避免恢复过期的进度）
  if (result.progressUpdate && !result.progressComplete) {
    const timeDiff = Date.now() - (result.progressUpdateTime || 0);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeDiff < fiveMinutes) {
      console.log('[Popup] Restoring progress:', result.progressUpdate);
      
      // 恢复进度显示
      updateProgress(result.progressUpdate);
      
      // 禁用输入框和按钮
      textarea.disabled = true;
      sendBtn.disabled = true;
      sendBtn.textContent = i18n('sending');
      
      // 重新启动进度监听
      startProgressListening();
    } else {
      // 进度过期，清除
      console.log('[Popup] Progress expired, clearing');
      chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
    }
  }
}

// 页面加载时检查并恢复进度
checkAndRestoreProgress();

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

// 拖拽选择功能
let isDragSelecting = false;
let dragStartBtn = null;
let visitedButtons = new Set();
let mouseDownTime = 0;
let hasMoved = false;

// 平台按钮点击事件
platformBtns.forEach(btn => {
  
  // 设置按钮不可拖动，防止图标被拖动
  btn.setAttribute('draggable', 'false');
  
  // 阻止默认的拖拽行为
  btn.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
  
  btn.addEventListener('mousedown', (e) => {
    mouseDownTime = Date.now();
    hasMoved = false;
    isDragSelecting = false;
    dragStartBtn = btn;
    visitedButtons.clear();
    // 不将起始按钮添加到 visitedButtons，这样它也会被取反处理
    
    // 添加拖拽选择样式
    btn.classList.add('drag-selecting');
    document.body.classList.add('drag-select-mode');
  });
  
  btn.addEventListener('mouseenter', (e) => {
    if (isDragSelecting && dragStartBtn) {
      if (!visitedButtons.has(btn)) {
        visitedButtons.add(btn);
        // 取反操作：如果当前是选中的就取消选中，如果未选中就选中
        btn.classList.toggle('active');
        
        const selected = getSelectedPlatforms();
        saveSelectedPlatforms(selected);
      }
    }
  });
  
  btn.addEventListener('click', (e) => {
    // 如果是在拖拽选择模式下，阻止默认的点击切换行为
    // 主要检查 isDragSelecting，因为一旦进入拖拽选择模式，就不应该触发点击切换
    if (isDragSelecting) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    btn.classList.toggle('active');
    
    const selected = getSelectedPlatforms();
    saveSelectedPlatforms(selected);
  });
});

// 全局鼠标移动事件处理拖拽选择
document.addEventListener('mousemove', (e) => {
  if (dragStartBtn && !hasMoved) {
    const timeSinceMouseDown = Date.now() - mouseDownTime;
    // 如果按住超过 200ms 或移动了超过 5px，开始拖拽选择模式
    const moved = Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5;
    if (timeSinceMouseDown > 200 || moved) {
      hasMoved = true;
      isDragSelecting = true;
      
      // 拖拽开始时，对起始按钮也进行取反操作
      if (dragStartBtn && !visitedButtons.has(dragStartBtn)) {
        visitedButtons.add(dragStartBtn);
        dragStartBtn.classList.toggle('active');
        const selected = getSelectedPlatforms();
        saveSelectedPlatforms(selected);
      }
      
      // 防止文本选择
      e.preventDefault();
    }
  }
  
  // 检查鼠标是否在平台按钮上
  if (isDragSelecting) {
    const target = e.target.closest('.platform-btn');
    if (target && dragStartBtn && !visitedButtons.has(target)) {
      visitedButtons.add(target);
      // 取反操作：如果当前是选中的就取消选中，如果未选中就选中
      target.classList.toggle('active');
      
      const selected = getSelectedPlatforms();
      saveSelectedPlatforms(selected);
    }
  }
});

// 结束拖拽选择
function endDragSelect() {
  if (dragStartBtn) {
    isDragSelecting = false;
    visitedButtons.clear();
    dragStartBtn = null;
    hasMoved = false;
    mouseDownTime = 0;
    
    // 移除拖拽选择样式
    platformBtns.forEach(btn => {
      btn.classList.remove('drag-selecting');
    });
    document.body.classList.remove('drag-select-mode');
  }
}

// 全局鼠标事件处理
document.addEventListener('mouseup', () => {
  endDragSelect();
});

// 处理鼠标离开窗口的情况
document.addEventListener('mouseleave', (e) => {
  // 如果鼠标离开窗口，结束拖拽选择
  if (isDragSelecting && (!e.relatedTarget || e.relatedTarget === null)) {
    endDragSelect();
  }
});

// 防止拖拽选择时选中文本
document.addEventListener('selectstart', (e) => {
  if (isDragSelecting) {
    e.preventDefault();
  }
});

// 初始化
initPlatformButtons();

// 自动调整输入框高度
textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// 更新平台按钮的进度条
function updatePlatformProgress(platform, status) {
  const btn = Array.from(platformBtns).find(b => b.dataset.platform === platform);
  if (!btn) return;
  
  const progressRing = btn.querySelector('.progress-ring');
  const progressCircle = btn.querySelector('.progress-circle');
  if (!progressRing || !progressCircle) return;
  
  // 计算进度
  let progress = 0;
  if (status === 'opening') {
    progress = 25; // 25% - 正在打开
    btn.classList.add('loading');
    btn.classList.remove('completed', 'error');
  } else if (status === 'loading') {
    progress = 75; // 75% - 正在加载
    btn.classList.add('loading');
    btn.classList.remove('completed', 'error');
  } else if (status === 'completed') {
    progress = 100; // 100% - 完成
    btn.classList.remove('loading');
    btn.classList.add('completed');
  } else {
    // 未知状态，隐藏进度条
    btn.classList.remove('loading', 'completed', 'error');
    progress = 0;
  }
  
  // 更新进度条
  const circumference = 2 * Math.PI * 18; // r=18
  const offset = circumference - (progress / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
  
  // 显示/隐藏进度条
  if (progress > 0) {
    progressRing.style.opacity = '1';
  } else {
    progressRing.style.opacity = '0';
  }
}

// 更新进度条
function updateProgress(progress) {
  const { total, opened, loading, completed, currentAction, statuses } = progress;
  
  // 显示进度容器
  progressContainer.classList.add('active');
  statusDiv.style.display = 'none';
  
  // 更新每个平台按钮的进度条
  if (statuses) {
    Object.entries(statuses).forEach(([platform, status]) => {
      updatePlatformProgress(platform, status);
    });
  }
  
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
  
  // 重置所有平台按钮的进度条
  platformBtns.forEach(btn => {
    btn.classList.remove('loading', 'completed', 'error');
    const progressRing = btn.querySelector('.progress-ring');
    const progressCircle = btn.querySelector('.progress-circle');
    if (progressRing && progressCircle) {
      progressRing.style.opacity = '0';
      progressCircle.style.strokeDashoffset = '113'; // 重置为0%
    }
  });
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
              textarea.disabled = false;
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
            textarea.disabled = false;
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
  
  // 禁用输入框和按钮
  textarea.disabled = true;
  sendBtn.disabled = true;
  sendBtn.textContent = i18n('sending');
  
  // 重置并启动进度条
  resetProgress();
  const initialProgress = {
    total: selectedPlatforms.length,
    opened: 0,
    loading: 0,
    completed: 0,
    currentAction: i18n('progressStarting'),
    statuses: {}
  };
  updateProgress(initialProgress);
  chrome.storage.local.set({
    progressUpdate: initialProgress,
    progressUpdateTime: Date.now(),
    progressComplete: false
  }).catch(() => {});
  startProgressListening();
  
  // 发送消息到 background，包含选中的平台
  chrome.runtime.sendMessage({ 
    action: 'sendToAllAIs', 
    query,
    platforms: selectedPlatforms
  }, (response) => {
    if (chrome.runtime.lastError) {
      stopProgressListening();
      showStatus(i18n('errorSendFailed', [chrome.runtime.lastError.message]), 'error');
      resetProgress();
      textarea.disabled = false;
      sendBtn.disabled = false;
      sendBtn.textContent = i18n('sendButton');
      chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
    }
    // 注意：成功的情况由进度监听器处理
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

