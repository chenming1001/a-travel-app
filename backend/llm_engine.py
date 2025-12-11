import os
import json
from http import HTTPStatus
import dashscope
from dotenv import load_dotenv
from tools.amap_tool import search_poi, search_nearby
from rag_engine import search_knowledge

load_dotenv()

dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

# Define available tools for the LLM
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_poi",
            "description": "Search for a specific place, attraction, or location by name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keywords": {"type": "string", "description": "The name of the place to search for (e.g., 'Forbidden City', 'West Lake')."},
                    "city": {"type": "string", "description": "The city name (optional, e.g., 'Beijing')."}
                },
                "required": ["keywords"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_nearby",
            "description": "Search for facilities (like hotels, parking, restaurants) near a specific coordinate location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "The center coordinate in 'lng,lat' format (e.g., '116.397428,39.90923')."},
                    "keywords": {"type": "string", "description": "The type of facility to search for (e.g., 'parking', 'hotel', 'toilet')."},
                    "radius": {"type": "integer", "description": "Search radius in meters (default 1000)."}
                },
                "required": ["location", "keywords"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search for exclusive travel tips, hidden gems, money-saving tricks, or avoiding tourist traps. Use this when the user asks for advice, guides, or 'secret' spots.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The semantic search query (e.g., 'Beijing scams', 'Hangzhou hidden spots')."}
                },
                "required": ["query"]
            }
        }
    }
]

def _get_tool_call_info(tool_call):
    """Helper to safely extract function name and args from tool_call, whether it's dict or object"""
    if isinstance(tool_call, dict):
        func = tool_call.get('function', {})
        return func.get('name'), func.get('arguments'), tool_call.get('id')
    else:
        # Assume it's an object
        return tool_call.function.name, tool_call.function.arguments, tool_call.id
async def generate_full_plan(origin, destination, days, people, preferences="无特殊偏好", budget="适中", transport="公共交通", pace="适中", who_with="朋友", tags=[], api_config={}):
    """
    生成全面的旅行计划文档。
    """
    # 配置 DashScope Key
    dashscope.api_key = "sk-6c96e1a36e9a4f00ad691535210d7e0e"

    # 获取 RAG 上下文来增强计划
    rag_context = ""
    try:
        print(f"为 {destination} 搜索知识库...")
        rag_docs = search_knowledge(f"{destination} 旅游 攻略 避坑")
        if rag_docs:
            print(f"找到 {len(rag_docs)} 条相关知识")
            rag_context = "\n\n**参考的独家知识库信息**:\n" + "\n".join([f"- {doc[:200]}..." for doc in rag_docs])
        else:
            print(f"未找到 {destination} 的相关知识")
    except Exception as e:
        print(f"RAG 搜索失败（非致命错误）: {e}")
        # 不抛出异常，继续执行
    
    tags_str = ", ".join(tags) if tags else "无"

    system_prompt = f"""
    你是一位金牌旅游规划师。请根据以下详细信息，为用户生成一份高度定制化、专业的旅游攻略文档。
    
    **基本信息**:
    - 出发地: {origin}
    - 目的地: {destination}
    - 时间: {days}天
    - 人数: {people}人 ({who_with}出行)
    
    **偏好设置**:
    - 预算水平: {budget}
    - 出行方式: {transport}
    - 游玩节奏: {pace}
    - 兴趣标签: {tags_str}
    - 其他要求: {preferences}
    
    {rag_context if rag_context else "**本地知识库**: 暂无相关信息，请基于您的专业知识生成计划。"}

    **输出要求**:
    1. **格式**: 使用标准 Markdown 格式。
    2. **结构**:
       - **标题**: {destination} {days}日{pace}游攻略 ({who_with}版)
       - **行程亮点**: 根据兴趣标签 ({tags_str}) 提炼的必体验项目。
       - **行前准备**: 针对{who_with}出行的特别准备。
       - **每日行程**: 按 Day 1... 结构。
         - 必须严格遵守【{pace}】的节奏。
         - 餐饮推荐需符合【{budget}】预算定位。
         - 交通方案需匹配【{transport}】。
         - 请使用 Markdown 表格展示每日的时间安排。
       - **交通指南**: 重点介绍{transport}方案。
       - **预算预估**: 根据{budget}标准给出明细。
       - **避坑指南/温馨提示** (请参考独家知识库信息)。
    3. **风格**: 实用、贴心、图文并茂（用emoji代替图片）。
    4. **内容**: 必须具体到景点名称。

    请直接输出 Markdown 内容。
    """

    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': '请开始生成攻略。'}
    ]

    try:
        response = dashscope.Generation.call(
            model='qwen-max',
            messages=messages,
            result_format='message',
        )
        if response.status_code == HTTPStatus.OK:
            return response.output.choices[0].message.content
        else:
            print(f"LLM 调用失败: {response.code} - {response.message}")
            # 返回一个基础版本
            return f"""# {destination} {days}日游攻略

##  基本信息
- **目的地**: {destination}
- **天数**: {days}天
- **人数**: {people}人
- **预算**: {budget}级
- **兴趣**: {tags_str}

##  行程建议
{rag_context if rag_context else '基于AI生成的个性化行程'}

##  预算估算
基于{budget}预算水平：
- 住宿: ¥{300 * days * people}
- 交通: ¥{150 * days * people}
- 餐饮: ¥{200 * days * people}
- 门票: ¥{100 * days * people}
- **总计**: ¥{750 * days * people}

 提示：在系统设置中配置您的 DashScope API Key 以获得 AI 生成的详细行程。"""
    except Exception as e:
        print(f"生成计划异常: {str(e)}")
        return f"生成旅行计划时出错: {str(e)}"

async def call_qwen_with_tools(messages, api_config={}):
    """
    Call Qwen model with tool support.
    """
    # Configure DashScope Key if provided
    if api_config and api_config.get("dashscope_key"):
        dashscope.api_key = api_config["dashscope_key"]
    else:
        dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")
    
    amap_key = api_config.get("amap_key") if api_config else os.getenv("AMAP_API_KEY")
    
    if not dashscope.api_key:
        return " 未检测到 DashScope API Key。\n\n要使用完整的AI对话功能，请前往系统设置配置您的API Key。\n\n目前您可以：\n✅ 查看预设旅行建议\n✅ 使用手动规划功能\n✅ 进行预算计算"
    
    print(f"调用 LLM，消息数: {len(messages)}")
    
    try:
        # 构建系统消息增强
        enhanced_messages = []
        
        # 添加增强的系统提示
        enhanced_system = """你是WanderAI，一个专业的旅行规划助手。你可以使用以下工具获取实时信息：

可用工具：
1. search_poi - 搜索地点（如：故宫、西湖、外滩）
2. search_nearby - 搜索周边设施（如：附近的酒店、停车场、餐厅）
3. search_knowledge_base - 获取旅行技巧（如：避坑指南、省钱技巧、隐藏景点）

使用指南：
- 当用户询问具体地点时，使用 search_poi
- 当用户需要周边服务时，使用 search_nearby  
- 当用户询问建议技巧时，使用 search_knowledge_base
- 主动询问细节以提供更好建议

回复风格：
- 热情、专业、贴心
- 使用emoji增强表达
- 提供具体、可行的建议
- 根据上下文保持对话连贯性"""
        
        # 查找现有系统消息
        has_system_msg = False
        for msg in messages:
            if msg.get("role") == "system":
                # 合并系统消息
                enhanced_messages.append({
                    "role": "system",
                    "content": enhanced_system + "\n\n" + msg.get("content", "")
                })
                has_system_msg = True
            else:
                enhanced_messages.append(msg)
        
        if not has_system_msg:
            enhanced_messages.insert(0, {
                "role": "system",
                "content": enhanced_system
            })
        
        response = dashscope.Generation.call(
            model='qwen-turbo',  # 使用 turbo 模型降低成本
            messages=enhanced_messages,
            tools=TOOLS_SCHEMA,
            result_format='message',
        )
        
        if response.status_code != HTTPStatus.OK:
            print(f"LLM 调用失败: {response.code} - {response.message}")
            raise Exception(f"AI服务错误: {response.message}")
        
        output = response.output.choices[0].message
        
        # 安全地检查 tool_calls
        content = ""
        tool_calls = []
        
        try:
            # 方法1：尝试转换为字典
            if hasattr(output, '__dict__'):
                output_dict = output.__dict__
            elif hasattr(output, 'to_dict'):
                output_dict = output.to_dict()
            else:
                output_dict = dict(output) if hasattr(output, '__iter__') else {}
            
            # 检查字典中是否有 tool_calls
            if 'tool_calls' in output_dict:
                tool_calls = output_dict.get('tool_calls', [])
                content = output_dict.get('content', '')
            else:
                # 如果没有 tool_calls 键，尝试其他方式
                content = getattr(output, 'content', '') if hasattr(output, 'content') else ''
                
        except Exception as dict_error:
            print(f"转换输出为字典失败: {dict_error}")
            # 尝试直接获取
            try:
                content = output.content
            except:
                content = ""
        
        if tool_calls and len(tool_calls) > 0:
            print(f"检测到工具调用: {len(tool_calls)} 个")
            
            # 添加助手消息到历史
            tool_calls_for_history = []
            for i, tc in enumerate(tool_calls):
                if isinstance(tc, dict):
                    tool_calls_for_history.append({
                        "id": tc.get('id', f"call_{i}"),
                        "type": "function",
                        "function": {
                            "name": tc.get('function', {}).get('name', ''),
                            "arguments": tc.get('function', {}).get('arguments', '')
                        }
                    })
                else:
                    # 如果是对象
                    tool_calls_for_history.append({
                        "id": getattr(tc, 'id', f"call_{i}"),
                        "type": "function",
                        "function": {
                            "name": getattr(tc.function, 'name', ''),
                            "arguments": getattr(tc.function, 'arguments', '')
                        }
                    })
            
            enhanced_messages.append({
                "role": "assistant",
                "content": content or "正在为您查询信息...",
                "tool_calls": tool_calls_for_history
            })
            
            # 执行工具调用
            tool_results = []
            for i, tool_call in enumerate(tool_calls):
                func_name, func_args_str, tool_id = _get_tool_call_info(tool_call)
                
                try:
                    function_args = json.loads(func_args_str) if func_args_str else {}
                except json.JSONDecodeError as e:
                    print(f"解析参数失败: {e}")
                    function_args = {}
                
                print(f"执行工具: {func_name}，参数: {function_args}")
                
                tool_result = {"error": "工具执行失败"}
                
                try:
                    if func_name == 'search_poi':
                        if amap_key:
                            function_args['api_key'] = amap_key
                            result = await search_poi(**function_args)
                            if result and not result.get('error'):
                                tool_result = {
                                    "success": True,
                                    "count": len(result.get('pois', [])),
                                    "pois": result.get('pois', [])[:3],  # 只返回前3个
                                    "summary": f"找到{len(result.get('pois', []))}个相关地点"
                                }
                            else:
                                tool_result = {"error": result.get('error', '搜索失败')}
                        else:
                            tool_result = {"error": "未配置高德地图 API Key"}
                    
                    elif func_name == 'search_nearby':
                        if amap_key:
                            function_args['api_key'] = amap_key
                            result = await search_nearby(**function_args)
                            if result and not result.get('error'):
                                tool_result = {
                                    "success": True,
                                    "count": len(result.get('pois', [])),
                                    "pois": result.get('pois', [])[:5],  # 只返回前5个
                                    "summary": f"找到{len(result.get('pois', []))}个附近设施"
                                }
                            else:
                                tool_result = {"error": result.get('error', '搜索失败')}
                        else:
                            tool_result = {"error": "未配置高德地图 API Key"}
                    
                    elif func_name == 'search_knowledge_base':
                        result = search_knowledge(**function_args)
                        if result:
                            tool_result = {
                                "success": True,
                                "documents": result[:3],  # 只返回前3个文档
                                "summary": f"找到{len(result)}条相关建议"
                            }
                        else:
                            tool_result = {"error": "知识库中未找到相关信息"}
                    
                except Exception as e:
                    print(f"工具执行错误: {e}")
                    tool_result = {"error": f"工具执行异常: {str(e)}"}
                
                tool_results.append(tool_result)
                
                # 添加工具结果到历史
                enhanced_messages.append({
                    "role": "tool",
                    "content": json.dumps(tool_result, ensure_ascii=False),
                    "tool_call_id": tool_id or f"call_{i}"
                })
            
            # 第二次调用 LLM 总结结果
            print("第二次调用 LLM 总结工具结果")
            final_response = dashscope.Generation.call(
                model='qwen-turbo',
                messages=enhanced_messages,
                result_format='message'
            )
            
            if final_response.status_code == HTTPStatus.OK:
                reply = final_response.output.choices[0].message.content
                # 标记包含工具调用
                return reply
            else:
                # 如果总结失败，返回原始结果
                summary = "已为您查询到以下信息：\n\n"
                for i, result in enumerate(tool_results):
                    if result.get('success'):
                        if 'summary' in result:
                            summary += f"{i+1}. {result['summary']}\n"
                        if 'pois' in result:
                            for poi in result['pois'][:2]:
                                summary += f"   • {poi.get('name', '未知')}"
                                if poi.get('address'):
                                    summary += f" - {poi.get('address')}"
                                summary += "\n"
                return summary
        
        else:
            # 没有工具调用，直接返回内容
            return content if content else "我可以帮您规划旅行、推荐景点、估算预算。请告诉我您的具体需求！"
            
    except Exception as e:
        print(f"LLM 调用异常: {str(e)}")
        import traceback
        traceback.print_exc()
        # 返回更友好的错误信息
        return f" 抱歉，AI服务暂时遇到问题。\n\n错误信息: {str(e)[:100]}\n\n 您可以：\n1. 检查API Key配置\n2. 稍后再试\n3. 使用手动规划功能"
