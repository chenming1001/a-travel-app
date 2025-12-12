# backend/database.py
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# 数据库路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'wanderai.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 用户模型
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(100))
    avatar = Column(String(200), default="👤")
    level = Column(String(50), default="探索者")
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # 关系
    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

# 旅行记录模型
class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    destination = Column(String(100), nullable=False)
    description = Column(Text)
    days = Column(Integer, default=3)
    people = Column(Integer, default=2)
    budget = Column(Float, default=0.0)
    actual_cost = Column(Float)
    tags = Column(JSON, default=list)  # 存储标签列表
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(50), default="planned")  # planned, ongoing, completed
    rating = Column(Float)
    notes = Column(Text)
    images = Column(JSON, default=list)  # 存储图片路径列表
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    # 关系
    user = relationship("User", back_populates="trips")
    locations = relationship("TripLocation", back_populates="trip", cascade="all, delete-orphan")

# 行程地点模型
class TripLocation(Base):
    __tablename__ = "trip_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=False)
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(300))
    type = Column(String(50))  # attraction, hotel, restaurant, transportation
    visit_date = Column(DateTime)
    duration_hours = Column(Float)
    cost = Column(Float)
    notes = Column(Text)
    order = Column(Integer)
    
    # 关系
    trip = relationship("Trip", back_populates="locations")

# 聊天会话模型
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(100), unique=True, index=True)
    title = Column(String(200))
    last_message = Column(Text)
    message_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # 关系
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

# 聊天消息模型
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    session = relationship("ChatSession", back_populates="messages")

# 用户偏好模型
class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    favorite_cities = Column(JSON, default=list)
    travel_styles = Column(JSON, default=list)
    budget_level = Column(String(50), default="适中")
    interests = Column(JSON, default=list)
    notifications_enabled = Column(Boolean, default=True)
    theme = Column(String(50), default="light")
    language = Column(String(10), default="zh")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = relationship("User")

# 创建数据库表
def init_db():
    Base.metadata.create_all(bind=engine)
    print("数据库初始化完成")

# 数据库会话依赖
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
