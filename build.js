const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { minify } = require('terser');

// 配置
const config = {
  inputDir: __dirname,
  outputDir: path.join(__dirname, 'dist'),
  outputZip: path.join(__dirname, 'dist', 'ask-llms.zip'),
  excludeDirs: ['node_modules', 'tests', 'dist', '.git'],
  excludeFiles: ['.gitignore', 'package.json', 'package-lock.json', 'build.js', 'README.md', 'TODO.md', 'PERMISSIONS_EXPLANATION_EN.md', 'PERMISSIONS_EXPLANATION_ZH.md', 'screenshot.jpg'],
  jsFiles: ['background.js', 'popup.js', 'settings.js'],
  jsDirs: ['models']
};

// 检查是否是开发模式
const isDev = process.argv.includes('--dev');

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    // 跳过排除的目录
    if (fs.statSync(filePath).isDirectory()) {
      const dirName = path.basename(filePath);
      if (config.excludeDirs.includes(dirName)) {
        return;
      }
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      // 跳过排除的文件
      if (config.excludeFiles.includes(file)) {
        return;
      }
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * 处理 JavaScript 文件：移除 console.log 并混淆
 */
async function processJavaScript(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Chrome Extension 需要保留的全局变量和 API
    const reservedNames = [
      'chrome', 'browser', 'window', 'document', 'console',
      'chrome.runtime', 'chrome.storage', 'chrome.tabs', 'chrome.tabGroups',
      'chrome.scripting', 'chrome.i18n', 'chrome.action',
      'addEventListener', 'removeEventListener', 'dispatchEvent',
      'querySelector', 'querySelectorAll', 'getElementById',
      'classList', 'textContent', 'innerHTML', 'click', 'focus',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
      'Error', 'TypeError', 'ReferenceError'
    ];
    
    if (isDev) {
      // 开发模式：只移除 console.log，不混淆
      const result = await minify(content, {
        compress: {
          drop_console: true, // 移除所有 console.*
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace', 'console.warn', 'console.error']
        },
        mangle: false, // 不混淆变量名
        format: {
          comments: false
        }
      });
      return result.code || content; // 如果压缩失败，返回原内容
    } else {
      // 生产模式：移除 console.log 并混淆
      const result = await minify(content, {
        compress: {
          drop_console: true, // 移除所有 console.*
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace', 'console.warn', 'console.error'],
          passes: 2, // 多次压缩以获得更好的效果
          unsafe: false, // 不使用不安全的优化
          unsafe_comps: false,
          unsafe_math: false,
          unsafe_proto: false
        },
        mangle: {
          toplevel: false, // 不混淆顶级作用域的变量名（保持 Chrome Extension API 可用）
          properties: false, // 不混淆对象属性名
          reserved: reservedNames // 保留 Chrome Extension API 名称
        },
        format: {
          comments: false
        }
      });
      return result.code || content; // 如果压缩失败，返回原内容
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return fs.readFileSync(filePath, 'utf8'); // 出错时返回原文件
  }
}

/**
 * 判断文件是否需要处理
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return ext === '.js' && (
    config.jsFiles.includes(path.basename(filePath)) ||
    filePath.includes(path.join('models', path.sep))
  );
}

/**
 * 获取相对路径
 */
function getRelativePath(filePath) {
  return path.relative(config.inputDir, filePath);
}

/**
 * 创建 ZIP 文件
 */
async function createZip() {
  return new Promise((resolve, reject) => {
    // 确保输出目录存在
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const output = fs.createWriteStream(config.outputZip);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✓ ZIP file created: ${config.outputZip}`);
      console.log(`✓ Total size: ${sizeInMB} MB`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 获取所有文件
    const allFiles = getAllFiles(config.inputDir);

    // 处理文件
    const processPromises = allFiles.map(async (filePath) => {
      const relativePath = getRelativePath(filePath);
      
      if (shouldProcessFile(filePath)) {
        // 处理 JavaScript 文件
        const processedContent = await processJavaScript(filePath);
        archive.append(processedContent, { name: relativePath });
        console.log(`✓ Processed: ${relativePath}`);
      } else {
        // 直接添加其他文件
        archive.file(filePath, { name: relativePath });
        console.log(`✓ Added: ${relativePath}`);
      }
    });

    Promise.all(processPromises).then(() => {
      archive.finalize();
    }).catch(reject);
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Starting build process...');
  console.log(`Mode: ${isDev ? 'Development' : 'Production'}`);
  console.log('');

  try {
    await createZip();
    console.log('');
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// 运行
main();

