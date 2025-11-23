/**
 * 设置页面逻辑
 * 此文件包含设置页面的所有逻辑，但集成在 popup 中
 */

// 设置页面事件监听器初始化标志
let settingsEventListenersInitialized = false;

/**
 * 初始化设置页面
 * @param {Array<HTMLElement>} platformBtns - 平台按钮元素数组
 * @param {Object} PLATFORM_ICONS - 平台图标映射
 * @param {Function} getPlatformDisplayName - 获取平台显示名称的函数
 * @param {Object} DEFAULT_SETTINGS - 默认设置
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
function initSettingsPage(platformBtns, PLATFORM_ICONS, getPlatformDisplayName, DEFAULT_SETTINGS, loadAndApplySettings, initI18n) {
  // 生成平台复选框
  const platformCheckboxes = document.getElementById('platform-checkboxes');
  if (!platformCheckboxes) return;
  
  platformCheckboxes.innerHTML = '';
  
  const allPlatforms = Array.from(platformBtns).map(btn => btn.dataset.platform);
  allPlatforms.forEach(platform => {
    const checkbox = document.createElement('label');
    checkbox.className = 'settings-checkbox';
    const displayName = getPlatformDisplayName(platform);
    checkbox.innerHTML = `
      <input type="checkbox" value="${platform}" data-platform="${platform}">
      <span class="icon"><img src="${PLATFORM_ICONS[platform]}" alt="${platform}"></span>
      <span>${displayName}</span>
    `;
    platformCheckboxes.appendChild(checkbox);
  });
  
  // 加载设置并填充表单
  loadSettingsToForm(DEFAULT_SETTINGS, loadAndApplySettings, initI18n);
  
  // 只初始化一次事件监听器（避免重复添加）
  if (!settingsEventListenersInitialized) {
    // 颜色模式切换
    document.querySelectorAll('input[name="color-mode"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const colorSelector = document.getElementById('color-selector');
        if (colorSelector) {
          if (e.target.value === 'fixed') {
            colorSelector.style.display = 'block';
          } else {
            colorSelector.style.display = 'none';
          }
        }
        // 立即保存
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为主题单选按钮添加立即保存
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为语言单选按钮添加立即保存
    document.querySelectorAll('input[name="language"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为颜色单选按钮添加立即保存
    document.querySelectorAll('input[name="color"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为标签组标题输入框添加立即保存（使用 debounce）
    const tabGroupTitleInput = document.getElementById('tab-group-title');
    if (tabGroupTitleInput) {
      let titleInputTimeout = null;
      tabGroupTitleInput.addEventListener('input', () => {
        clearTimeout(titleInputTimeout);
        titleInputTimeout = setTimeout(async () => {
          await saveSettings(loadAndApplySettings, initI18n);
        }, 500); // 500ms 延迟，避免频繁保存
      });
    }
    
    settingsEventListenersInitialized = true;
  }
}

/**
 * 加载设置到表单
 * @param {Object} DEFAULT_SETTINGS - 默认设置
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function loadSettingsToForm(DEFAULT_SETTINGS, loadAndApplySettings, initI18n) {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  const settings = result.settings || DEFAULT_SETTINGS;
  
  // 主题设置
  const themeValue = settings.theme || 'auto';
  const themeRadio = document.getElementById(`theme-${themeValue}`);
  if (themeRadio) themeRadio.checked = true;
  
  // 语言设置
  const langRadio = document.getElementById(`lang-${settings.language === 'auto' ? 'auto' : settings.language === 'zh_CN' ? 'zh' : 'en'}`);
  if (langRadio) langRadio.checked = true;
  
  // 可见平台设置
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    const platform = checkbox.dataset.platform;
    checkbox.checked = settings.visiblePlatforms.includes(platform);
    const label = checkbox.closest('.settings-checkbox');
    if (label) {
      if (checkbox.checked) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    }
  });
  
  // 标签组标题
  const tabGroupTitleInput = document.getElementById('tab-group-title');
  if (tabGroupTitleInput) {
    tabGroupTitleInput.value = settings.tabGroupTitle || '';
  }
  
  // 颜色模式
  const colorModeRadio = document.getElementById(`color-${settings.colorMode}`);
  if (colorModeRadio) colorModeRadio.checked = true;
  const colorSelector = document.getElementById('color-selector');
  if (colorSelector) {
    if (settings.colorMode === 'fixed') {
      colorSelector.style.display = 'block';
      const colorRadio = document.querySelector(`input[name="color"][value="${settings.fixedColor}"]`);
      if (colorRadio) colorRadio.checked = true;
    } else {
      colorSelector.style.display = 'none';
    }
  }
  
  // 复选框点击事件（立即保存）
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const label = e.target.closest('.settings-checkbox');
      if (label) {
        if (e.target.checked) {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
      }
      // 立即保存
      await saveSettings(loadAndApplySettings, initI18n);
    });
  });
}

/**
 * 保存设置（立即保存，不返回主页面）
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function saveSettings(loadAndApplySettings, initI18n) {
  const settings = {
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'auto',
    language: document.querySelector('input[name="language"]:checked')?.value || 'auto',
    visiblePlatforms: Array.from(document.querySelectorAll('#platform-checkboxes input[type="checkbox"]:checked'))
      .map(cb => cb.dataset.platform),
    tabGroupTitle: document.getElementById('tab-group-title')?.value.trim() || '',
    colorMode: document.querySelector('input[name="color-mode"]:checked')?.value || 'random',
    fixedColor: document.querySelector('input[name="color"]:checked')?.value || 'blue'
  };
  
  await new Promise(resolve => {
    chrome.storage.local.set({ settings }, resolve);
  });
  
  // 立即应用设置
  if (loadAndApplySettings) {
    await loadAndApplySettings();
  }
  
  // 更新语言缓存并重新初始化 i18n，让语言设置立即生效
  if (typeof currentLanguage !== 'undefined') {
    currentLanguage = null; // 清除缓存，强制重新读取
  }
  if (initI18n) {
    await initI18n();
  }
  
  // 如果在设置页面，需要重新生成平台复选框以更新名称
  const settingsPage = document.getElementById('settings-page');
  if (settingsPage && settingsPage.classList.contains('active')) {
    // 需要重新调用 initSettingsPage，但这里我们无法直接调用
    // 所以依赖外部调用
  }
}

// 导出函数到全局作用域，供 popup.js 调用
window.initSettingsPageFromSettings = initSettingsPage;
window.loadSettingsToFormFromSettings = loadSettingsToForm;
window.saveSettingsFromSettings = saveSettings;

