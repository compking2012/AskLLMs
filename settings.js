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
}

// 平台图标映射
const PLATFORM_ICONS = {
  "ChatGPT": "icons/chatgpt.png",
  "Claude": "icons/claude.png",
  "Gemini": "icons/gemini.png",
  "Grok": "icons/grok.png",
  "千问": "icons/qwen.png",
  "豆包": "icons/doubao.png",
  "DeepSeek": "icons/deepseek.png",
  "Kimi": "icons/kimi.png",
  "文心一言": "icons/wenxin.png",
  "智谱清言": "icons/chatglm.png",
  "MiniMax": "icons/minimax.png",
  "腾讯元宝": "icons/yuanbao.png"
};

// 平台名称到 i18n 键的映射（只对中文名字）
const PLATFORM_I18N_KEYS = {
  "千问": "platformQwen",
  "豆包": "platformDoubao",
  "文心一言": "platformWenxin",
  "智谱清言": "platformChatGLM",
  "腾讯元宝": "platformYuanbao"
};

// 获取平台显示名称（支持 i18n）
function getPlatformDisplayName(platform) {
  const i18nKey = PLATFORM_I18N_KEYS[platform];
  if (i18nKey) {
    return i18n(i18nKey);
  }
  return platform; // 英文名字直接返回
}

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'auto',
  language: 'auto',
  visiblePlatforms: ['ChatGPT', 'Claude', 'Gemini', 'Grok', '千问', '豆包', 'DeepSeek', 'Kimi', '文心一言', '智谱清言', 'MiniMax', '腾讯元宝'],
  tabGroupTitle: '',
  colorMode: 'random',
  fixedColor: 'blue'
};

// 应用主题
async function applyTheme(themeSetting) {
  const theme = themeSetting || 'auto';
  
  if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// 显示状态消息
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.className = 'status';
    statusDiv.style.display = 'none';
  }, 3000);
}

// 初始化设置页面
function initSettingsPage() {
  // 生成平台复选框
  const platformCheckboxes = document.getElementById('platform-checkboxes');
  platformCheckboxes.innerHTML = '';
  
  // 获取所有平台（从默认设置中）
  const allPlatforms = DEFAULT_SETTINGS.visiblePlatforms;
  allPlatforms.forEach(platform => {
    const checkbox = document.createElement('label');
    checkbox.className = 'settings-checkbox';
    const displayName = getPlatformDisplayName(platform);
    checkbox.innerHTML = `
      <input type="checkbox" value="${platform}" data-platform="${platform}">
      <span class="icon"><img src="${chrome.runtime.getURL(PLATFORM_ICONS[platform])}" alt="${platform}"></span>
      <span>${displayName}</span>
    `;
    platformCheckboxes.appendChild(checkbox);
  });
  
  // 加载设置并填充表单
  loadSettingsToForm();
  
  // 初始化事件监听器
  initEventListeners();
}

// 初始化事件监听器
function initEventListeners() {
  // 颜色模式切换
  document.querySelectorAll('input[name="color-mode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const colorSelector = document.getElementById('color-selector');
      if (e.target.value === 'fixed') {
        colorSelector.style.display = 'block';
      } else {
        colorSelector.style.display = 'none';
      }
      // 立即保存
      await saveSettings();
    });
  });
  
  // 为主题单选按钮添加立即保存
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      await saveSettings();
    });
  });
  
  // 为语言单选按钮添加立即保存
  document.querySelectorAll('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      await saveSettings();
    });
  });
  
  // 为颜色单选按钮添加立即保存
  document.querySelectorAll('input[name="color"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      await saveSettings();
    });
  });
  
  // 为标签组标题输入框添加立即保存（使用 debounce）
  const tabGroupTitleInput = document.getElementById('tab-group-title');
  let titleInputTimeout = null;
  tabGroupTitleInput.addEventListener('input', () => {
    clearTimeout(titleInputTimeout);
    titleInputTimeout = setTimeout(async () => {
      await saveSettings();
    }, 500); // 500ms 延迟，避免频繁保存
  });
  
  // 复选框点击事件（立即保存）
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const label = e.target.closest('.settings-checkbox');
      if (e.target.checked) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
      // 立即保存
      await saveSettings();
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
  await applyTheme(themeValue);
  
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
}

// 保存设置（立即保存）
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
  
  // 立即应用主题
  await applyTheme(settings.theme);
  
  // 更新语言缓存并重新初始化 i18n，让语言设置立即生效
  currentLanguage = null; // 清除缓存，强制重新读取
  await initI18n();
  
  // 重新生成平台复选框以更新名称
  initSettingsPage();
}

// 检查登录状态
async function checkLoginStatus() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['user'], resolve);
  });
  return result.user || null;
}

// 模拟登录（后端未开发，简单验证）
async function login(username, password) {
  // 模拟登录：任何非空用户名和密码都可以登录
  if (!username || !password) {
    return { success: false, message: i18n('loginRequired') };
  }
  
  // 模拟登录成功
  const user = {
    username: username,
    loginTime: Date.now()
  };
  
  await new Promise(resolve => {
    chrome.storage.local.set({ user }, resolve);
  });
  
  return { success: true, user };
}

// 登出
async function logout() {
  await new Promise(resolve => {
    chrome.storage.local.remove(['user'], resolve);
  });
  updateLoginUI();
}

// 更新登录UI
async function updateLoginUI() {
  const user = await checkLoginStatus();
  const loginSection = document.getElementById('login-section');
  const loggedInSection = document.getElementById('logged-in-section');
  const loggedInUsername = document.getElementById('logged-in-username');
  
  if (user) {
    if (loginSection) loginSection.style.display = 'none';
    if (loggedInSection) loggedInSection.style.display = 'block';
    if (loggedInUsername) {
      loggedInUsername.textContent = user.username;
    }
  } else {
    if (loginSection) loginSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
    // 清空输入框
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }
}

// 初始化登录UI
async function initLogin() {
  await updateLoginUI();
  
  // 登录按钮事件
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      if (!usernameInput || !passwordInput) return;
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      
      const result = await login(username, password);
      if (result.success) {
        await updateLoginUI();
        showStatus(i18n('loginSuccess'), 'success');
      } else {
        showStatus(result.message || i18n('loginFailed'), 'error');
      }
    });
  }
  
  // 登出按钮事件
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      showStatus(i18n('logoutButton'), 'success');
    });
  }
  
  // 查看历史按钮事件
  const viewHistoryBtn = document.getElementById('view-history-btn');
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener('click', () => {
      // 打开历史记录页面（在 popup 中）
      chrome.runtime.sendMessage({ action: 'openHistoryPage' }, () => {
        // 如果 popup 未打开，则打开它
        chrome.action.openPopup();
      });
    });
  }
}

// 返回按钮事件
const backBtn = document.getElementById('back-btn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.close();
  });
}

// 初始化
(async () => {
  await initI18n();
  initSettingsPage();
  await initLogin();
})();

