// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  Send, MapPin, Navigation, Loader2, FileText, Printer, X, 
  Settings, Sun, Moon, Globe, Sparkles, Compass, Map as MapIcon,
  LayoutDashboard, Mic, Key, RefreshCw, Home, Users, Wallet,
  Coffee, Camera, Castle, ShoppingBag, Mountain, ShoppingCart,
  TrendingUp, Calendar, Bus, Train, Plane, Hotel, Utensils,
  Clock, Heart, Star, Search, Menu, User, Download, Filter,
  ChevronRight, Calculator, Cloud, CheckCircle, Bell,
  LogIn, LogOut, UserCircle, Award, BarChart3, Plus
} from 'lucide-react';
import remarkGfm from 'remark-gfm';

// 导入组件
import MapModal from './components/MapModal';
import DashboardView from './components/DashboardView';
import WeatherWidget from './components/WeatherWidget';
import BudgetCalculator from './components/BudgetCalculator';
import InteractiveDashboard from './components/InteractiveDashboard';
import TripCard from './components/TripCard';
import LoginModal from './components/LoginModal';
import AddTripModal from './components/AddTripModal';
import { useAuth, AuthProvider } from './contexts/AuthContext';

// 主题配置
const THEMES = {
  light: {
    bg: 'bg-gradient-to-br from-slate-50 to-blue-50',
    card: 'bg-white',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    border: 'border-yellow-200', // 边框也带点黄
    hover: 'hover:bg-yellow-50' // 悬停变淡黄
  },
  dark: {
    // 🔴 深色模式修复：
    // 1. 背景改为深灰渐变，减少割裂感
    bg: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
    // 2. 卡片背景稍微亮一点，形成层级
    card: 'bg-gray-800/80 backdrop-blur-md',
    // 3. 文字改为灰白 (gray-100)，而不是纯白，看起来更舒服
    text: 'text-gray-100', 
    // 4. 次要文字改为浅灰 (gray-400)
    textSecondary: 'text-gray-400',
    // 5. 边框颜色调暗，消除“割裂感”
    border: 'border-gray-700',
    hover: 'hover:bg-gray-700/50'
  }
};

// 兴趣标签
const INTEREST_TAGS = [
  { id: "food", label: "美食探索", icon: <Utensils className="w-4 h-4" />, color: "from-red-500 to-pink-500" },
  { id: "photo", label: "摄影打卡", icon: <Camera className="w-4 h-4" />, color: "from-yellow-500 to-lime-500" },
  { id: "history", label: "历史人文", icon: <Castle className="w-4 h-4" />, color: "from-amber-500 to-orange-500" },
  { id: "nature", label: "自然风光", icon: <Mountain className="w-4 h-4" />, color: "from-green-500 to-emerald-500" },
  { id: "shopping", label: "时尚购物", icon: <ShoppingBag className="w-4 h-4" />, color: "from-pink-500 to-rose-500" },
  { id: "adventure", label: "户外探险", icon: <Mountain className="w-4 h-4" />, color: "from-orange-500 to-amber-500" }
];

function App() {
  // 状态管理
  const [currentView, setCurrentView] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showBudgetCalculator, setShowBudgetCalculator] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [apiConfig, setApiConfig] = useState({ dashscope_key: '', amap_key: '' });
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [showDoc, setShowDoc] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 行程数据
  const [planData, setPlanData] = useState({
    destination: '', 
    days: 3, 
    people: 2,
    budget: '适中',
    tags: [], 
    preferences: ''
  });

  // 聊天历史
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: `🌍 **你好！我是 WanderAI** - 您的智能旅行规划助手

我使用了先进的AI技术，可以：
✅ **实时对话** - 自然语言交流您的旅行想法
✅ **智能规划** - 根据您的需求生成个性化行程  
✅ **工具调用** - 搜索实时地点信息和旅行技巧
✅ **避坑指南** - 分享本地人知道的实用建议

**试试问我**：
• "想去北京玩3天，喜欢美食和历史"
• "上海有什么必去的景点？"
• "帮我规划一个成都周末美食之旅"
• "杭州西湖附近有什么好酒店？"

请直接告诉我您的旅行需求，我会为您详细规划！`,
      timestamp: new Date(),
      model: 'qwen-turbo'
    }
  ]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 使用认证上下文
  const { user, isAuthenticated, login, register, logout } = useAuth();

  // 初始化
  useEffect(() => {
    const savedTheme = localStorage.getItem('wanderai_theme') || 'light';
    setTheme(savedTheme);
    
    const savedConfig = {
      dashscope_key: localStorage.getItem('dashscope_key') || '',
      amap_key: localStorage.getItem('amap_key') || ''
    };
    setApiConfig(savedConfig);
  }, []);

  // 消息滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 切换主题
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('wanderai_theme', newTheme);
  };

  const themeConfig = THEMES[theme];

  // 发送消息
const sendMessage = async () => {
  if (!input.trim() || loading) return;
  
  const userMsg = input;
  setInput('');
  
  // 添加用户消息
  const newUserMessage = {
    role: 'user',
    content: userMsg,
    timestamp: new Date()
  };
  setMessages(prev => [...prev, newUserMessage]);
  
  setLoading(true);
  
  try {
    // ✅ 简单的数据格式
    const requestData = {
      message: userMsg
    };
    
    console.log('发送:', requestData);
    
    // 如果有token就带上，没有就不带
    const token = localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    console.log('收到:', data);
    
    const assistantMessage = {
      role: 'assistant',
      content: data.reply,
      timestamp: new Date(),
      model: data.model || 'qwen-turbo',
      hasTools: data.has_tools || false
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
  } catch (error) {
    console.error('错误:', error);
    
    const assistantMessage = {
      role: 'assistant',
      content: `抱歉，出错了: ${error.message}`,
      timestamp: new Date(),
      isError: true
    };
    setMessages(prev => [...prev, assistantMessage]);
    
  } finally {
    setLoading(false);
  }
};

const sendTestRequest = async () => {
  console.log('=== 开始诊断测试 ===');
  
  try {
    // 测试1：最简单的请求
    const test1 = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "你好",
        session_id: "default"
      })
    });
    console.log('测试1结果:', test1.status, await test1.json());
    
    // 测试2：包含空api_config
    const test2 = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "测试",
        session_id: "default",
        api_config: {}
      })
    });
    console.log('测试2结果:', test2.status, await test2.json());
    
    // 测试3：检查健康端点
    const health = await fetch('http://localhost:8000/api/health');
    console.log('健康检查:', health.status, await health.json());
    
  } catch (error) {
    console.error('诊断测试失败:', error);
  }
  
  console.log('=== 诊断结束 ===');
};
  // 生成行程（使用旧的/generate端点）
  const generatePlan = async () => {
    if (!planData.destination) {
      alert("请填写目的地");
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await axios.post('http://localhost:8000/generate', {
        ...planData,
        origin: planData.origin || '当前城市',
        transport: planData.transport || '公共交通',
        pace: planData.pace || '适中',
        who_with: planData.who_with || '朋友',
        api_config: apiConfig
      });
      
      setGeneratedPlan(response.data.reply);
      setShowPlanModal(false);
      setShowDoc(true);
      
    } catch (error) {
      console.error('生成行程失败:', error);
      
      // 简单行程
      const simplePlan = `# ${planData.destination}旅行计划

## 📋 基本信息
- **目的地**: ${planData.destination}
- **天数**: ${planData.days}天
- **人数**: ${planData.people}人
- **预算**: ${planData.budget}
- **兴趣**: ${planData.tags.join(', ') || '综合旅行'}

## 🗺️ 行程建议
1. **第一天**: 抵达${planData.destination}，入住酒店，熟悉周边环境
2. **第二天**: 参观主要景点，体验当地文化
3. **第三天**: 深入探索特色区域，品尝美食
${planData.days > 3 ? `4. **后续天数**: 根据您的兴趣深入体验` : ''}

## 💰 预算估算
- **住宿**: ¥${Math.round(300 * planData.days * planData.people)}
- **交通**: ¥${Math.round(150 * planData.days * planData.people)}
- **餐饮**: ¥${Math.round(200 * planData.days * planData.people)}
- **其他**: ¥${Math.round(100 * planData.days * planData.people)}
- **总计**: ¥${Math.round(750 * planData.days * planData.people)} (人均¥${Math.round(750 * planData.days)})

## 💡 温馨提示
${planData.preferences || '建议提前预订住宿，查看天气预报，准备好必要的旅行证件。'}

祝您旅途愉快！`;
      
      setGeneratedPlan(simplePlan);
      setShowPlanModal(false);
      setShowDoc(true);
      
    } finally {
      setGenerating(false);
    }
  };

  // 切换标签
  const toggleTag = (tag) => {
    setPlanData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // 保存设置
  const saveSettings = () => {
    localStorage.setItem('dashscope_key', apiConfig.dashscope_key);
    localStorage.setItem('amap_key', apiConfig.amap_key);
    setShowSettings(false);
    alert("系统配置已保存 ✅");
  };

  // 模拟旅行数据（用于未登录状态）
  const demoTrips = [
    {
      id: 1,
      name: '故宫文化探索之旅',
      destination: '北京',
      date: '2024-06-15',
      days: 3,
      people: 2,
      budget: 3500,
      tags: ['历史人文', '美食探索'],
      status: 'completed',
      rating: 4.8
    },
    {
      id: 2,
      name: '外滩夜景摄影行',
      destination: '上海',
      date: '2024-07-20',
      days: 2,
      people: 4,
      budget: 2800,
      tags: ['摄影打卡', '都市夜游'],
      status: 'upcoming'
    },
    {
      id: 3,
      name: '成都美食寻味记',
      destination: '成都',
      date: '2024-08-10',
      days: 4,
      people: 3,
      budget: 4200,
      tags: ['美食探索', '自然风光'],
      status: 'generated'
    }
  ];

  return (
    <div className={`flex h-screen w-full ${themeConfig.bg} ${themeConfig.text} transition-all duration-300 overflow-hidden`}>
      
      {/* 侧边栏 */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 flex flex-col p-4 border-r ${themeConfig.border} backdrop-blur-xl z-20 transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8 mt-2 cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {/* 👇👇👇 换成图片 👇👇👇 */}
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-20 h-20 rounded-xl object-cover shadow-lg shadow-green-500/20 shrink-0" 
          />
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg tracking-tight">途个开心</h1>
              <p className="text-xs text-gray-500 font-medium">智能旅行规划+记录</p>
            </div>
          )}
        </div>

        {/* 用户信息 */}
        {isAuthenticated && user ? (
          <div className="mb-6 px-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-yellow-500/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
              </div>
              {sidebarOpen && (
                <div className="flex-1">
                  <h3 className="font-medium truncate">{user.full_name || user.username}</h3>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {user.level || '探索者'}
                    </span>
                    <span className="text-gray-500">• {user.points || 0} 积分</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* 导航菜单 */}
        <div className="space-y-2 flex-1">
          <button 
            onClick={() => setCurrentView('chat')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${currentView === 'chat' 
              ? 'bg-gradient-to-r from-green-500 to-yellow-500 text-white shadow-lg shadow-green-500/20'
              : `${themeConfig.hover} ${themeConfig.textSecondary}`}`}
          >
            <Navigation className="w-5 h-5" />
            {sidebarOpen && <span>智能规划</span>}
          </button>
          
          <button 
            onClick={() => {
              if (isAuthenticated) {
                setCurrentView('dashboard');
              } else {
                setShowLoginModal(true);
              }
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${currentView === 'dashboard' 
              ? 'bg-gradient-to-r from-green-600 to-indigo-600 text-white shadow-lg' 
              : `${themeConfig.hover} ${themeConfig.textSecondary}`}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>旅行看板</span>}
          </button>
          
          <button 
            onClick={() => setShowMapModal(true)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${themeConfig.hover} ${themeConfig.textSecondary}`}
          >
            <MapIcon className="w-5 h-5" />
            {sidebarOpen && <span>旅行地图</span>}
          </button>
          
          <button 
            onClick={() => setShowBudgetCalculator(true)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${themeConfig.hover} ${themeConfig.textSecondary}`}
          >
            <Calculator className="w-5 h-5" />
            {sidebarOpen && <span>预算计算</span>}
          </button>

          {/* 添加旅行记录按钮 */}
          {isAuthenticated && (
            <button 
              onClick={() => setShowAddTripModal(true)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${themeConfig.hover} ${themeConfig.textSecondary}`}
            >
              <Plus className="w-5 h-5" />
              {sidebarOpen && <span>记录旅行</span>}
            </button>
          )}
        </div>

        {/* 底部设置 */}
        <div className="mt-auto space-y-2">
          {isAuthenticated ? (
            <button 
              onClick={logout}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${themeConfig.hover}`}
            >
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <span>退出登录</span>}
            </button>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${themeConfig.hover}`}
            >
              <LogIn className="w-5 h-5" />
              {sidebarOpen && <span>登录/注册</span>}
            </button>
          )}
          
          <button 
            onClick={() => changeTheme(theme === 'light' ? 'dark' : 'light')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${themeConfig.hover}`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {sidebarOpen && <span>切换主题</span>}
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${themeConfig.hover}`}
          >
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>系统设置</span>}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <div className={`flex-shrink-0 px-6 py-4 border-b ${themeConfig.border} backdrop-blur-md flex justify-between items-center`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg">
              {currentView === 'dashboard' ? '旅行数据分析看板' : '智能旅行规划'}
            </h2>
            {isAuthenticated && (
              <span className="text-sm px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 text-white">
                {user.level || '探索者'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 天气开关 */}
            <button 
              onClick={() => setShowWeather(!showWeather)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showWeather ? 'bg-green-500 text-white' : 'bg-gray-100 dark:text-white'}`}
            >
              <Cloud className="w-4 h-4" />
              <span className="hidden md:inline">天气</span>
            </button>
            
            {/* 快捷按钮 */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowMapModal(true)}
                className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 text-white hover:opacity-90"
                title="打开地图"
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowPlanModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-lime-500 to-yellow-500 text-white rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">定制攻略</span>
              </button>
            </div>
          </div>
        </div>

        {/* 天气组件 */}
        {showWeather && <WeatherWidget theme={theme} />}

        {/* 主内容 */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'dashboard' ? (
            // 仪表板视图
            isAuthenticated ? (
              <InteractiveDashboard theme={theme} user={user} />
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center">
                    <UserCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">登录查看个人旅行数据</h3>
                  <p className="text-gray-500 dark:text-white mb-6">
                    登录后可以查看您的旅行统计、记录新的旅程，并获得个性化推荐
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-medium hover:opacity-90"
                  >
                    立即登录
                  </button>
                </div>
              </div>
            )
          ) : (
            // 聊天视图
            <div className="h-full flex flex-col md:flex-row">
              {/* 聊天主面板 */}
              <div className="flex-1 flex flex-col">
                {/* 聊天头部 */}
                <div className={`p-4 border-b ${themeConfig.border} flex justify-between items-center`}>
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      <span className="bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent">
                        WanderAI 助手
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        在线
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-white">
                      {isAuthenticated ? `欢迎回来，${user.username}！` : '随时为您提供旅行建议'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isAuthenticated && (
                      <button 
                        onClick={() => setShowLoginModal(true)}
                        className="px-3 py-1 text-sm bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg hover:opacity-90"
                      >
                        登录获取个性化建议
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setMessages([{
                        role: 'assistant',
                        content: `🌍 **你好！我是 WanderAI** - 您的智能旅行规划助手

聊天记录已清空，开始新的对话吧！`,
                        timestamp: new Date(),
                        model: 'qwen-turbo'
                      }])}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="清空聊天"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 聊天内容 */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' 
                        ? 'bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-tr-none' 
                        : `${themeConfig.card} border ${themeConfig.border} rounded-tl-none shadow-sm`} ${msg.isError ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ''} ${msg.isTip ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : ''}`}>
                        
                        {/* 消息头部 */}
                        <div className="flex items-center gap-2 mb-2">
                          {msg.role === 'assistant' && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${msg.isError ? 'bg-red-500' : msg.isTip ? 'bg-yellow-500' : 'bg-gradient-to-br from-green-500 to-yellow-500'}`}>
                              {msg.isError ? <X className="w-3 h-3 text-white" /> : 
                               msg.isTip ? <Bell className="w-3 h-3 text-white" /> : 
                               <Globe className="w-3 h-3 text-white" />}
                            </div>
                          )}
                          <span className="text-sm font-medium">
                            {msg.role === 'user' ? '您' : 
                             msg.isError ? '系统提示' : 
                             msg.isTip ? '温馨提示' : 'WanderAI'}
                          </span>
                          
                          {/* 显示模型信息 */}
                          {msg.model && !msg.isError && !msg.isTip && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-green-600 dark:text-blue-400">
                              {msg.model}
                            </span>
                          )}
                          
                          <span className="text-xs text-gray-400 ml-auto">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        {/* 消息内容 */}
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                          {msg.content}
                        </ReactMarkdown>
                        
                        {/* 显示工具使用状态 */}
                        {msg.hasTools && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            <span>已调用实时数据查询</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex gap-2 items-center text-gray-400 text-sm ml-12">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 正在思考...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 聊天输入 */}
                <div className={`p-4 border-t ${themeConfig.border} ${themeConfig.card}`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 flex items-center gap-2 p-2 rounded-xl border ${themeConfig.border} bg-white/50 dark:bg-gray-800/50`}>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder={isAuthenticated ? `向${user.username || 'AI'}提问...` : "输入你的旅行想法..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm px-2"
                      />
                    </div>
                    
                    <button 
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className="p-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* 快捷提示 */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['北京三日游攻略', '上海美食推荐', '帮我规划成都行程', '预算5000能去哪玩'].map((tip, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(tip);
                          // 自动发送
                          setTimeout(() => sendMessage(), 100);
                        }}
                        className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-green-600 dark:text-blue-400 hover:from-blue-200 hover:to-purple-200 dark:hover:from-blue-800/50 dark:hover:to-purple-800/50 transition-all duration-200 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右侧边栏 */}
              <div className="w-80 flex-shrink-0 border-l ${themeConfig.border} hidden lg:flex flex-col p-4 space-y-6 overflow-y-auto">
                {/* 快速规划卡片 */}
                <div className={`p-4 rounded-xl ${themeConfig.card} border ${themeConfig.border} shadow-sm`}>
                  <h4 className="font-bold mb-3">快速开始</h4>
                  <div className="space-y-3">
                    {['北京', '上海', '成都', '广州'].map((city) => (
                      <button
                        key={city}
                        onClick={() => setPlanData(prev => ({ ...prev, destination: city }))}
                        className="w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
                      >
                        <span className="font-medium">{city}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 兴趣标签 */}
                <div className={`p-4 rounded-xl ${themeConfig.card} border ${themeConfig.border} shadow-sm`}>
                  <h4 className="font-bold mb-3">旅行兴趣</h4>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_TAGS.map(tag => (
                      <button 
                        key={tag.id}
                        onClick={() => toggleTag(tag.label)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1 ${
                          planData.tags.includes(tag.label)
                            ? `bg-gradient-to-r ${tag.color} text-white border-transparent`
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        {tag.icon} {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 旅行记录预览 */}
                {!isAuthenticated && (
                  <div className={`p-4 rounded-xl ${themeConfig.card} border ${themeConfig.border} shadow-sm`}>
                    <h4 className="font-bold mb-3">旅行记录示例</h4>
                    <div className="space-y-3">
                      {demoTrips.slice(0, 2).map(trip => (
                        <div key={trip.id} className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{trip.destination}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {trip.status === 'completed' ? '已完成' : 
                               trip.status === 'upcoming' ? '待出行' : '已生成'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{trip.days}天 • ¥{trip.budget}</p>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="w-full p-2 text-sm bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg hover:opacity-90"
                      >
                        登录查看完整记录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 模态框组件 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {}}
      />

      <AddTripModal
  isOpen={showAddTripModal}
  onClose={() => setShowAddTripModal(false)}
  onSuccess={() => {
    setShowAddTripModal(false);
    // 刷新页面或更新数据
    if (currentView === 'dashboard') {
      // 可以重新获取数据而不是刷新整个页面
      console.log('旅行记录创建成功，可以刷新仪表板数据');
    }
  }}
/>

      <MapModal 
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        theme={theme}
        apiConfig={apiConfig}
      />

      <BudgetCalculator 
        isOpen={showBudgetCalculator}
        onClose={() => setShowBudgetCalculator(false)}
        theme={theme}
        planData={planData}
        onCalculate={(budget) => setPlanData(prev => ({ ...prev, budget }))}
      />

      {/* 设置模态框 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${themeConfig.card} border ${themeConfig.border}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">系统设置</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            {/* API设置 */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">DashScope Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                  <input 
                    type="password" 
                    value={apiConfig.dashscope_key} 
                    onChange={e => setApiConfig({...apiConfig, dashscope_key: e.target.value})} 
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent`} 
                    placeholder="阿里大模型API Key"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">AMap Key</label>
                <div className="relative">
                  <MapIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400"/>
                  <input 
                    type="password" 
                    value={apiConfig.amap_key} 
                    onChange={e => setApiConfig({...apiConfig, amap_key: e.target.value})} 
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent`}
                    placeholder="高德地图API Key"
                  />
                </div>
              </div>
              <button 
                onClick={saveSettings}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-bold mt-4 hover:opacity-90 transition-opacity"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 行程规划模态框 */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl ${themeConfig.card} border ${themeConfig.border}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-yellow-500 bg-clip-text text-transparent">
                  定制专属旅程
                </h2>
                <p className="text-sm text-gray-500 mt-1">填写基本信息，AI为您生成行程</p>
              </div>
              <button onClick={() => setShowPlanModal(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600"/>
              </button>
            </div>

            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-2 block">目的地</label>
                  <input 
                    value={planData.destination} 
                    onChange={e => setPlanData({...planData, destination: e.target.value})} 
                    className={`w-full p-3 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent`} 
                    placeholder="例如：北京"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">游玩天数</label>
                  <select 
                    value={planData.days} 
                    onChange={e => setPlanData({...planData, days: parseInt(e.target.value)})} 
                    className={`w-full p-3 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent`}
                  >
                    {[1,2,3,4,5,6,7].map(day => (
                      <option key={day} value={day}>{day}天</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">同行人数</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={planData.people} 
                    onChange={e => setPlanData({...planData, people: parseInt(e.target.value) || 2})} 
                    className={`w-full p-3 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent`} 
                  />
                </div>
              </div>

              {/* 兴趣标签 */}
              <div>
                <label className="text-sm font-medium mb-3 block">旅行兴趣</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map(tag => (
                    <button 
                      key={tag.id}
                      onClick={() => toggleTag(tag.label)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2 ${
                        planData.tags.includes(tag.label)
                          ? `bg-gradient-to-r ${tag.color} text-white border-transparent shadow-lg`
                          : `${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'} hover:border-blue-300`
                      }`}
                    >
                      {tag.icon} {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 预算水平 */}
              <div>
                <label className="text-sm font-medium mb-2 block">预算水平</label>
                <div className="flex gap-2">
                  {['经济', '适中', '豪华'].map(level => (
                    <button
                      key={level}
                      onClick={() => setPlanData(prev => ({ ...prev, budget: level }))}
                      className={`flex-1 py-2 rounded-lg border ${themeConfig.border} ${planData.budget === level ? 'bg-green-500 text-white border-green-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* 特殊要求 */}
              <div>
                <label className="text-sm font-medium mb-2 block">特殊要求</label>
                <textarea 
                  value={planData.preferences}
                  onChange={e => setPlanData({...planData, preferences: e.target.value})}
                  className={`w-full p-4 rounded-lg border ${themeConfig.border} outline-none focus:ring-2 focus:ring-green-500 bg-transparent h-24 resize-none`}
                  placeholder="例如：想吃辣的，不要太累..."
                />
              </div>

              <button 
                onClick={generatePlan}
                disabled={generating}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-70 disabled:scale-100 flex justify-center items-center gap-2"
              >
                {generating ? <Loader2 className="animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                {generating ? 'AI 正在生成中...' : '生成行程'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生成的文档视图 */}
      {showDoc && generatedPlan && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom-10">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 print:hidden">
            <h2 className="font-bold text-lg flex gap-2 items-center">
              <FileText className="text-green-600 dark:text-blue-400"/> 
              行程预览
            </h2>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="px-4 py-2 bg-green-600 text-white rounded-lg flex gap-2 items-center hover:bg-blue-700">
                <Printer className="w-4 h-4"/> 
                打印
              </button>
              <button onClick={() => setShowDoc(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                <X className="w-4 h-4"/> 
                关闭
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
            <article className="prose prose-lg max-w-none prose-blue dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generatedPlan}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

// 包装在AuthProvider中的App组件
const AppWithAuth = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;
