const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露安全的API给渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 获取配置
   */
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  /**
   * 保存配置
   */
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  /**
   * 选择文件
   */
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  
  /**
   * 选择保存位置
   */
  selectSavePath: (options) => ipcRenderer.invoke('select-save-path', options),
  
  /**
   * 选择文件夹
   */
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
  
  /**
   * 文本转语音
   */
  textToSpeech: (data) => ipcRenderer.invoke('text-to-speech', data),
  

  
  /**
   * 保存文件
   */
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
  
  /**
   * 读取文本文件
   */
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  
  /**
   * 打开文件夹
   */
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  
  /**
   * 测试API连接
   */
  testApiConnection: (apiUrl) => ipcRenderer.invoke('test-api-connection', apiUrl),
  
  /**
   * 获取应用路径
   */
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  /**
   * 创建目录
   */
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
  
  /**
   * 读取文件
   */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  /**
   * 删除文件
   */
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  

});