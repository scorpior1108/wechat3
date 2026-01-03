const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 联系人配置
const contactConfigs = {
    girl: {
        name: '小雨',
        characterFile: 'char01.txt',
        apiKey: process.env.AI_API_KEY_GIRL || process.env.AI_API_KEY || 'sk-481eb6044ea0411f85843d1ac7ade922',
        model: 'deepseek-reasoner',
        maxTokens: 2000,
        temperature: 0.8
    },
    boy: {
        name: '陈阳',
        characterFile: 'char.txt',
        apiKey: process.env.AI_API_KEY_BOY || process.env.AI_API_KEY || 'sk-481eb6044ea0411f85843d1ac7ade922',
        model: 'deepseek-reasoner',
        maxTokens: 2000,
        temperature: 0.8
    }
};

// 读取角色设定
const loadCharacterConfig = (contactId) => {
    const config = contactConfigs[contactId];
    if (!config) {
        throw new Error(`未找到联系人配置: ${contactId}`);
    }
    
    const charConfigPath = path.join(__dirname, '../../', config.characterFile);
    
    try {
        const charContent = fs.readFileSync(charConfigPath, 'utf8');
        return {
            ...config,
            characterContent: charContent
        };
    } catch (error) {
        console.error(`读取角色设定文件失败: ${charConfigPath}`, error);
        throw new Error(`无法读取角色设定文件: ${config.characterFile}`);
    }
};

// 构建系统提示词
const buildSystemPrompt = (characterContent, contactName) => {
    return `你是${contactName}，请严格按照以下角色设定进行对话：

${characterContent}

请记住：
1. 保持符合角色设定的对话风格
2. 回复要自然、流畅
3. 保持微信聊天风格，回复不要过长
4. 不要直接复制人设档案内容

现在开始，你就是${contactName}，用符合上述设定的方式与我进行微信风格的对话。`;
};

// 获取AI回复
const getAIResponse = async (message, contactId, conversationHistory = []) => {
    try {
        // 加载联系人配置
        const contactConfig = loadCharacterConfig(contactId);
        
        // 检查是否是重置对话命令
        if (message === '[RESET_CONVERSATION]') {
            // 重置对话时，只发送系统提示词，不包含任何历史记录
            const messages = [
                { role: 'system', content: buildSystemPrompt(contactConfig.characterContent, contactConfig.name) },
                { role: 'user', content: '请重新开始我们的对话，用你的角色设定向我打个招呼。' }
            ];
            
            const response = await axios.post(
                'https://api.deepseek.com/chat/completions',
                {
                    model: contactConfig.model,
                    messages: messages,
                    max_tokens: contactConfig.maxTokens,
                    temperature: contactConfig.temperature,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${contactConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const reply = response.data.choices[0]?.message?.content || '你好，我们重新开始吧？';
            return reply;
        }
        
        // 构建消息历史
        const messages = [
            { role: 'system', content: buildSystemPrompt(contactConfig.characterContent, contactConfig.name) }
        ];

        // 添加对话历史（最近5轮对话）
        const recentHistory = conversationHistory.slice(-10);
        recentHistory.forEach(item => {
            messages.push({ role: item.role, content: item.content });
        });

        // 添加当前用户消息
        messages.push({ role: 'user', content: message });

        // 调用DeepSeek API
        const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
                model: contactConfig.model,
                messages: messages,
                max_tokens: contactConfig.maxTokens,
                temperature: contactConfig.temperature,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${contactConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const reply = response.data.choices[0]?.message?.content || '抱歉，我现在有点忙，晚点回复你。';
        
        // 确保回复符合角色设定（短句、简洁）
        if (reply.length > 100) {
            return reply.substring(0, 100) + '...';
        }
        
        return reply;
    } catch (error) {
        console.error('AI服务错误:', error);
        
        // 根据错误类型返回不同的回复
        if (error.response?.status === 429) {
            return '消息发得太快了，等一下再发吧。';
        } else if (error.code === 'ECONNABORTED') {
            return '网络有点问题，再发一次试试？';
        } else if (error.response?.status === 401) {
            return 'API密钥有问题，请联系管理员。';
        } else {
            return '现在有点忙，晚点聊。';
        }
    }
};

module.exports = {
    getAIResponse
};