/**
 * 渲染进程主文件
 * 处理用户界面交互和业务逻辑
 */

// 全局变量
let currentConfig = {};
let selectedFile = null;
let selectedAudio = null;
let isProcessing = false;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

/**
 * 初始化应用
 */
async function initializeApp() {
    try {
        // 加载配置
        currentConfig = await window.electronAPI.getConfig();
        document.getElementById('apiUrl').value = currentConfig.apiUrl || 'http://127.0.0.1:9933';
        
        // 初始化字符计数
        updateCharCount();
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
        showNotification('初始化失败', 'error');
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 选项卡切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    document.getElementById('selectSavePathBtn').addEventListener('click', selectDefaultSavePath);
    document.getElementById('clearSavePathBtn').addEventListener('click', clearDefaultSavePath);
    
    // 文本转语音
    document.getElementById('textInput').addEventListener('input', updateCharCount);
    document.getElementById('speedSlider').addEventListener('input', updateSpeedValue);
    document.getElementById('synthesizeBtn').addEventListener('click', synthesizeText);
    
    // 文件转语音
    document.getElementById('fileUploadArea').addEventListener('click', selectTextFile);
    document.getElementById('fileUploadArea').addEventListener('dragover', handleDragOver);
    document.getElementById('fileUploadArea').addEventListener('drop', handleFileDrop);
    document.getElementById('clearFileBtn').addEventListener('click', clearSelectedFile);
    document.getElementById('fileSpeedSlider').addEventListener('input', updateFileSpeedValue);
    document.getElementById('batchSynthesizeBtn').addEventListener('click', batchSynthesize);
    
    // 音色克隆
    document.getElementById('audioUploadArea').addEventListener('click', selectAudioFile);
    document.getElementById('clearAudioBtn').addEventListener('click', clearSelectedAudio);
    document.getElementById('cloneSpeedSlider').addEventListener('input', updateCloneSpeedValue);
    document.getElementById('cloneBtn').addEventListener('click', cloneVoice);
    document.getElementById('cloneText').addEventListener('input', updateCloneButtonState);
    
    // 模态框点击外部关闭
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });
}

/**
 * 切换选项卡
 */
function switchTab(tabId) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

/**
 * 更新字符计数
 */
function updateCharCount() {
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const count = textInput.value.length;
    charCount.textContent = count;
    
    if (count > 1500) {
        charCount.style.color = '#dc3545';
    } else {
        charCount.style.color = '#6c757d';
    }
}

/**
 * 更新语速显示
 */
function updateSpeedValue() {
    const slider = document.getElementById('speedSlider');
    const display = document.getElementById('speedValue');
    display.textContent = slider.value;
}

function updateFileSpeedValue() {
    const slider = document.getElementById('fileSpeedSlider');
    const display = document.getElementById('fileSpeedValue');
    display.textContent = slider.value;
}

function updateCloneSpeedValue() {
    const slider = document.getElementById('cloneSpeedSlider');
    const display = document.getElementById('cloneSpeedValue');
    display.textContent = slider.value;
}

/**
 * 文本转语音
 */
async function synthesizeText() {
    const text = document.getElementById('textInput').value.trim();
    const role = document.getElementById('voiceSelect').value;
    const speed = parseFloat(document.getElementById('speedSlider').value);
    
    if (!text) {
        showNotification('请输入要合成的文本', 'error');
        return;
    }
    
    if (text.length > 1500) {
        showNotification('文本长度不能超过1500个字符', 'error');
        return;
    }
    
    // 禁用合成按钮，防止重复点击
    const synthesizeBtn = document.getElementById('synthesizeBtn');
    synthesizeBtn.disabled = true;
    synthesizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 合成中...';
    
    try {
        showLoading('正在合成语音...\n首次使用可能需要加载模型，请耐心等待（约2-5分钟）');
        
        const result = await window.electronAPI.textToSpeech({
            text,
            role,
            speed,
            version: 'v2'
        });
        
        if (result.success) {
            // 获取默认保存路径
            const defaultSaveDir = await getDefaultSavePath();
            
            // 创建保存目录
            await window.electronAPI.createDirectory(defaultSaveDir);
            
            // 生成文件名（使用时间戳避免重复）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const fileName = `语音合成_${timestamp}.wav`;
            const fullPath = `${defaultSaveDir}/${fileName}`;
            
            // 保存文件
            await window.electronAPI.saveFile(fullPath, result.data);
            showNotification('语音合成完成！', 'success');
            
            // 询问是否打开文件夹
            if (confirm('语音合成完成！是否打开文件所在文件夹？')) {
                await window.electronAPI.openFolder(fullPath);
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('合成失败:', error);
        showNotification(`合成失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
        // 恢复合成按钮状态
        synthesizeBtn.disabled = false;
        synthesizeBtn.innerHTML = '<i class="fas fa-play"></i> 开始合成';
    }
}



/**
 * 选择文本文件
 */
async function selectTextFile() {
    try {
        const result = await window.electronAPI.selectFile({
            title: '选择文本文件',
            filters: [{ name: '文本文件', extensions: ['txt'] }],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const fileResult = await window.electronAPI.readTextFile(filePath);
            
            if (fileResult.success) {
                selectedFile = {
                    path: filePath,
                    content: fileResult.content,
                    name: filePath.split('\\').pop(),
                    size: new Blob([fileResult.content]).size,
                    encoding: fileResult.detectedEncoding
                };
                
                displayFileInfo();
                
                // 显示编码检测信息
                if (fileResult.detectedEncoding) {
                    showNotification(`文件编码检测: ${fileResult.detectedEncoding}`, 'info');
                } else {
                    showNotification('文件编码检测: UTF-8 (默认)', 'info');
                }
            } else {
                throw new Error(fileResult.error);
            }
        }
    } catch (error) {
        console.error('选择文件失败:', error);
        showNotification(`选择文件失败: ${error.message}`, 'error');
    }
}

/**
 * 处理文件拖拽
 */
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

async function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    const txtFile = files.find(file => file.name.toLowerCase().endsWith('.txt'));
    
    if (txtFile) {
        try {
            // 使用后端API读取文件以获得编码检测
            const filePath = txtFile.path;
            if (filePath) {
                // 如果有文件路径，使用后端API读取
                const fileResult = await window.electronAPI.readTextFile(filePath);
                
                if (fileResult.success) {
                    selectedFile = {
                        path: filePath,
                        content: fileResult.content,
                        name: txtFile.name,
                        size: new Blob([fileResult.content]).size,
                        encoding: fileResult.detectedEncoding
                    };
                    
                    displayFileInfo();
                    
                    // 显示编码检测信息
                    if (fileResult.detectedEncoding) {
                        showNotification(`文件编码检测: ${fileResult.detectedEncoding}`, 'info');
                    } else {
                        showNotification('文件编码检测: UTF-8 (默认)', 'info');
                    }
                } else {
                    throw new Error(fileResult.error);
                }
            } else {
                // 如果没有文件路径，使用前端FileReader（可能无法检测编码）
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedFile = {
                        path: txtFile.name,
                        content: event.target.result,
                        name: txtFile.name,
                        size: txtFile.size,
                        encoding: 'UTF-8 (前端读取)'
                    };
                    displayFileInfo();
                    showNotification('文件编码检测: UTF-8 (前端读取，可能不准确)', 'warning');
                };
                reader.readAsText(txtFile, 'utf-8');
            }
        } catch (error) {
            console.error('读取文件失败:', error);
            showNotification(`读取文件失败: ${error.message}`, 'error');
        }
    } else {
        showNotification('请选择.txt格式的文件', 'error');
    }
}

/**
 * 显示文件信息
 */
function displayFileInfo() {
    if (!selectedFile) return;
    
    const segmentSize = parseInt(document.getElementById('segmentSize').value);
    const segments = Math.ceil(selectedFile.content.length / segmentSize);
    
    document.getElementById('fileName').textContent = selectedFile.name;
    document.getElementById('fileSize').textContent = formatFileSize(selectedFile.size);
    document.getElementById('fileChars').textContent = selectedFile.content.length;
    document.getElementById('fileSegments').textContent = segments;
    document.getElementById('fileEncoding').textContent = selectedFile.encoding || 'UTF-8';
    
    document.getElementById('fileUploadArea').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('batchSynthesizeBtn').disabled = false;
}

/**
 * 清除选中的文件
 */
function clearSelectedFile() {
    selectedFile = null;
    document.getElementById('fileUploadArea').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('batchSynthesizeBtn').disabled = true;
}

/**
 * 批量合成语音
 */
async function batchSynthesize() {
    if (!selectedFile) {
        showNotification('请先选择文本文件', 'error');
        return;
    }
    
    // 禁用批量合成按钮，防止重复点击
    const batchBtn = document.getElementById('batchSynthesizeBtn');
    batchBtn.disabled = true;
    batchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 合成中...';
    
    const voice = document.getElementById('fileVoiceSelect').value;
    const speed = parseFloat(document.getElementById('fileSpeedSlider').value);
    const segmentSize = parseInt(document.getElementById('segmentSize').value);
    
    try {
        // 获取默认保存路径
        const defaultSaveDir = await getDefaultSavePath();
        
        // 创建保存目录
        await window.electronAPI.createDirectory(defaultSaveDir);
        
        // 生成文件名（使用时间戳和原文件名）
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const originalName = selectedFile.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
        const fileName = `批量合成_${originalName}_${timestamp}.wav`;
        const saveFilePath = `${defaultSaveDir}/${fileName}`;
        
        // 分割文本
        const segments = splitText(selectedFile.content, segmentSize);
        const audioBuffers = [];
        
        // 显示进度
        showProgress();
        
        for (let i = 0; i < segments.length; i++) {
            const progressText = i === 0 ? 
                `正在合成第 ${i + 1} 段...\n首次使用可能需要加载模型，请耐心等待` : 
                `正在合成第 ${i + 1} 段...`;
            updateProgress(i + 1, segments.length, progressText);
            
            const result = await window.electronAPI.textToSpeech({
                text: segments[i],
                role: voice,
                speed,
                version: 'v2'
            });
            
            if (result.success) {
                audioBuffers.push(result.data);
            } else {
                throw new Error(`第 ${i + 1} 段合成失败: ${result.error}`);
            }
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        updateProgress(segments.length, segments.length, '正在合并音频...');
        
        // 合并音频（简单拼接）
        const mergedBuffer = mergeAudioBuffers(audioBuffers);
        await window.electronAPI.saveFile(saveFilePath, mergedBuffer);
        
        hideProgress();
        showNotification('批量合成完成！', 'success');
        
        if (confirm('批量合成完成！是否打开文件所在文件夹？')) {
            await window.electronAPI.openFolder(saveFilePath);
        }
        
    } catch (error) {
        console.error('批量合成失败:', error);
        showNotification(`批量合成失败: ${error.message}`, 'error');
        hideProgress();
    } finally {
        // 恢复批量合成按钮状态
        batchBtn.disabled = false;
        batchBtn.innerHTML = '<i class="fas fa-cogs"></i> 批量合成';
    }
}

/**
 * 分割文本
 */
function splitText(text, maxLength) {
    const segments = [];
    let currentSegment = '';
    
    const sentences = text.split(/[。！？.!?]/);
    
    for (const sentence of sentences) {
        if (sentence.trim() === '') continue;
        
        const sentenceWithPunc = sentence + (text[text.indexOf(sentence) + sentence.length] || '');
        
        if (currentSegment.length + sentenceWithPunc.length <= maxLength) {
            currentSegment += sentenceWithPunc;
        } else {
            if (currentSegment.trim()) {
                segments.push(currentSegment.trim());
            }
            currentSegment = sentenceWithPunc;
        }
    }
    
    if (currentSegment.trim()) {
        segments.push(currentSegment.trim());
    }
    
    return segments;
}

/**
 * 合并音频缓冲区
 */
function mergeAudioBuffers(buffers) {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const buffer of buffers) {
        merged.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }
    
    return merged;
}

/**
 * 选择音频文件
 */
async function selectAudioFile() {
    try {
        const result = await window.electronAPI.selectFile({
            title: '选择参考音频',
            filters: [
                { name: '音频文件', extensions: ['wav', 'mp3', 'm4a', 'flac'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            selectedAudio = {
                path: filePath,
                name: filePath.split('\\').pop(),
                size: 0 // 实际应用中可以获取文件大小
            };
            
            displayAudioInfo();
            updateCloneButtonState();
        }
    } catch (error) {
        console.error('选择音频失败:', error);
        showNotification(`选择音频失败: ${error.message}`, 'error');
    }
}

/**
 * 显示音频信息
 */
function displayAudioInfo() {
    if (!selectedAudio) return;
    
    document.getElementById('audioName').textContent = selectedAudio.name;
    document.getElementById('audioSize').textContent = formatFileSize(selectedAudio.size);
    
    document.getElementById('audioUploadArea').style.display = 'none';
    document.getElementById('audioInfo').style.display = 'flex';
}

/**
 * 清除选中的音频
 */
function clearSelectedAudio() {
    selectedAudio = null;
    document.getElementById('audioUploadArea').style.display = 'block';
    document.getElementById('audioInfo').style.display = 'none';
    updateCloneButtonState();
}

/**
 * 更新克隆按钮状态
 */
function updateCloneButtonState() {
    const cloneText = document.getElementById('cloneText').value.trim();
    const hasAudio = selectedAudio !== null;
    const hasText = cloneText.length > 0;
    
    document.getElementById('cloneBtn').disabled = !(hasAudio && hasText);
}

/**
 * 音色克隆
 */
async function cloneVoice() {
    if (!selectedAudio) {
        showNotification('请先选择参考音频', 'error');
        return;
    }
    
    const cloneText = document.getElementById('cloneText').value.trim();
    const referenceText = document.getElementById('referenceText').value.trim();
    const speed = parseFloat(document.getElementById('cloneSpeedSlider').value);
    const version = document.getElementById('cloneVersion').value;
    
    if (!cloneText) {
        showNotification('请输入要合成的文本', 'error');
        return;
    }
    
    // 禁用克隆按钮，防止重复点击
    const cloneBtn = document.getElementById('cloneBtn');
    cloneBtn.disabled = true;
    cloneBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 克隆中...';
    
    try {
        showLoading('正在克隆音色...\n首次使用可能需要加载模型，请耐心等待（约2-5分钟）');
        
        const cloneData = {
            text: cloneText,
            referenceAudio: selectedAudio.path,
            speed,
            version
        };
        
        if (referenceText) {
            cloneData.referenceText = referenceText;
        }
        
        const result = await window.electronAPI.voiceClone(cloneData);
        
        if (result.success) {
            // 获取默认保存路径
            const defaultSaveDir = await getDefaultSavePath();
            
            // 创建保存目录
            await window.electronAPI.createDirectory(defaultSaveDir);
            
            // 生成文件名（使用时间戳）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const fileName = `音色克隆_${timestamp}.wav`;
            const fullPath = `${defaultSaveDir}/${fileName}`;
            
            // 保存文件
            await window.electronAPI.saveFile(fullPath, result.data);
            showNotification('音色克隆完成！', 'success');
            
            // 询问是否打开文件夹
            if (confirm('音色克隆完成！是否打开文件所在文件夹？')) {
                await window.electronAPI.openFolder(fullPath);
            }
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('克隆失败:', error);
        showNotification(`克隆失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
        // 恢复克隆按钮状态
        cloneBtn.disabled = false;
        cloneBtn.innerHTML = '<i class="fas fa-magic"></i> 开始克隆';
    }
}

/**
 * 打开设置
 */
function openSettings() {
    // 加载当前配置到设置界面
    document.getElementById('apiUrl').value = currentConfig.apiUrl || '';
    document.getElementById('defaultSavePath').value = currentConfig.defaultSavePath || '';
    
    document.getElementById('settingsModal').classList.add('show');
}

/**
 * 关闭设置
 */
function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
    document.getElementById('connectionStatus').style.display = 'none';
}

/**
 * 保存设置
 */
async function saveSettings() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const defaultSavePath = document.getElementById('defaultSavePath').value.trim();
    
    if (!apiUrl) {
        showNotification('请输入API地址', 'error');
        return;
    }
    
    try {
        const config = { 
            apiUrl,
            defaultSavePath: defaultSavePath || ''
        };
        const result = await window.electronAPI.saveConfig(config);
        
        if (result) {
            currentConfig = config;
            showNotification('设置保存成功', 'success');
            closeSettings();
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('保存设置失败', 'error');
    }
}

/**
 * 测试连接
 */
async function testConnection() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const statusEl = document.getElementById('connectionStatus');
    
    if (!apiUrl) {
        showNotification('请输入API地址', 'error');
        return;
    }
    
    try {
        const result = await window.electronAPI.testApiConnection(apiUrl);
        
        if (result.success) {
            statusEl.className = 'connection-status success';
            statusEl.textContent = '✓ 连接成功';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        statusEl.className = 'connection-status error';
        statusEl.textContent = `✗ 连接失败: ${error.message}`;
    }
}

/**
 * 显示进度
 */
function showProgress() {
    document.getElementById('progressContainer').style.display = 'block';
}

/**
 * 隐藏进度
 */
function hideProgress() {
    document.getElementById('progressContainer').style.display = 'none';
}

/**
 * 更新进度
 */
function updateProgress(current, total, text) {
    const percent = Math.round((current / total) * 100);
    document.getElementById('progressText').textContent = text;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressFill').style.width = `${percent}%`;
}

/**
 * 显示加载状态
 */
function showLoading(text = '处理中...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('show');
    isProcessing = true;
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
    isProcessing = false;
}

/**
 * 显示通知
 */
function showNotification(message, type = 'info') {
    // 简单的alert实现，实际应用中可以使用更美观的通知组件
    if (type === 'error') {
        alert(`错误: ${message}`);
    } else if (type === 'success') {
        alert(`成功: ${message}`);
    } else if (type === 'warning') {
        alert(`警告: ${message}`);
    } else {
        alert(message);
    }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 选择默认保存路径
 */
async function selectDefaultSavePath() {
    try {
        const result = await window.electronAPI.selectDirectory();
        if (result && !result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            document.getElementById('defaultSavePath').value = selectedPath;
        }
    } catch (error) {
        console.error('选择保存路径失败:', error);
        showNotification('选择保存路径失败', 'error');
    }
}

/**
 * 清除默认保存路径
 */
function clearDefaultSavePath() {
    document.getElementById('defaultSavePath').value = '';
}

/**
 * 获取默认保存路径
 */
async function getDefaultSavePath() {
    if (currentConfig.defaultSavePath && currentConfig.defaultSavePath.trim()) {
        return currentConfig.defaultSavePath;
    }
    // 如果未设置默认保存位置，则使用软件所在目录的data/txt_to_audio
    const appPath = await window.electronAPI.getAppPath();
    return `${appPath}/data/txt_to_audio`;
}

/**
 * 获取临时文件路径
 */
async function getTempPath() {
    const appPath = await window.electronAPI.getAppPath();
    return `${appPath}/tmp`;
}