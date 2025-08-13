const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const chardet = require('chardet');
const iconv = require('iconv-lite');

// 禁用硬件加速以解决GPU进程错误
app.disableHardwareAcceleration();

/**
 * 创建主窗口
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile('index.html');
  
  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * 应用准备就绪时创建窗口
 */
app.whenReady().then(createWindow);

/**
 * 所有窗口关闭时退出应用（macOS除外）
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用激活时创建窗口（macOS）
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');

/**
 * 读取配置文件
 */
function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config;
    }
  } catch (error) {
    console.error('读取配置文件失败:', error);
  }
  return { apiUrl: 'http://127.0.0.1:9933' };
}

/**
 * 保存配置文件
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('保存配置文件失败:', error);
    return false;
  }
}

/**
 * IPC处理器：获取配置
 */
ipcMain.handle('get-config', () => {
  return readConfig();
});

/**
 * IPC处理器：保存配置
 */
ipcMain.handle('save-config', (event, config) => {
  return saveConfig(config);
});

/**
 * IPC处理器：选择文件
 */
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

/**
 * IPC处理器：选择保存位置
 */
ipcMain.handle('select-save-path', async (event, options) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});

/**
 * IPC处理器：选择文件夹
 */
ipcMain.handle('select-directory', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    ...options
  });
  return result;
});

/**
 * IPC处理器：文本转语音
 */
ipcMain.handle('text-to-speech', async (event, data) => {
  try {
    const config = readConfig();
    const response = await axios.post(`${config.apiUrl}/tts`, data, {
      responseType: 'arraybuffer',
      timeout: 0 // 移除超时限制，允许长时间处理
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('音色克隆失败:', error);
    let errorMessage = error.message;
    
    // 如果是HTTP错误，尝试获取更详细的错误信息
    if (error.response) {
      console.error('HTTP状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      
      // 尝试解析错误响应
      if (error.response.data) {
        try {
          const errorData = typeof error.response.data === 'string' ? 
            error.response.data : 
            JSON.stringify(error.response.data);
          errorMessage += ` - ${errorData}`;
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    return { success: false, error: errorMessage };
  }
});



/**
 * IPC处理器：保存文件
 */
ipcMain.handle('save-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC处理器：读取文本文件
 */
ipcMain.handle('read-text-file', async (event, filePath) => {
  try {
    // 读取文件的原始字节数据
    const buffer = fs.readFileSync(filePath);
    
    // 检测文件编码
    const encoding = chardet.detect(buffer);
    console.log(`检测到文件编码: ${encoding}`);
    
    let content;
    
    // 如果检测到的编码是UTF-8或者检测失败，直接使用UTF-8读取
    if (!encoding || encoding.toLowerCase().includes('utf-8') || encoding.toLowerCase().includes('ascii')) {
      content = buffer.toString('utf8');
    } else {
      // 如果是其他编码（如GBK），先转换为UTF-8
      try {
        content = iconv.decode(buffer, encoding);
        console.log(`文件编码从 ${encoding} 转换为 UTF-8`);
      } catch (convertError) {
        console.warn(`编码转换失败，尝试使用GBK编码: ${convertError.message}`);
        // 如果转换失败，尝试使用GBK编码
        try {
          content = iconv.decode(buffer, 'gbk');
          console.log('使用GBK编码读取文件成功');
        } catch (gbkError) {
          console.warn(`GBK编码也失败，使用UTF-8强制读取: ${gbkError.message}`);
          // 最后尝试强制使用UTF-8
          content = buffer.toString('utf8');
        }
      }
    }
    
    return { success: true, content, detectedEncoding: encoding };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC处理器：打开文件夹
 */
ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.showItemInFolder(folderPath);
});

/**
 * IPC处理器：测试API连接
 */
ipcMain.handle('test-api-connection', async (event, apiUrl) => {
  try {
    const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC处理器：获取应用路径
 */
ipcMain.handle('get-app-path', () => {
  return __dirname;
});

/**
 * IPC处理器：创建目录
 */
ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC处理器：读取文件
 */
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data;
  } catch (error) {
    console.error('读取文件失败:', error);
    return null;
  }
});

/**
 * IPC处理器：删除文件
 */
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * IPC处理器：音色克隆
 */
ipcMain.handle('voice-clone', async (event, data) => {
  try {
    const config = readConfig();
    const { text, referenceAudio, referenceText, speed = 1.0, version = 'v2' } = data;
    
    // 创建FormData
    const formData = new FormData();
    formData.append('text', text);
    formData.append('speed', speed.toString());
    
    // 读取参考音频文件
    const audioBuffer = fs.readFileSync(referenceAudio);
    formData.append('reference_audio', audioBuffer, {
      filename: path.basename(referenceAudio),
      contentType: 'audio/wav'
    });
    
    // 根据版本选择接口
    let endpoint;
    if (referenceText && referenceText.trim()) {
      // 同语言克隆（需要参考文本）
      formData.append('reference_text', referenceText);
      endpoint = version === 'v1' ? '/clone_eq' : '/clone_eq';
    } else {
      // 跨语言克隆（不需要参考文本）
      endpoint = version === 'v1' ? '/clone' : '/clone';
    }
    
    const response = await axios.post(`${config.apiUrl}${endpoint}`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer',
      timeout: 300000 // 5分钟超时
    });
    
    return {
      success: true,
      data: Buffer.from(response.data)
    };
  } catch (error) {
    console.error('音色克隆失败:', error);
    return {
      success: false,
      error: error.response?.data ? Buffer.from(error.response.data).toString() : error.message
    };
  }
});