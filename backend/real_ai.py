from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import requests
import json
from datetime import datetime

app = FastAPI(title="WanderAI API 服务")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    api_config: Optional[Dict[str, Any]] = {}

class Message(BaseModel):
    role: str
    content: str

# 对话历史存储（内存）
conversation_history = {}

def call_dashscope_api(message: str, api_key: str, history: List[Message] = None) -> str:
    """调用阿里云DashScope API"""
    try:
        print(f"正在调用DashScope API，消息长度: {len(message)}")
        
        # 构建请求数据
        messages = []
        
        # 系统提示词
        system_prompt = """你是一个专业的旅行规划助手WanderAI。你的特点是：
1. 热情、专业、乐于助人
2. 提供详细、实用的旅行建议
3. 会询问具体需求来给出个性化建议
4. 使用emoji让回复更生动
5. 可以推荐景点、美食、住宿、路线规划
6. 可以估算预算和提供避坑指南

请用中文回答，保持自然对话风格。"""
        
        messages.append({"role": "system", "content": system_prompt})
        
        # 添加历史对话
        if history:
            for msg in history[-10:]:  # 最多保留10条历史
                messages.append({"role": msg.role, "content": msg.content})
        
        # 添加当前消息
        messages.append({"role": "user", "content": message})
        
        # API请求数据
        data = {
            "model": "qwen-turbo",
            "input": {
                "messages": messages
            },
            "parameters": {
                "temperature": 0.8,  # 创造性适中
                "top_p": 0.8,
                "max_tokens": 2000
            }
        }
        
        print(f"请求数据: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}...")
        
        # 发送请求
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        response = requests.post(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
            headers=headers,
            json=data,
            timeout=30
        )
        
        print(f"API响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"API响应: {json.dumps(result, ensure_ascii=False, indent=2)[:500]}...")
            
            # 提取回复内容
            if "output" in result and "choices" in result["output"]:
                reply = result["output"]["choices"][0]["message"]["content"]
                print(f"成功获取回复，长度: {len(reply)}")
                return reply
            else:
                print(f"API返回格式异常: {result}")
                return "抱歉，AI服务返回了异常格式的响应。"
        
        elif response.status_code == 401:
            print("API Key无效")
            return "⚠️ **API Key无效或已过期**\n\n请检查您的DashScope API Key是否正确，并确保有足够的余额。"
        
        elif response.status_code == 429:
            print("API调用频率超限")
            return "⚠️ **API调用频率超限**\n\n请稍后再试，或检查您的API使用配额。"
        
        else:
            print(f"API调用失败: {response.status_code}, {response.text}")
            return f"⚠️ **API服务异常** (状态码: {response.status_code})\n\n错误信息: {response.text[:200]}"
            
    except requests.exceptions.Timeout:
        print("API调用超时")
        return "⏰ **请求超时**\n\nAI服务响应较慢，请稍后再试。"
        
    except Exception as e:
        print(f"API调用异常: {str(e)}")
        return f"❌ **服务异常**\n\n错误详情: {str(e)[:100]}"

def get_fallback_response(message: str) -> str:
    """备用回复（当API调用失败时）"""
    message_lower = message.lower()
    
    if "北京" in message:
        return "🏛️ **北京旅行建议**\n\n很抱歉，AI服务暂时不可用。关于北京旅行的一般建议：建议游玩3-4天，必去景点包括故宫、长城、颐和园，预算约3000-5000元。"
    
    elif "上海" in message:
        return "🌃 **上海旅行建议**\n\n很抱歉，AI服务暂时不可用。关于上海旅行的一般建议：建议游玩2-3天，必去景点包括外滩、迪士尼、豫园，预算约2500-4000元。"
    
    else:
        return f"""🤖 **备用回复**

很抱歉，AI服务暂时无法使用。您的问题是："{message}"

**请检查**：
1. API Key是否正确配置
2. 网络连接是否正常
3. 账户是否有足够余额

或者您可以：
• 稍后再试
• 在系统设置中重新配置API Key
• 使用快速规划功能生成行程

我会继续努力为您服务！"""

@app.get("/")
async def root():
    return {
        "message": "WanderAI AI 对话服务",
        "status": "running",
        "endpoints": {
            "chat": "POST /api/chat",
            "health": "GET /api/health"
        }
    }

@app.post("/api/chat")
async def chat_with_ai(request_data: ChatRequest):
    """AI对话接口 - 调用真实大模型"""
    print(f"\n=== 收到聊天请求 ===")
    print(f"消息: {request_data.message}")
    print(f"Session ID: {request_data.session_id}")
    print(f"API Config: {request_data.api_config}")
    
    try:
        # 获取API Key
        api_config = request_data.api_config or {}
        dashscope_key = api_config.get("dashscope_key", "")
        
        # 检查API Key
        if not dashscope_key:
            print("⚠️ 没有提供DashScope API Key")
            raise HTTPException(status_code=400, detail="请配置DashScope API Key")
        
        # 获取对话历史
        session_id = request_data.session_id
        if session_id not in conversation_history:
            conversation_history[session_id] = []
        
        history = conversation_history[session_id]
        
        # 调用大模型API
        ai_reply = call_dashscope_api(
            message=request_data.message,
            api_key=dashscope_key,
            history=history
        )
        
        # 保存到历史
        history.append(Message(role="user", content=request_data.message))
        history.append(Message(role="assistant", content=ai_reply))
        
        # 限制历史长度（最多20条消息）
        if len(history) > 20:
            conversation_history[session_id] = history[-20:]
        
        print(f"AI回复长度: {len(ai_reply)}")
        
        return {
            "reply": ai_reply,
            "session_id": session_id,
            "model": "qwen-turbo",
            "has_tools": False,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"聊天接口异常: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # 返回备用回复
        fallback_reply = get_fallback_response(request_data.message)
        
        return {
            "reply": fallback_reply,
            "session_id": request_data.session_id,
            "model": "fallback",
            "has_tools": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Chat Service",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print(" WanderAI AI 对话服务启动")
    print("=" * 50)
    print("服务地址: http://127.0.0.1:8000")
    print("对话端点: POST http://127.0.0.1:8000/api/chat")
    print(" 需要: DashScope API Key")
    print("=" * 50)

    uvicorn.run(
        "real_ai:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
