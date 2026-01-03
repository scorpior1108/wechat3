// DOM元素
const wechatContainer = document.querySelector('.wechat-container');
const chatContainer = document.getElementById('chatContainer');
const contactList = document.getElementById('contactList');
const chatContent = document.getElementById('chatContent');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const resetButton = document.getElementById('resetButton');
const backButton = document.getElementById('backButton');
const confirmDialog = document.getElementById('confirmDialog');
const cancelButton = document.getElementById('cancelButton');
const confirmButton = document.getElementById('confirmButton');
const chatName = document.getElementById('chatName');

// 联系人配置
const contacts = {
    girl: {
        id: 'girl',
        name: '小雨',
        avatar: 'images/girl.png',
        characterFile: 'char01.txt',
        initialMessage: '嗨~ 今天天气真好呢！你今天过得怎么样呀？'
    },
    boy: {
        id: 'boy',
        name: '陈阳',
        avatar: 'images/boy.png',
        characterFile: 'char.txt',
        initialMessage: '早上好。今天有点凉，出门记得多穿件衣服。'
    }
};

// 当前状态
let currentContact = null;
let conversationHistory = {};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从本地存储加载聊天历史
    loadChatHistory();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 显示联系人列表
    showContactList();
});

// 绑定事件监听器
function bindEventListeners() {
    // 联系人点击事件
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = item.dataset.contactId;
            const contactName = item.dataset.contactName;
            openChat(contactId);
        });
    });
    
    // 返回按钮事件
    backButton.addEventListener('click', showContactList);
    
    // 发送消息事件
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 重置按钮事件
    resetButton.addEventListener('click', showResetDialog);
    cancelButton.addEventListener('click', hideResetDialog);
    confirmButton.addEventListener('click', resetChat);
}

// 显示联系人列表
function showContactList() {
    wechatContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
    currentContact = null;
}

// 打开聊天页面
function openChat(contactId) {
    currentContact = contacts[contactId];
    
    if (!currentContact) {
        console.error(`未找到联系人配置: ${contactId}`);
        alert('联系人配置错误，请刷新页面重试');
        return;
    }
    
    // 更新聊天头部信息
    chatName.textContent = currentContact.name;
    
    // 切换页面显示
    wechatContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    
    // 加载聊天历史
    loadChatMessages();
    
    // 如果没有聊天记录，显示初始消息
    if (!conversationHistory[contactId] || conversationHistory[contactId].length === 0) {
        addAIMessage(currentContact.initialMessage);
        saveChatMessage(contactId, 'assistant', currentContact.initialMessage);
    }
    
    // 聚焦输入框
    messageInput.focus();
}

// 加载聊天消息
function loadChatMessages() {
    if (!currentContact) return;
    
    const history = conversationHistory[currentContact.id] || [];
    chatContent.innerHTML = '';
    
    history.forEach(item => {
        if (item.role === 'user') {
            addUserMessage(item.content);
        } else if (item.role === 'assistant') {
            addAIMessage(item.content);
        }
    });
    
    scrollToBottom();
}

// 发送消息
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !currentContact) {
        return;
    }
    
    // 清空输入框
    messageInput.value = '';
    
    // 添加用户消息到界面
    addUserMessage(message);
    
    // 保存到历史记录
    saveChatMessage(currentContact.id, 'user', message);
    
    // 显示输入状态提示
    showTypingIndicator();
    
    // 禁用发送按钮
    sendButton.disabled = true;
    
    try {
        // 发送消息到后端API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                contactId: currentContact.id,
                conversationHistory: conversationHistory[currentContact.id] || []
            })
        });
        
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        
        const data = await response.json();
        
        // 隐藏输入状态提示
        hideTypingIndicator();
        
        // 添加AI回复
        addAIMessage(data.reply);
        
        // 保存AI回复到历史记录
        saveChatMessage(currentContact.id, 'assistant', data.reply);
        
    } catch (error) {
        console.error('发送消息错误:', error);
        
        // 隐藏输入状态提示
        hideTypingIndicator();
        
        // 显示错误消息
        addAIMessage('网络有点问题，再发一次试试？');
        
    } finally {
        // 重新启用发送按钮
        sendButton.disabled = false;
        
        // 滚动到底部
        scrollToBottom();
    }
}

// 添加用户消息到界面
function addUserMessage(message) {
    const messageElement = createMessageElement('user', message);
    chatContent.appendChild(messageElement);
    scrollToBottom();
}

// 添加AI消息到界面
function addAIMessage(message) {
    const messageElement = createMessageElement('ai', message);
    chatContent.appendChild(messageElement);
    scrollToBottom();
}

// 创建消息元素
function createMessageElement(type, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // 创建头像
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    const img = document.createElement('img');
    img.src = type === 'ai' ? currentContact.avatar : 'images/user.png';
    img.alt = type === 'ai' ? currentContact.name : '我';
    
    avatarDiv.appendChild(img);
    
    // 创建消息内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = message;
    
    // 创建时间
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = getCurrentTime();
    
    contentDiv.appendChild(bubbleDiv);
    contentDiv.appendChild(timeDiv);
    
    // 组装消息
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    return messageDiv;
}

// 显示输入状态提示
function showTypingIndicator() {
    typingIndicator.classList.add('active');
    scrollToBottom();
}

// 隐藏输入状态提示
function hideTypingIndicator() {
    typingIndicator.classList.remove('active');
}

// 滚动到底部
function scrollToBottom() {
    setTimeout(() => {
        chatContent.scrollTop = chatContent.scrollHeight;
    }, 100);
}

// 获取当前时间
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 保存聊天消息
function saveChatMessage(contactId, role, content) {
    if (!conversationHistory[contactId]) {
        conversationHistory[contactId] = [];
    }
    
    conversationHistory[contactId].push({
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    });
    
    saveChatHistory();
}

// 保存聊天历史到本地存储
function saveChatHistory() {
    try {
        localStorage.setItem('wechatChatHistory', JSON.stringify(conversationHistory));
    } catch (error) {
        console.error('保存聊天历史失败:', error);
    }
}

// 从本地存储加载聊天历史
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('wechatChatHistory');
        if (saved) {
            conversationHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.error('加载聊天历史失败:', error);
        conversationHistory = {};
    }
}

// 显示重置对话框
function showResetDialog() {
    confirmDialog.classList.add('active');
}

// 隐藏重置对话框
function hideResetDialog() {
    confirmDialog.classList.remove('active');
}

// 重置聊天对话
async function resetChat() {
    if (!currentContact) return;
    
    // 隐藏对话框
    hideResetDialog();
    
    // 清空当前联系人的聊天历史
    conversationHistory[currentContact.id] = [];
    saveChatHistory();
    
    // 清空聊天界面
    chatContent.innerHTML = '';
    
    // 向AI API发送重置命令
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: '[RESET_CONVERSATION]',
                contactId: currentContact.id,
                conversationHistory: []
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            // 使用AI的回复作为新的初始消息
            addAIMessage(data.reply);
            saveChatMessage(currentContact.id, 'assistant', data.reply);
        } else {
            // 如果API调用失败，使用默认初始消息
            addAIMessage(currentContact.initialMessage);
            saveChatMessage(currentContact.id, 'assistant', currentContact.initialMessage);
        }
    } catch (error) {
        console.error('重置对话API调用失败:', error);
        // 如果API调用失败，使用默认初始消息
        addAIMessage(currentContact.initialMessage);
        saveChatMessage(currentContact.id, 'assistant', currentContact.initialMessage);
    }
    
    // 聚焦输入框
    messageInput.focus();
}

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
    // Esc 键关闭对话框或返回联系人列表
    if (e.key === 'Escape') {
        if (confirmDialog.classList.contains('active')) {
            hideResetDialog();
        } else if (currentContact) {
            showContactList();
        } else {
            messageInput.value = '';
            messageInput.focus();
        }
    }
    
    // 在对话框中按Enter确认
    if (e.key === 'Enter' && confirmDialog.classList.contains('active')) {
        resetChat();
    }
});