import math
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query,Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os
import requests
from pydantic import BaseModel, Field
import shutil
from fastapi.middleware.cors import CORSMiddleware
from llm_engine import call_qwen_with_tools, generate_full_plan
import asyncio
from database import SessionLocal, init_db, User, Trip, TripLocation, ChatSession, ChatMessage, UserPreference, get_db
from auth import (
    get_password_hash, verify_password, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_current_active_user
)
from fastapi.staticfiles import StaticFiles
# 初始化数据库
init_db()

app = FastAPI(
    title="WanderAI API",
    description="智能旅行规划系统",
    version="2.0.0"
)
# 在 app = FastAPI() 之后添加
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite 开发服务器
        "http://127.0.0.1:5173",
        "http://localhost:3000",  # 其他可能的端口
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
    expose_headers=["*"],  # 暴露所有头部
)

class MapService:
    def __init__(self):
        self.AMAP_WEB_KEY = "2f7e7f522142f058bd513ad4b102fecc"
        self.BASE_URL = "https://restapi.amap.com/v3"

    def geocode(self, address: str):
        """地址转坐标 + 获取城市编码"""
        try:
            url = f"{self.BASE_URL}/geocode/geo"
            params = {"key": self.AMAP_WEB_KEY, "address": address}
            res = requests.get(url, params=params).json()
            if res["status"] == "1" and res["geocodes"]:
                geo = res["geocodes"][0]
                return {
                    "location": geo["location"],
                    "city": geo.get("citycode", "") or geo.get("adcode", "")
                }
            return None
        except Exception as e:
            print(f"Geocode Error: {e}")
            return None

    def search_places(self, keyword: str, city: str = "全国"):
        try:
            url = f"{self.BASE_URL}/place/text"
            params = {
                "key": self.AMAP_WEB_KEY, "keywords": keyword, "city": city,
                "offset": 20, "page": 1, "extensions": "all"
            }
            res = requests.get(url, params=params).json()
            if res["status"] == "1" and int(res["count"]) > 0:
                return res["pois"]
            return []
        except Exception:
            return []
    def get_weather(self, city_code: str):
        """获取天气信息 (实况 + 预报)"""
        try:
            # 1. 获取实时天气
            url_live = f"{self.BASE_URL}/weather/weatherInfo"
            params_live = {"key": self.AMAP_WEB_KEY, "city": city_code, "extensions": "base"}
            res_live = requests.get(url_live, params=params_live).json()
            
            # 2. 获取预报天气
            params_forecast = {"key": self.AMAP_WEB_KEY, "city": city_code, "extensions": "all"}
            res_forecast = requests.get(url_live, params=params_forecast).json()

            if res_live["status"] == "1" and res_forecast["status"] == "1":
                live = res_live["lives"][0]
                forecasts = res_forecast["forecasts"][0]["casts"]
                
                # 转换图标 (简单映射)
                def get_icon(weather_str):
                    if "晴" in weather_str: return "☀️"
                    if "云" in weather_str or "阴" in weather_str: return "⛅"
                    if "雨" in weather_str: return "🌧️"
                    if "雪" in weather_str: return "❄️"
                    return "🌥️"

                return {
                    "current": {
                        "temperature": int(live.get("temperature", 0)),
                        "condition": live.get("weather", "未知"),
                        "humidity": int(live.get("humidity", 0)),
                        "windSpeed": int(live.get("windpower", 0) if live.get("windpower").isdigit() else 0),
                        "icon": get_icon(live.get("weather", "")),
                        "feelsLike": int(live.get("temperature", 0)) # 高德不提供体感，暂用温度代替
                    },
                    "forecast": [
                        {
                            "day": ["今天", "明天", "后天", "周四", "周五"][i] if i < 5 else f"第{i+1}天",
                            "high": int(day.get("daytemp", 0)),
                            "low": int(day.get("nighttemp", 0)),
                            "condition": day.get("dayweather", ""),
                            "icon": get_icon(day.get("dayweather", ""))
                        }
                        for i, day in enumerate(forecasts)
                    ]
                }
            return None
        except Exception as e:
            print(f"Weather Error: {e}")
            return None
    # 飞机路线估算 (因为高德不提供免费飞机API)
    def calculate_plane_route(self, origin_loc, dest_loc):
        # 将 "lng,lat" 转为 float
        lng1, lat1 = map(float, origin_loc.split(','))
        lng2, lat2 = map(float, dest_loc.split(','))

        # 计算大圆距离 (Haversine formula)
        R = 6371  # 地球半径 km
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lng2 - lng1)
        a = math.sin(dLat/2) * math.sin(dLat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dLon/2) * math.sin(dLon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c # 公里

        # 估算时间 (假设飞机时速 800km/h + 1小时起降/安检缓冲)
        duration_minutes = int((distance / 800) * 60 + 60)

        # 飞机只返回起点和终点，前端地图设置为大地线(Geodesic)会自动画弧线
        path = [[lng1, lat1], [lng2, lat2]]

        return {
            "success": True,
            "distance": round(distance, 1),
            "duration": duration_minutes,
            "path": path,
            "origin_loc": [lng1, lat1],
            "dest_loc": [lng2, lat2],
            "type": "plane" # 标记为飞机
        }

    def calculate_route(self, origin_str: str, dest_str: str, mode: str = "driving"):
        """
        mode: driving, walking, bicycling, bus(市内公交), train(高铁/火车), plane(飞机)
        """
        try:
            print(f"规划路线: {origin_str} -> {dest_str} [{mode}]")

            # 1. 获取坐标
            origin_info = self.geocode(origin_str)
            dest_info = self.geocode(dest_str)

            if not origin_info or not dest_info:
                return {"success": False, "msg": "无法定位起点或终点"}

            origin_loc = origin_info["location"]
            dest_loc = dest_info["location"]
            city1 = origin_info["city"]
            city2 = dest_info["city"]

            # 飞机
            if mode == "plane":
                return self.calculate_plane_route(origin_loc, dest_loc)

            # 2. 准备高德 API 参数
            params = {
                "key": self.AMAP_WEB_KEY,
                "origin": origin_loc,
                "destination": dest_loc,
            }

            if mode == "walking":
                url = f"{self.BASE_URL}/direction/walking"
            elif mode == "bicycling":
                url = f"{self.BASE_URL}/direction/bicycling"
            elif mode in ["bus", "train"]:
                # 公交和火车都走 integrated 接口
                # train: 倾向于跨城; bus: 倾向于同城
                url = f"{self.BASE_URL}/direction/transit/integrated"
                params["city"] = city1
                params["cityd"] = city2
                params["strategy"] = 0
            else: # driving
                url = f"{self.BASE_URL}/direction/driving"
                params["extensions"] = "base"
                params["strategy"] = 10

            # 3. 请求 API
            res = requests.get(url, params=params).json()
            if res["status"] != "1":
                return {"success": False, "msg": f"高德API错误: {res.get('info')}"}

            # 4. 解析结果
            route_data = res["route"]
            paths = route_data.get("paths") or route_data.get("transits")

            if not paths:
                return {"success": False, "msg": "未找到可行路线 (可能是距离太远或无直达)"}

            best_path = paths[0]

            # 距离和时间
            if mode in ["bus", "train"]:
                total_distance = int(best_path.get("distance", 0)) / 1000
                total_duration = int(best_path.get("cost", {}).get("duration", 0)) // 60
            else:
                total_distance = int(best_path.get("distance", 0)) / 1000
                total_duration = int(best_path.get("duration", 0)) // 60

            # 解析路径点
            polyline_points = []

            if mode in ["bus", "train"]:
                for segment in best_path.get("segments", []):
                    # 步行部分
                    if segment.get("walking") and segment["walking"].get("steps"):
                        for step in segment["walking"]["steps"]:
                            polyline_points.extend(self._parse_poly_str(step["polyline"]))
                    # 公交/火车部分
                    if segment.get("bus") and segment["bus"].get("buslines"):
                        for line in segment["bus"]["buslines"]:
                            polyline_points.extend(self._parse_poly_str(line["polyline"]))
                    # 铁路部分 (高德有时放在 railway 字段)
                    if segment.get("railway") and segment["railway"].get("uid"):
                         # 铁路只有名字，没有详细路径点，我们用直线连接站点模拟
                         pass
            else:
                for step in best_path.get("steps", []):
                    polyline_points.extend(self._parse_poly_str(step["polyline"]))

            # 如果路径点为空（例如只有铁路信息），用起点终点兜底
            if not polyline_points:
                o_lng, o_lat = map(float, origin_loc.split(','))
                d_lng, d_lat = map(float, dest_loc.split(','))
                polyline_points = [[o_lng, o_lat], [d_lng, d_lat]]

            return {
                "success": True,
                "distance": total_distance,
                "duration": total_duration,
                "path": polyline_points,
                "origin_loc": [float(x) for x in origin_loc.split(",")],
                "dest_loc": [float(x) for x in dest_loc.split(",")],
                "type": mode
            }

        except Exception as e:
            print(f"Route Error: {e}")
            return {"success": False, "msg": str(e)}
    def get_district_boundary(self, keyword: str):
        try:
            url = f"{self.BASE_URL}/config/district"
            params = {
                "key": self.AMap_WEB_KEY,
                "keywords": keyword,
                "subdistrict": 0,  # 不需要下级行政区
                "extensions": "all" # 关键：all 才会返回边界坐标 polyline
            }
            res = requests.get(url, params=params).json()
            
            if res["status"] == "1" and res["districts"]:
                district = res["districts"][0]
                return {
                    "success": True,
                    "name": district["name"],
                    "level": district["level"],
                    "center": district["center"],
                    "polyline": district["polyline"] # 这是边界数据，可能是很长的字符串
                }
            return {"success": False, "msg": "未找到行政区划信息"}
        except Exception as e:
            print(f"District Error: {e}")
            return {"success": False, "msg": str(e)}
    def _parse_poly_str(self, poly_str: str):
        points = []
        if not poly_str: return points
        pairs = poly_str.split(";")
        for pair in pairs:
            if "," in pair:
                lng, lat = pair.split(",")
                points.append([float(lng), float(lat)])
        return points

map_service = MapService()

@app.get("/api/map/boundary")
async def get_district_boundary_api(keyword: str):
    """获取城市的行政边界"""
    return map_service.get_district_boundary(keyword)


def haversine_distance(lat1, lon1, lat2, lon2):
    """计算两点间的大圆距离 (km)"""
    if not lat1 or not lon1 or not lat2 or not lon2:
        return 0
    R = 6371  # 地球半径
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) * math.sin(d_lat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) * math.sin(d_lon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# 数据模型
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None
class TripCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="旅行名称")
    destination: str = Field(..., min_length=1, max_length=50, description="目的地")
    description: Optional[str] = Field(None, max_length=1000, description="描述")
    days: int = Field(3, ge=1, le=365, description="游玩天数")
    people: int = Field(..., ge=1, description="同行人数")    
    budget: float = Field(0.0, ge=0.0, description="预算")
    tags: List[str] = Field(default_factory=list, description="标签")
    # 接收字符串格式日期，在接口内转换
    start_date: Optional[str] = Field(None, description="开始日期 YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="结束日期 YYYY-MM-DD")
    status: str = Field("planned", pattern="^(planned|ongoing|completed)$", description="状态")
    rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="评分")
    notes: Optional[str] = Field(None, max_length=2000, description="备注")
    latitude: Optional[float] = Field(None, description="纬度")
    longitude: Optional[float] = Field(None, description="经度")
    # 允许忽略前端传来的多余字段 (如 query)
    class Config:
        extra = 'ignore'

class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    days: Optional[int] = None
    people: Optional[int] = None
    budget: Optional[float] = None
    actual_cost: Optional[float] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    type: Optional[str] = None
    visit_date: Optional[str] = None
    duration_hours: Optional[float] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    order: Optional[int] = None

class ChatMessageCreate(BaseModel):
    role: str
    content: str
    message_metadata: Optional[Dict[str, Any]] = None

class PreferencesUpdate(BaseModel):
    favorite_cities: Optional[List[str]] = None
    travel_styles: Optional[List[str]] = None
    budget_level: Optional[str] = None
    interests: Optional[List[str]] = None
    theme: Optional[str] = None
    language: Optional[str] = None

class ChatRequest(BaseModel):
    """聊天请求数据模型"""
    message: str
    session_id: Optional[str] = "default"
    api_config: Optional[Dict[str, Any]] = {}

    class Config:
        extra = "ignore"

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
@app.get("/api/map/search")
async def search_places_api(keyword: str, city: str = "全国"):
    results = map_service.search_places(keyword, city)
    formatted_results = []
    for poi in results:
        location = poi.get("location", "0,0").split(",")
        formatted_results.append({
            "id": poi.get("id"),
            "name": poi.get("name"),
            "address": poi.get("address"),
            "location": {"lng": float(location[0]), "lat": float(location[1])},
            "type": poi.get("type", "")
        })
    return {"success": True, "data": formatted_results}

@app.get("/api/map/direction")
async def direction_api(
    origin: str,
    destination: str,
    mode: str = Query("driving", enum=["driving", "walking", "bicycling", "bus", "train", "plane"])
):
    """
    mode: driving, walking, bicycling, bus(市内公交), train(高铁/火车), plane(飞机)
    """
    return map_service.calculate_route(origin, destination, mode)
@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user.username, "id": user.id}}
# 工具函数
def calculate_trip_stats(user_id: int, db: Session) -> Dict[str, Any]:
    """计算用户旅行统计数据"""
    # 总行程数
    total_trips = db.query(func.count(Trip.id)).filter(Trip.user_id == user_id).scalar()

    # 已完成行程
    completed_trips = db.query(func.count(Trip.id)).filter(
        Trip.user_id == user_id,
        Trip.status == "completed"
    ).scalar()

    # 总花费
    total_spent = db.query(func.sum(func.coalesce(Trip.actual_cost, Trip.budget))).filter(
        Trip.user_id == user_id
    ).scalar() or 0

    # 探索城市
    explored_cities = db.query(
        func.count(func.distinct(Trip.destination))
    ).filter(Trip.user_id == user_id).scalar()

    # 总天数
    total_days = db.query(func.sum(Trip.days)).filter(
        Trip.user_id == user_id
    ).scalar() or 0

    # 热门标签
    all_tags = []
    trips = db.query(Trip).filter(Trip.user_id == user_id).all()
    for trip in trips:
        if trip.tags:
            all_tags.extend(trip.tags)

    from collections import Counter
    popular_tags = [tag for tag, _ in Counter(all_tags).most_common(5)]

    # 最近行程
    recent_trips = db.query(Trip).filter(
        Trip.user_id == user_id
    ).order_by(desc(Trip.created_at)).limit(5).all()

    # 月度趋势（模拟）
    monthly_trend = [10, 15, 20, 25, 30, 40, 35, 25, 20, 15, 20, 25]

    return {
        "total_trips": total_trips,
        "completed_trips": completed_trips,
        "total_spent": float(total_spent),
        "explored_cities": explored_cities,
        "total_days": total_days,
        "popular_tags": popular_tags,
        "monthly_trend": monthly_trend,
        "recent_trips": [
            {
                "id": trip.id,
                "name": trip.name,
                "destination": trip.destination,
                "days": trip.days,
                "budget": float(trip.budget),
                "actual_cost": float(trip.actual_cost) if trip.actual_cost else None,
                "status": trip.status,
                "rating": float(trip.rating) if trip.rating else None,
                "start_date": trip.start_date.isoformat() if trip.start_date else None,
                "end_date": trip.end_date.isoformat() if trip.end_date else None
            }
            for trip in recent_trips
        ]
    }

# 认证相关接口
@app.post("/api/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    print(f"接收到注册请求: {user_data.dict()}")

    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        print(f"用户名已存在: {user_data.username}")
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 检查邮箱是否已存在
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        print(f"邮箱已被注册: {user_data.email}")
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 验证密码长度
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少需要6个字符")

    # 验证用户名长度
    if len(user_data.username) < 3:
        raise HTTPException(status_code=400, detail="用户名至少需要3个字符")

    # 验证邮箱格式
    if "@" not in user_data.email or "." not in user_data.email:
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    # 创建用户
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name or user_data.username,
        avatar="👤",
        level="探索者",
        points=0
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # 创建用户偏好
    preferences = UserPreference(
        user_id=user.id,
        favorite_cities=["北京", "上海", "成都"],
        travel_styles=["自由行"],
        budget_level="适中",
        interests=["美食探索", "自然风光"]
    )
    db.add(preferences)
    db.commit()

    # 生成访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    print(f"用户注册成功: {user.username}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "avatar": user.avatar,
            "level": user.level,
            "points": user.points
        }
    }

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """用户登录"""
    print(f"登录请求: {form_data.username}")

    user = db.query(User).filter(User.username == form_data.username).first()

    if not user:
        print(f"用户不存在: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        print(f"密码错误: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    print(f"登录成功: {user.username}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "avatar": user.avatar,
            "level": user.level,
            "points": user.points
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息"""
    print(f"获取用户信息: {current_user.username}")
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "avatar": current_user.avatar,
        "level": current_user.level,
        "points": current_user.points,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }


# 用户相关接口
@app.put("/api/users/profile")
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新用户资料"""
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    if user_data.avatar:
        current_user.avatar = user_data.avatar

    db.commit()
    db.refresh(current_user)

    return {
        "message": "资料更新成功",
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "avatar": current_user.avatar,
            "level": current_user.level,
            "points": current_user.points
        }
    }

# =============== 旅行记录相关接口 ===============
@app.post("/api/trips")
async def create_trip(
    trip_data: TripCreate = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建旅行记录（自动获取坐标）"""
    print(f"📝 创建旅行: {trip_data.dict()}")
    print(f"📝 接收到创建请求 - 目的地: {trip_data.destination}, 人数: {trip_data.people}")
    try:
        # 1. 如果没有提供经纬度，尝试自动获取
        latitude = trip_data.latitude
        longitude = trip_data.longitude

        if (not latitude or not longitude) and trip_data.destination:
            print(f"🗺️ 自动获取 {trip_data.destination} 的坐标...")
            try:
                geocode_result = map_service.geocode(trip_data.destination)
                if geocode_result and geocode_result.get("location"):
                    location = geocode_result["location"]
                    longitude, latitude = map(float, location.split(','))
                    print(f"✅ 获取到坐标: {latitude}, {longitude}")
                else:
                    print("⚠️ 无法获取坐标，使用默认值")
                    latitude = 39.9042  # 北京
                    longitude = 116.4074
            except Exception as geo_error:
                print(f"❌ 获取坐标失败: {geo_error}")
                latitude = 39.9042
                longitude = 116.4074

        # 2. 处理日期字段
        start_date_obj = None
        if trip_data.start_date and trip_data.start_date.strip():
            try:
                start_date_obj = datetime.strptime(trip_data.start_date, "%Y-%m-%d").date()
                print(f"📅 开始日期: {start_date_obj}")
            except ValueError as e:
                print(f"❌ 开始日期格式错误: {e}")
                # 不抛出异常，允许为空

        end_date_obj = None
        if trip_data.end_date and trip_data.end_date.strip():
            try:
                end_date_obj = datetime.strptime(trip_data.end_date, "%Y-%m-%d").date()
                print(f"📅 结束日期: {end_date_obj}")
            except ValueError as e:
                print(f"❌ 结束日期格式错误: {e}")
                # 不抛出异常，允许为空

        # 3. 确保tags是列表
        tags = trip_data.tags or []
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except:
                tags = []

        # 4. 创建旅行记录对象
        new_trip = Trip(
            user_id=current_user.id,
            name=trip_data.name,
            destination=trip_data.destination,
            description=trip_data.description,
            days=trip_data.days,
            people=trip_data.people,
            budget=float(trip_data.budget),
            actual_cost=None,  # 实际花费初始为空
            tags=tags,
            status=trip_data.status,
            rating=float(trip_data.rating) if trip_data.rating is not None else None,
            notes=trip_data.notes,
            start_date=start_date_obj,
            end_date=end_date_obj,
            latitude=float(latitude) if latitude else None,
            longitude=float(longitude) if longitude else None,
            images=[],  # 初始图片为空数组
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # 5. 保存到数据库
        db.add(new_trip)
        db.commit()
        db.refresh(new_trip)

        # 6. 更新用户积分
        current_user.points += 10
        db.commit()

        print(f"✅ 旅行记录创建成功: ID={new_trip.id}, 名称={new_trip.name}")

        # 7. 返回完整的旅行记录数据
        return {
            "success": True,
            "message": "旅行记录创建成功",
            "trip": {
                "id": new_trip.id,
                "name": new_trip.name,
                "destination": new_trip.destination,
                "description": new_trip.description,
                "days": new_trip.days,
                "people": new_trip.people,
                "budget": float(new_trip.budget),
                "tags": new_trip.tags or [],
                "status": new_trip.status,
                "rating": float(new_trip.rating) if new_trip.rating else None,
                "notes": new_trip.notes,
                "latitude": float(new_trip.latitude) if new_trip.latitude else None,
                "longitude": float(new_trip.longitude) if new_trip.longitude else None,
                "start_date": new_trip.start_date.isoformat() if new_trip.start_date else None,
                "end_date": new_trip.end_date.isoformat() if new_trip.end_date else None,
                "created_at": new_trip.created_at.isoformat(),
                "updated_at": new_trip.updated_at.isoformat()
            }
        }

    except Exception as e:
        print(f"❌ 创建旅行记录失败: {str(e)}")
        import traceback
        traceback.print_exc()

        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建旅行记录失败: {str(e)}"
        )
@app.get("/api/trips")
async def get_user_trips(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None
):
    query = db.query(Trip).filter(Trip.user_id == current_user.id)
    if status: query = query.filter(Trip.status == status)
    trips = query.order_by(desc(Trip.created_at)).all()

    return {
        "success": True,
        "trips": [
            {
                "id": t.id, "name": t.name, "destination": t.destination,
                "days": t.days, "budget": float(t.budget), "status": t.status,
                "start_date": t.start_date.isoformat() if t.start_date else None,
                "tags": t.tags or [],
                "images": t.images or [],
                "notes": t.notes or "",
                "rating": t.rating or "",
                "people":t.people or""
            } for t in trips
        ]
    }
# 批量创建旅行记录
@app.post("/api/trips/batch")
async def create_batch_trips(
    trips_data: List[TripCreate],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """批量创建旅行记录"""
    try:
        created_trips = []
        points_added = 0

        for trip_data in trips_data:
            # 同样处理日期
            start_date = None
            if trip_data.start_date and trip_data.start_date.strip():
                try:
                    start_date = datetime.strptime(trip_data.start_date, "%Y-%m-%d").date()
                except:
                    pass

            trip_dict = trip_data.model_dump(exclude_unset=True)
            # 移除字符串日期，使用处理后的对象
            if 'start_date' in trip_dict: del trip_dict['start_date']
            if 'end_date' in trip_dict: del trip_dict['end_date']

            trip = Trip(
                user_id=current_user.id,
                start_date=start_date,
                **trip_dict
            )
            db.add(trip)
            created_trips.append(trip)
            points_added += 5  # 每个旅行5分

        db.commit()

        # 刷新所有创建的旅行记录
        for trip in created_trips:
            db.refresh(trip)

        # 更新用户积分
        current_user.points += points_added
        update_user_level(current_user, db)
        db.commit()

        return {
            "success": True,
            "message": f"批量创建成功，共{len(created_trips)}条记录",
            "points_added": points_added,
            "trips": [
                {
                    "id": trip.id,
                    "name": trip.name,
                    "destination": trip.destination,
                    "status": trip.status
                }
                for trip in created_trips
            ]
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"批量创建失败: {str(e)}"
        )

@app.put("/api/trips/{trip_id}")
async def update_trip(
    trip_id: int,
    trip_data: TripUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新旅行记录"""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="旅行记录不存在")

    # 更新字段
    update_data = trip_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trip, field, value)

    trip.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": "旅行记录更新成功",
        "trip": {
            "id": trip.id,
            "name": trip.name,
            "status": trip.status
        }
    }

@app.delete("/api/trips/{trip_id}")
async def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除旅行记录"""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="旅行记录不存在")

    db.delete(trip)
    db.commit()

    return {
        "success": True,
        "message": "旅行记录删除成功"
    }

@app.post("/api/trips/{trip_id}/upload-image")
async def upload_trip_image(
    trip_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """上传旅行图片"""
    try:
        trip = db.query(Trip).filter(
            Trip.id == trip_id,
            Trip.user_id == current_user.id
        ).first()

        if not trip:
            raise HTTPException(status_code=404, detail="旅行记录不存在")

        # 创建上传目录
        import os
        upload_dir = os.path.join("uploads", "trips", str(trip_id))
        os.makedirs(upload_dir, exist_ok=True)

        # 生成文件名
        import uuid
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, filename)

        # 保存文件
        import shutil
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 更新旅行记录的图片列表
        if not trip.images:
            trip.images = []

        # 添加图片URL到列表
        image_url = f"/uploads/trips/{trip_id}/{filename}"
        if image_url not in trip.images:
            trip.images.append(image_url)
            # 标记该字段已更改 
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(trip, "images")

        db.commit()

        return {
            "success": True,
            "message": "图片上传成功",
            "image_url": image_url
        }

    except Exception as e:
        print(f"上传图片错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片上传失败: {str(e)}"
        )


@app.get("/api/trips/{trip_id}")
async def get_trip_detail(
    trip_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取旅行记录详情"""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.user_id == current_user.id
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="旅行记录不存在")

    # 获取关联的地点
    locations = db.query(TripLocation).filter(
        TripLocation.trip_id == trip_id
    ).all()

    return {
        "success": True,
        "trip": {
            "id": trip.id,
            "name": trip.name,
            "destination": trip.destination,
            "description": trip.description,
            "days": trip.days,
            "people": trip.people,
            "budget": float(trip.budget),
            "actual_cost": float(trip.actual_cost) if trip.actual_cost else None,
            "tags": trip.tags or [],
            "start_date": trip.start_date.isoformat() if trip.start_date else None,
            "end_date": trip.end_date.isoformat() if trip.end_date else None,
            "status": trip.status,
            "rating": float(trip.rating) if trip.rating else None,
            "notes": trip.notes,
            "images": trip.images or [],
            "created_at": trip.created_at.isoformat(),
            "updated_at": trip.updated_at.isoformat(),
            "locations": [
                {
                    "id": loc.id,
                    "name": loc.name,
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "address": loc.address,
                    "type": loc.type,
                    "visit_date": loc.visit_date.isoformat() if loc.visit_date else None,
                    "duration_hours": loc.duration_hours,
                    "cost": float(loc.cost) if loc.cost else None,
                    "notes": loc.notes,
                    "order": loc.order
                }
                for loc in locations
            ]
        }
    }

# 仪表盘数据接口
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取仪表盘统计数据"""
    # 确保调用辅助函数获取基础统计
    stats = calculate_trip_stats(current_user.id, db)

    # 获取用户偏好
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    # 获取热门目的地（基于用户去过的地方）
    popular_destinations = db.query(
        Trip.destination,
        func.count(Trip.id).label('count')
    ).filter(
        Trip.user_id == current_user.id
    ).group_by(Trip.destination).order_by(desc('count')).limit(5).all()

    # 用户洞察
    user_insights = []
    if stats["total_trips"] > 0:
        user_insights.append(f"您已经完成了 {stats['completed_trips']} 次旅行")
        user_insights.append(f"探索了 {stats['explored_cities']} 个城市")
        if stats["total_spent"] > 0:
            user_insights.append(f"累计旅行花费 ¥{stats['total_spent']:.0f}")

    if preferences and preferences.interests:
        # 确保interests是列表
        interests = preferences.interests if isinstance(preferences.interests, list) else []
        if interests:
            user_insights.append(f"您的兴趣: {', '.join(interests[:3])}")

    if popular_destinations:
        top_dest = popular_destinations[0][0]
        user_insights.append(f"您最常去的目的地: {top_dest}")

    # 推荐
    recommendations = []
    if preferences and preferences.interests:
        interests = preferences.interests
        if "美食探索" in interests:
            recommendations.append({
                "title": "美食之旅",
                "description": "探索当地特色美食",
                "destination": "成都",
                "reason": "基于您的美食兴趣"
            })
        if "自然风光" in interests:
            recommendations.append({
                "title": "自然风光游",
                "description": "欣赏壮丽的自然景观",
                "destination": "桂林",
                "reason": "基于您的自然兴趣"
            })

    return {
        **stats,
        "trending_destinations": [
            {"city": dest[0], "count": dest[1]}
            for dest in popular_destinations
        ],
        "user_insights": user_insights,
        "recommendations": recommendations,
        "user_preferences": {
            "favorite_cities": preferences.favorite_cities if preferences else [],
            "travel_styles": preferences.travel_styles if preferences else [],
            "budget_level": preferences.budget_level if preferences else "适中",
            "interests": preferences.interests if preferences else []
        }
    }

# 用户偏好接口
@app.get("/api/user/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户偏好"""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not preferences:
        # 创建默认偏好
        preferences = UserPreference(
            user_id=current_user.id,
            favorite_cities=["北京", "上海", "成都"],
            travel_styles=["自由行"],
            budget_level="适中",
            interests=["美食探索", "自然风光"]
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return {
        "favorite_cities": preferences.favorite_cities,
        "travel_styles": preferences.travel_styles,
        "budget_level": preferences.budget_level,
        "interests": preferences.interests,
        "theme": preferences.theme,
        "language": preferences.language,
        "notifications_enabled": preferences.notifications_enabled
    }

@app.put("/api/user/preferences")
async def update_user_preferences_api(
    prefs_data: PreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新用户偏好"""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not preferences:
        preferences = UserPreference(user_id=current_user.id)
        db.add(preferences)

    # 更新字段
    update_data = prefs_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)

    preferences.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(preferences)

    return {
        "message": "偏好更新成功",
        "preferences": {
            "favorite_cities": preferences.favorite_cities,
            "travel_styles": preferences.travel_styles,
            "budget_level": preferences.budget_level,
            "interests": preferences.interests,
            "theme": preferences.theme,
            "language": preferences.language
        }
    }


# =============== 对话状态管理 ===============

class ConversationState:
    """对话状态管理器"""

    def __init__(self):
        self.states = {}

    def get_state(self, session_id: str) -> Dict:
        """获取对话状态"""
        return self.states.get(session_id, {
            "step": 0,  # 当前步骤
            "collected_info": {},  # 收集的信息
            "awaiting_response": False,  # 是否等待用户回答
            "last_question": "",  # 上次问的问题
            "can_generate_plan": False,  # 是否可以生成计划
        })

    def update_state(self, session_id: str, updates: Dict):
        """更新对话状态"""
        if session_id not in self.states:
            self.states[session_id] = self.get_state(session_id)
        self.states[session_id].update(updates)

    def reset_state(self, session_id: str):
        """重置对话状态"""
        self.states[session_id] = {
            "step": 0,
            "collected_info": {},
            "awaiting_response": False,
            "last_question": "",
            "can_generate_plan": False,
        }

# 全局对话状态管理器
conversation_manager = ConversationState()

# 旅行信息收集步骤
TRAVEL_STEPS = [
    {
        "name": "destination",
        "question": "🏝️ 请问您想去哪里旅行？",
        "field": "目的地",
        "example": "例如：北京、上海、成都、三亚等"
    },
    {
        "name": "days",
        "question": "📅 计划游玩几天？",
        "field": "游玩天数",
        "example": "例如：3天、5天、一周等"
    },
    {
        "name": "people",
        "question": "👥 一共几个人同行？",
        "field": "同行人数",
        "example": "例如：2人、4人、家庭出游等"
    },
    {
        "name": "budget",
        "question": "💰 您的预算水平是多少？",
        "field": "预算水平",
        "example": "经济、适中、豪华"
    },
    {
        "name": "travel_date",
        "question": "🗓️ 计划什么时间出发？",
        "field": "出行时间",
        "example": "例如：下个月、暑假、国庆假期等"
    },
    {
        "name": "interests",
        "question": "🎯 您对什么类型的活动感兴趣？",
        "field": "兴趣偏好",
        "example": "美食、历史、自然、购物、摄影等（可以多选）"
    },
    {
        "name": "transport",
        "question": "🚗 您偏好什么交通方式？",
        "field": "交通方式",
        "example": "公共交通、自驾、包车、步行等"
    },
    {
        "name": "special_requirements",
        "question": "✨ 有没有特殊要求或注意事项？",
        "field": "特殊要求",
        "example": "例如：带小孩、有老人、有饮食禁忌等"
    }
]


# =============== 聊天接口 ===============
@app.post("/api/chat")
async def chat_with_ai(
    request_data: ChatRequest,
    db: Session = Depends(get_db)
):
    """智能聊天（集成 LLM）"""
    try:
        message = request_data.message
        session_id = request_data.session_id or "default"
        api_config = request_data.api_config or {}

        print(f"收到聊天消息: {message}")
        print(f"API配置: {api_config}")

        if not message:
            return {
                "reply": "请发送有效的消息内容",
                "session_id": session_id,
                "error": "消息内容为空"
            }
        current_user = None

        # 系统提示
        system_prompt = """你是WanderAI，一个专业的旅行规划助手。

你可以使用以下工具获取实时信息：
1. search_poi - 搜索地点（如：故宫、西湖、外滩）
2. search_nearby - 搜索周边设施（如：附近的酒店、停车场、餐厅）
3. search_knowledge_base - 获取旅行技巧（如：避坑指南、省钱技巧）

回复时请：
1. 保持热情、专业的语气
2. 提供具体、实用的建议
3. 使用emoji让回复更生动
4. 如果需要更多信息，主动询问

现在开始对话："""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]

        print(f"调用 LLM 引擎，消息数: {len(messages)}")

        # 调用 LLM 引擎
        try:
            ai_reply = await call_qwen_with_tools(messages, api_config)
        except Exception as llm_error:
            print(f"LLM 调用失败: {llm_error}")
            # 备用回复
            ai_reply = generate_simple_fallback_reply(message)

        print(f"AI 回复成功，长度: {len(ai_reply)} 字符")

        # 检测是否使用了工具
        has_tools = any(keyword in ai_reply.lower() for keyword in ["搜索到", "找到", "查询到", "推荐"])

        return {
            "reply": ai_reply,
            "session_id": session_id,
            "model": "qwen-turbo",
            "has_tools": has_tools,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        print(f"聊天接口错误: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            "reply": f"抱歉，我遇到了一些技术问题。请稍后再试。\n\n错误详情: {str(e)[:100]}",
            "session_id": request_data.session_id or "default",
            "error": str(e),
            "fallback": True
        }

def generate_simple_fallback_reply(message: str) -> str:
    """简单的备用回复"""
    message_lower = message.lower()

    if any(word in message_lower for word in ["北京", "beijing"]):
        return """**北京旅行建议** 🏛️

推荐行程：
1. 故宫 + 天安门广场
2. 颐和园 + 圆明园  
3. 长城一日游
4. 798艺术区 + 三里屯

美食推荐：北京烤鸭、炸酱面、豆汁焦圈
建议游玩：3-4天，预算 ¥3000-5000"""

    elif any(word in message_lower for word in ["上海", "shanghai"]):
        return """**上海旅行建议** 🌃

推荐行程：
1. 外滩 + 南京路步行街
2. 豫园城隍庙 + 新天地
3. 迪士尼乐园一日游
4. 田子坊 + 法租界漫步

美食推荐：小笼包、生煎包、本帮菜
建议游玩：2-3天，预算 ¥2500-4000"""

    elif any(word in message_lower for word in ["成都"]):
        return """**成都旅行建议** 🐼

推荐行程：
1. 宽窄巷子 + 锦里古街
2. 大熊猫繁育研究基地
3. 都江堰一日游
4. 春熙路 + 太古里购物

美食推荐：火锅、串串香、担担面、龙抄手
建议游玩：3-4天，预算 ¥2500-4000"""

    elif "美食" in message_lower:
        return """**美食城市推荐** 🍜

1. **成都** - 麻辣天堂，必尝火锅、串串香
2. **广州** - 点心之都，早茶文化丰富
3. **西安** - 面食王国，肉夹馍、凉皮
4. **长沙** - 湘菜代表，臭豆腐、口味虾

哪个城市的美食让您感兴趣？"""

    elif any(word in message_lower for word in ["预算", "花费", "多少钱", "费用"]):
        return "💰 预算估算需要更多信息。\n\n请告诉我：\n1. 目的地\n2. 游玩天数\n3. 同行人数\n4. 住宿标准\n5. 交通方式\n6. 餐饮要求\n\n我会为您详细估算旅行花费。"

    # 默认回复
    return """🚀 您好！我是WanderAI旅行助手，可以帮您：

✅ **规划行程** - 生成详细旅行计划
✅ **推荐景点** - 根据兴趣个性化推荐  
✅ **预算估算** - 帮您控制旅行花费
✅ **避坑指南** - 分享本地人知道的技巧
✅ **实时查询** - 搜索地点、周边设施

请告诉我您的旅行需求，比如：
• "想去北京玩3天，喜欢美食和历史"
• "上海有什么必去的景点？"
• "帮我规划一个成都周末美食之旅"
• "杭州西湖附近有什么好酒店？"

我随时为您服务！"""

def generate_smart_fallback_reply(message: str, history, user: Optional[User], db: Session) -> str:
    """智能备用回复（当 LLM 不可用时）"""
    message_lower = message.lower()

    # 检查是否在询问特定城市
    cities = ["北京", "上海", "广州", "深圳", "成都", "杭州", "西安", "重庆", "南京", "武汉"]
    for city in cities:
        if city in message:
            return f"""🎯 您是想了解{city}的旅行信息吗？

{city}是一个很棒的目的地！我可以为您提供：
1. **必去景点** - 经典打卡地
2. **特色美食** - 当地必尝美味
3. **行程建议** - 合理路线规划
4. **避坑指南** - 本地人知道的技巧

请告诉我您的具体需求，比如：
• 游玩几天？
• 预算范围？
• 兴趣爱好？
• 同行人员？

我会为您详细规划{city}之旅！"""

    # 如果是登录用户，显示个性化信息
    if user:
        user_trips = db.query(Trip).filter(
            Trip.user_id == user.id,
            Trip.status == "completed"
        ).limit(3).all()

        if user_trips:
            destinations = [trip.destination for trip in user_trips]
            return f"""👋 你好 {user.full_name or user.username}！

我看到您去过 {', '.join(destinations)}，
有什么我可以帮您的吗？

我可以为您：
✅ 规划新的旅行
✅ 推荐目的地
✅ 估算预算
✅ 搜索景点信息

请告诉我您的需求！"""

    # 通用回复
    return """🚀 您好！我是WanderAI旅行助手，可以帮您：

✅ **规划行程** - 生成详细旅行计划
✅ **推荐景点** - 根据兴趣个性化推荐  
✅ **预算估算** - 帮您控制旅行花费
✅ **避坑指南** - 分享本地人知道的技巧
✅ **实时查询** - 搜索地点、周边设施

请告诉我您的旅行需求，比如：
• "想去北京玩3天，喜欢美食和历史"
• "上海有什么必去的景点？"
• "帮我规划一个成都周末美食之旅"
• "杭州西湖附近有什么好酒店？"

我随时为您服务！"""

# =============== 修复行程生成接口 ===============

class GeneratePlanRequest(BaseModel):
    """行程生成请求模型"""
    origin: str = "当前城市"
    destination: str
    days: int = 3
    people: int = 2
    budget: str = "适中"
    transport: str = "公共交通"
    pace: str = "适中"
    who_with: str = "朋友"
    tags: List[str] = []
    preferences: str = "无特殊偏好"
    api_config: Dict[str, Any] = {}

    class Config:
        extra = "ignore"  # 忽略额外字段

@app.post("/api/generate-plan")
async def generate_travel_plan(
    request: GeneratePlanRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """生成完整的旅行计划（使用 LLM）"""
    print(f"生成旅行计划请求: {request.destination} {request.days}天")

    try:
        # 直接使用请求对象中的参数
        plan = await generate_full_plan(
            origin=request.origin,
            destination=request.destination,
            days=request.days,
            people=request.people,
            preferences=request.preferences,
            budget=request.budget,
            transport=request.transport,
            pace=request.pace,
            who_with=request.who_with,
            tags=request.tags,
            api_config=request.api_config
        )

        print(f"AI 计划生成成功，长度: {len(plan)} 字符")

        # 自动创建旅行记录
        trip = Trip(
            user_id=current_user.id,
            name=f"{request.destination} {request.days}日游",
            destination=request.destination,
            description=f"AI 生成的旅行计划 - {request.destination} {request.days}天",
            days=request.days,
            people=request.people,
            budget=estimate_budget(request.budget, request.days, request.people),
            tags=request.tags,
            status="generated",
            notes=f"生成时间: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n\n{plan[:500]}..."
        )

        db.add(trip)

        # 更新用户偏好（添加目的地到收藏城市）
        user_prefs = db.query(UserPreference).filter(
            UserPreference.user_id == current_user.id
        ).first()

        if user_prefs:
            if user_prefs.favorite_cities is None:
                user_prefs.favorite_cities = []
            if request.destination not in user_prefs.favorite_cities:
                user_prefs.favorite_cities.append(request.destination)
                user_prefs.updated_at = datetime.utcnow()

        # 更新用户积分
        current_user.points += 30  # 生成计划奖励更多积分

        db.commit()
        db.refresh(trip)

        return {
            "success": True,
            "plan": plan,
            "reply": plan,  # 为了前端兼容性
            "trip_id": trip.id,
            "message": "旅行计划生成成功"
        }

    except Exception as e:
        print(f"生成计划错误: {str(e)}")
        import traceback
        traceback.print_exc()

        # 尝试使用聊天接口作为后备
        try:
            print("尝试使用聊天接口作为后备...")
            fallback_prompt = f"""请为{request.destination}生成一个{request.days}天的详细旅行计划。
            
要求：
- 预算水平：{request.budget}
- 同行人数：{request.people}人
- 出行方式：{request.transport}
- 游玩节奏：{request.pace}
- 同行人员：{request.who_with}
- 兴趣标签：{', '.join(request.tags) if request.tags else '无'}
- 特殊要求：{request.preferences}

请用markdown格式详细回复，包含每日行程安排、预算估算和实用建议。"""

            # 直接调用LLM引擎
            messages = [
                {"role": "system", "content": "你是一个专业的旅行规划师，请为用户生成详细的旅行计划。"},
                {"role": "user", "content": fallback_prompt}
            ]

            fallback_plan = await call_qwen_with_tools(messages, request.api_config)

            return {
                "success": True,
                "plan": fallback_plan,
                "reply": fallback_plan,
                "message": "使用备选方案生成成功"
            }

        except Exception as fallback_error:
            print(f"备选方案也失败: {fallback_error}")

            return {
                "success": False,
                "plan": f"生成计划时出错: {str(e)}",
                "reply": f"生成计划时出错: {str(e)}",
                "message": "请检查 API 配置或稍后再试"
            }

@app.post("/generate")
async def legacy_generate_plan(
    request: Dict[str, Any]
):
    """兼容旧的 /generate 端点"""
    print("接收到 /generate 请求")

    try:
        # 转换为 GeneratePlanRequest 格式
        generate_request = GeneratePlanRequest(
            origin=request.get("origin", "当前城市"),
            destination=request.get("destination", ""),
            days=request.get("days", 3),
            people=request.get("people", 2),
            budget=request.get("budget", "适中"),
            transport=request.get("transport", "公共交通"),
            pace=request.get("pace", "适中"),
            who_with=request.get("who_with", "朋友"),
            tags=request.get("tags", []),
            preferences=request.get("preferences", "无特殊偏好"),
            api_config=request.get("api_config", {})
        )

        # 直接调用 generate_full_plan 函数
        plan = await generate_full_plan(
            origin=generate_request.origin,
            destination=generate_request.destination,
            days=generate_request.days,
            people=generate_request.people,
            preferences=generate_request.preferences,
            budget=generate_request.budget,
            transport=generate_request.transport,
            pace=generate_request.pace,
            who_with=generate_request.who_with,
            tags=generate_request.tags,
            api_config=generate_request.api_config
        )

        return {
            "success": True,
            "plan": plan,
            "reply": plan,
            "message": "旅行计划生成成功"
        }

    except Exception as e:
        print(f"/generate 接口错误: {e}")

        return {
            "success": False,
            "reply": f"生成失败: {str(e)}",
            "message": "请检查参数格式"
        }



# 辅助函数
def estimate_budget(budget_level, days, people):
    """根据预算水平估算总预算"""
    daily_per_person = {
        "经济": 300,
        "适中": 500,
        "豪华": 1000
    }

    base = daily_per_person.get(budget_level, 500)
    return base * days * people

def generate_fallback_reply(message: str, user: User, db: Session) -> str:
    """备用回复生成（当 LLM 不可用时）"""
    message_lower = message.lower()

    # 获取用户旅行数据
    user_trips = db.query(Trip).filter(
        Trip.user_id == user.id,
        Trip.status == "completed"
    ).limit(5).all()

    trip_destinations = [trip.destination for trip in user_trips]

    # 简单关键词匹配
    if any(word in message_lower for word in ["你好", "hi", "hello", "您好"]):
        greeting = f"👋 你好 {user.full_name or user.username}！"
        if trip_destinations:
            greeting += f" 我看到您去过 {trip_destinations[0]}，有什么可以帮您的吗？"
        else:
            greeting += " 我是您的旅行助手，有什么可以帮您的？"
        return greeting

    elif any(word in message_lower for word in ["推荐", "去哪", "哪里玩", "去哪里"]):
        if trip_destinations:
            return f"根据您去过的 {trip_destinations[0]}，我推荐您尝试：\n\n1. **美食探索**: 去当地夜市品尝特色小吃\n2. **文化体验**: 参观博物馆和历史古迹\n3. **自然风光**: 探索周边的自然景区\n\n您对哪种类型更感兴趣？"
        else:
            return "我可以为您推荐旅行目的地！请告诉我：\n\n1. 您喜欢什么类型的旅行？（美食、文化、自然）\n2. 计划游玩几天？\n3. 大概的预算是多少？"

    elif any(word in message_lower for word in ["北京", "beijing"]):
        return """**北京旅行建议** 🏛️

推荐行程：
1. 故宫 + 天安门广场
2. 颐和园 + 圆明园  
3. 长城一日游
4. 798艺术区 + 三里屯

美食推荐：北京烤鸭、炸酱面、豆汁焦圈
建议游玩：3-4天，预算 ¥3000-5000"""

    elif any(word in message_lower for word in ["上海", "shanghai"]):
        return """**上海旅行建议** 🌃

推荐行程：
1. 外滩 + 南京路步行街
2. 豫园城隍庙 + 新天地
3. 迪士尼乐园一日游
4. 田子坊 + 法租界漫步

美食推荐：小笼包、生煎包、本帮菜
建议游玩：2-3天，预算 ¥2500-4000"""

    elif "美食" in message_lower:
        return """**美食城市推荐** 🍜

1. **成都** - 麻辣天堂，必尝火锅、串串香
2. **广州** - 点心之都，早茶文化丰富
3. **西安** - 面食王国，肉夹馍、凉皮
4. **长沙** - 湘菜代表，臭豆腐、口味虾

哪个城市的美食让您感兴趣？"""

    # 默认回复
    default_reply = f"感谢您的咨询！我可以帮您规划旅行、推荐目的地、估算预算。\n\n请告诉我您的具体需求"
    if trip_destinations:
        default_reply += f"，或者您去过哪些地方？我可以基于您的旅行历史给出个性化建议。"

    return default_reply

# 从聊天生成旅行记录
@app.post("/api/chat/generate-trip")
async def generate_trip_from_chat(
    trip_name: str = Form(...),
    destination: str = Form(...),
    days: int = Form(3),
    people: int = Form(2),
    budget: float = Form(0.0),
    tags: str = Form("[]"),
    notes: str = Form(""),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """从聊天内容生成旅行记录"""
    try:
        tags_list = json.loads(tags)
    except:
        tags_list = []

    # 创建旅行记录
    trip = Trip(
        user_id=current_user.id,
        name=trip_name,
        destination=destination,
        description=f"从聊天生成的旅行计划 - {destination}",
        days=days,
        people=people,
        budget=budget,
        tags=tags_list,
        status="planned",
        notes=notes
    )

    db.add(trip)

    # 更新用户偏好（添加目的地到收藏城市）
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if preferences and destination not in preferences.favorite_cities:
        preferences.favorite_cities.append(destination)
        preferences.updated_at = datetime.utcnow()

    # 更新用户积分
    current_user.points += 20

    db.commit()
    db.refresh(trip)

    return {
        "message": "旅行记录生成成功",
        "trip": {
            "id": trip.id,
            "name": trip.name,
            "destination": trip.destination,
            "days": trip.days,
            "budget": float(trip.budget)
        }
    }

# 健康检查
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# 根路径
@app.get("/")
async def root():
    return {
        "message": "WanderAI API 正在运行",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": ["/api/auth/register", "/api/auth/login", "/api/auth/me"],
            "trips": ["/api/trips", "/api/trips/{id}"],
            "dashboard": ["/api/dashboard/stats"],
            "chat": ["/api/chat"]
        }
    }


# 获取用户探索过的所有城市及其坐标
@app.get("/api/dashboard/explored-cities")
async def get_explored_cities(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户探索过的所有城市及其坐标"""
    try:
        # 获取用户去过的所有目的地
        destinations = db.query(
            Trip.destination,
            func.count(Trip.id).label('visit_count')
        ).filter(
            Trip.user_id == current_user.id,
            Trip.status == "completed"
        ).group_by(Trip.destination).all()

        explored_cities = []

        for dest, count in destinations:
            # 使用地图服务获取城市坐标
            geocode_result = map_service.geocode(dest)
            if geocode_result:
                location = geocode_result["location"]
                lng, lat = map(float, location.split(','))

                # 获取这个城市的旅行记录
                city_trips = db.query(Trip).filter(
                    Trip.user_id == current_user.id,
                    Trip.destination == dest
                ).all()

                # 统计这个城市的旅行信息
                total_days = sum(trip.days for trip in city_trips)
                total_spent = sum(float(trip.actual_cost or 0) for trip in city_trips)

                explored_cities.append({
                    "city": dest,
                    "latitude": lat,
                    "longitude": lng,
                    "visit_count": count,
                    "total_days": total_days,
                    "total_spent": total_spent,
                    "first_visit": min(trip.start_date for trip in city_trips if trip.start_date).isoformat() if any(trip.start_date for trip in city_trips) else None,
                    "last_visit": max(trip.start_date for trip in city_trips if trip.start_date).isoformat() if any(trip.start_date for trip in city_trips) else None,
                    "tags": list(set(tag for trip in city_trips if trip.tags for tag in trip.tags))[:5]  # 最多5个标签
                })

        return {
            "success": True,
            "explored_cities": explored_cities,
            "total_cities": len(explored_cities)
        }

    except Exception as e:
        print(f"获取探索城市错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")

# 获取旅行图片库
@app.get("/api/dashboard/trip-images")
async def get_trip_images(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取用户的所有旅行图片"""
    try:
        # 获取所有有图片的旅行记录
        trips_with_images = db.query(Trip).filter(
            Trip.user_id == current_user.id,
            Trip.images.isnot(None)
        ).all()

        all_images = []
        for trip in trips_with_images:
            if trip.images:
                for image_url in trip.images:
                    all_images.append({
                        "url": image_url,
                        "trip_id": trip.id,
                        "trip_name": trip.name,
                        "destination": trip.destination,
                        "upload_date": trip.updated_at.isoformat() if trip.updated_at else trip.created_at.isoformat()
                    })

        # 按上传时间排序（最新的在前）
        all_images.sort(key=lambda x: x["upload_date"], reverse=True)

        return {
            "success": True,
            "images": all_images,
            "total_images": len(all_images)
        }

    except Exception as e:
        print(f"获取旅行图片错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")

# 获取旅行统计数据详情
@app.get("/api/dashboard/stats-details")
async def get_stats_details(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取高阶数据分析 - 修复日期类型错误版"""
    try:
        trips = db.query(Trip).filter(Trip.user_id == current_user.id).all()
        
        # === 1. 基础数据 ===
        total_trips = len(trips)
        if total_trips == 0:
            return {
                "success": True, 
                "empty": True,
                "monthly_frequency": [], "budget_distribution": [], "season_preference": [],
                "advanced_stats": {
                    "travel_dna": [{"subject": "无数据", "A": 0, "fullMark": 100}],
                    "kpi": {}
                }
            }

        total_days = sum((t.days or 0) for t in trips)
        total_spent = sum((t.budget or 0) for t in trips)
        
        # === 2. 规划习惯分析 (核心修复点) ===
        lead_times = []
        for t in trips:
            if t.start_date:
                # 1. 处理 created_at (转为 date)
                if isinstance(t.created_at, str):
                    created = datetime.strptime(t.created_at, "%Y-%m-%d %H:%M:%S").date()
                elif t.created_at:
                    created = t.created_at.date()
                else:
                    created = datetime.utcnow().date()

                # 2. 处理 start_date 
                start = t.start_date
                if isinstance(start, datetime): # 如果是 datetime 对象，取 .date()
                    start = start.date()
                elif isinstance(start, str):    # 如果是字符串，解析后取 .date()
                    try: 
                        # 尝试只解析日期
                        start = datetime.strptime(start, "%Y-%m-%d").date()
                    except:
                        try:
                            # 尝试解析完整时间
                            start = datetime.strptime(start, "%Y-%m-%d %H:%M:%S").date()
                        except:
                            continue # 解析不了就跳过
                
                # 3. 现在的 start 和 created 肯定都是 date 类型了，可以相减
                delta = (start - created).days
                lead_times.append(max(0, delta))
        
        avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0
        
        # === 3. 成本效率分析 ===
        cpppd_list = []
        for t in trips:
            if (t.days or 0) > 0 and (t.people or 0) > 0:
                cpppd = (t.budget or 0) / (t.days * t.people)
                cpppd_list.append(cpppd)
        avg_cpppd = sum(cpppd_list) / len(cpppd_list) if cpppd_list else 0

        # === 4. 地理距离 ===
        home_lat, home_lon = 39.9042, 116.4074 
        total_distance = 0
        for t in trips:
            dist = haversine_distance(home_lat, home_lon, t.latitude, t.longitude)
            total_distance += dist * 2 
        
        # === 5. 人格计算 ===
        unique_cities = len(set(t.destination for t in trips if t.destination))
        score_exploration = min(100, (unique_cities / total_trips) * 100) if total_trips else 0
        score_luxury = min(100, (avg_cpppd / 2000) * 100)
        
        avg_people = sum((t.people or 1) for t in trips) / total_trips
        score_social = min(100, (avg_people / 6) * 100)
        
        score_spontaneity = max(0, 100 - (avg_lead_time / 60 * 100))
        
        avg_days = total_days / total_trips if total_trips else 0
        score_intensity = max(0, min(100, (7 - avg_days) * 20 + 20))

        # === 6. 图表数据查询 ===
        monthly_data = db.query(
            func.strftime('%Y-%m', Trip.start_date).label('month'), 
            func.count(Trip.id).label('trip_count')
        ).filter(
            Trip.user_id == current_user.id, 
            Trip.start_date.isnot(None)
        ).group_by('month').all()
        
        season_stats = db.query(
            case(
                (func.strftime('%m', Trip.start_date).in_(['12', '01', '02']), "冬季"),
                (func.strftime('%m', Trip.start_date).in_(['03', '04', '05']), "春季"),
                (func.strftime('%m', Trip.start_date).in_(['06', '07', '08']), "夏季"),
                (func.strftime('%m', Trip.start_date).in_(['09', '10', '11']), "秋季"),
                else_="未知"
            ).label('season'),
            func.count(Trip.id).label('count')
        ).filter(
            Trip.user_id == current_user.id, 
            Trip.start_date.isnot(None)
        ).group_by('season').all()
        
        budget_stats = db.query(
            case(
                (Trip.budget < 1000, "经济"),
                (Trip.budget < 3000, "适中"),
                else_="豪华"
            ).label('budget_level'),
            func.count(Trip.id).label('count')
        ).filter(
            Trip.user_id == current_user.id
        ).group_by('budget_level').all()

        return {
            "success": True,
            "basic_stats": {
                "total_trips": total_trips,
                "total_days": total_days,
                "total_spent": total_spent,
                "completed_trips": len([t for t in trips if t.status == 'completed'])
            },
            "advanced_stats": {
                "travel_dna": [
                    {"subject": "探索度", "A": int(score_exploration), "fullMark": 100},
                    {"subject": "奢华度", "A": int(score_luxury), "fullMark": 100},
                    {"subject": "社交度", "A": int(score_social), "fullMark": 100},
                    {"subject": "行动力", "A": int(score_spontaneity), "fullMark": 100},
                    {"subject": "特种兵", "A": int(score_intensity), "fullMark": 100},
                ],
                "kpi": {
                    "total_distance_km": int(total_distance),
                    "avg_lead_time_days": int(avg_lead_time),
                    "avg_spend_per_person_day": int(avg_cpppd)
                }
            },
            "monthly_frequency": [{"month": m.month, "trip_count": m.trip_count} for m in monthly_data],
            "budget_distribution": [{"level": b.budget_level, "count": b.count} for b in budget_stats],
            "season_preference": [{"season": s.season, "count": s.count} for s in season_stats]
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ 高阶分析错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"后端计算错误: {str(e)}")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 启动服务器
if __name__ == "__main__":
    import uvicorn
    print("后端服务启动中...")
    print("数据库: wanderai.db")
    print("服务已启动，监听 http://127.0.0.1:8000")
    print("API文档: http://127.0.0.1:8000/docs")

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
