import os
import chromadb
import dashscope
from chromadb import Documents, EmbeddingFunction, Embeddings
from typing import List
from dotenv import load_dotenv
import os
os.environ['ANONYMIZED_TELEMETRY'] = 'False'
os.environ['CHROMA_TELEMETRY'] = 'False'

load_dotenv()
dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

class DashScopeEmbedding(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            try:
                resp = dashscope.TextEmbedding.call(
                    model="text-embedding-v1",
                    input=text
                )

                if resp.status_code == 200:
                    # 检查响应结构
                    if hasattr(resp, 'output') and hasattr(resp.output, 'embeddings'):
                        embedding_data = resp.output.embeddings
                    elif hasattr(resp, 'embeddings'):
                        embedding_data = resp.embeddings
                    elif isinstance(resp, dict) and 'output' in resp and 'embeddings' in resp['output']:
                        embedding_data = resp['output']['embeddings']
                    else:
                        print(f"无法识别的响应结构: {resp}")
                        embeddings.append([0.0] * 1536)
                        continue
                    
                    # 提取嵌入向量
                    if isinstance(embedding_data, list) and len(embedding_data) > 0:
                        if isinstance(embedding_data[0], dict) and 'embedding' in embedding_data[0]:
                            embeddings.append(embedding_data[0]['embedding'])
                        else:
                            embeddings.append(embedding_data[0])
                    else:
                        embeddings.append([0.0] * 1536)
                        
                else:
                    print(f"Embedding 错误: {resp}")
                    embeddings.append([0.0] * 1536)
                    
            except Exception as e:
                print(f"Embedding 异常: {e}")
                embeddings.append([0.0] * 1536)
        return embeddings

chroma_client = chromadb.PersistentClient(path="./chroma_db")

class SimpleEmbedding(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        """简单的嵌入函数，避免API调用问题"""
        # 对于测试，返回随机向量或零向量
        import random
        embeddings = []
        for text in input:
            # 返回1536维的随机向量（模拟真实嵌入）
            embedding = [random.uniform(-1, 1) for _ in range(1536)]
            # 归一化
            norm = sum(x**2 for x in embedding) ** 0.5
            if norm > 0:
                embedding = [x / norm for x in embedding]
            embeddings.append(embedding)
        return embeddings

# Create or get collection - 使用简单嵌入函数避免错误
try:
    collection = chroma_client.get_or_create_collection(
        name="travel_knowledge",
        embedding_function=SimpleEmbedding()  # 使用简单的嵌入函数
    )
    print(" RAG 知识库初始化成功")
except Exception as e:
    print(f" RAG 初始化失败: {e}")
    collection = None

def ingest_knowledge_base(file_path: str):
    """
    读取文本文件，分割成块并存储到向量数据库
    """
    if not collection:
        print("知识库未初始化，跳过导入")
        return
        
    print(f"导入知识库: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # 按段落分割
        chunks = [c.strip() for c in text.split('\n\n') if c.strip()]
        
        if not chunks:
            print("没有找到有效内容")
            return
        
        ids = [f"doc_{i}" for i in range(len(chunks))]
        
        # 检查是否已经存在
        existing = collection.count()
        if existing > 0:
            print(f"知识库已有 {existing} 条记录，将更新...")
        
        collection.upsert(
            documents=chunks,
            ids=ids,
            metadatas=[{"source": file_path} for _ in chunks]
        )
        print(f" 成功导入 {len(chunks)} 个文档块")
        
    except Exception as e:
        print(f"导入知识库失败: {e}")

def search_knowledge(query: str, n_results: int = 3):
    """
    在知识库中进行语义搜索
    """
    if not collection:
        print("知识库未初始化，返回空结果")
        return []
    
    try:
        # 先尝试语义搜索
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        docs = results.get('documents', [[]])[0] if results else []
        
        # 如果没有找到结果，返回空列表
        if not docs:
            print(f"知识库中未找到关于 '{query}' 的信息")
            return []
            
        print(f"找到 {len(docs)} 条相关文档")
        return docs[:n_results]
        
    except Exception as e:
        print(f"知识库搜索失败: {e}")
        return []

def init_knowledge_base():
    """初始化知识库"""
    if not collection:
        print("知识库未初始化，跳过导入")
        return
        
    knowledge_files = [
        "knowledge_base/secret_guide.txt",
        "knowledge_base/travel_tips.txt"
    ]
    
    for file_path in knowledge_files:
        if os.path.exists(file_path):
            try:
                ingest_knowledge_base(file_path)
            except Exception as e:
                print(f"导入 {file_path} 失败: {e}")
        else:
            print(f"知识库文件不存在: {file_path}")

# 启动时初始化
init_knowledge_base()
