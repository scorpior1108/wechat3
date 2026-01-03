const express = require('express');
const cors = require('cors');
const path = require('path');
const aiService = require('./services/aiService');

const app = express();
const PORT = 4444;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI聊天接口
app.post('/api/chat', async (req, res) => {
  try {
    const { message, contactId, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    if (!contactId) {
      return res.status(400).json({ error: '联系人ID不能为空' });
    }

    const response = await aiService.getAIResponse(message, contactId, conversationHistory);
    res.json({ reply: response });
  } catch (error) {
    console.error('聊天接口错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`微信聊天应用运行在 http://localhost:${PORT}`);
});