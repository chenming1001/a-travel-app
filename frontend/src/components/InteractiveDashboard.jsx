// frontend/src/components/InteractiveDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, MapPin, DollarSign, Calendar, 
  Star, Clock, BarChart3, PieChart, Download,
  Eye, EyeOff, RefreshCw, ChevronRight, ChevronLeft,
  Heart, Share2, Award, FileText, X, Filter,
  Plus, Edit, Trash2, Navigation, MoreVertical,
  CheckCircle, XCircle, Clock as ClockIcon,
  TrendingUp as TrendingUpIcon, Target, Zap, Globe,
  Search, User, AlertCircle, Image as ImageIcon,
  ChevronDown, ExternalLink, Layers, Compass,
  Thermometer, Wind, Cloud, Sun, Moon,
  Hash, Tag as TagIcon, TrendingDown, BarChart,
  Smartphone, Tablet, Monitor, MousePointer,
  Maximize2, Minimize2, Grid, List, Settings,
  Bell, MessageSquare, ThumbsUp, Star as StarIcon,
  Award as AwardIcon, Trophy, Medal, Crown,
  Shield, Lock, Unlock, Key, LogOut,
  Menu, Home, Folder, Bookmark, Inbox,
  BellRing, Mail, Phone, Video, Camera,
  Music, Play, Pause,  SkipBack,
  SkipForward, Volume2, VolumeX, Headphones,
  Radio, Tv, Film, VideoOff, Youtube,
  Instagram, Facebook, Twitter, Linkedin,
  Github, Gitlab, GitBranch, GitPullRequest,
  GitCommit, GitMerge, GitCompare, GitFork
} from 'lucide-react';
import axios from 'axios';
import AddTripModal from './AddTripModal';
import TripDetailModal from './TripDetailModal';
import ExploredCitiesMap from './ExploredCitiesMap';
import TripGallery from './TripGallery';
import StatsDetailModal from './StatsDetailModal';
import { useAuth } from '../contexts/AuthContext';
import DataAnalysisModal from './DataAnalysisModal';
const InteractiveDashboard = ({ theme, user }) => {
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showTripDetail, setShowTripDetail] = useState(null);
  const [showCitiesMap, setShowCitiesMap] = useState(false);
  const [showTripGallery, setShowTripGallery] = useState(false);
  const [showStatsDetail, setShowStatsDetail] = useState(false);
  const [showWeatherWidget, setShowWeatherWidget] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [selectedTripForEdit, setSelectedTripForEdit] = useState(null);

  const { isAuthenticated, logout } = useAuth();
  const [analysisType, setAnalysisType] = useState('trips'); // 默认 trips
  const openAnalysis = (type) => {
  setAnalysisType(type);
  setShowStatsDetail(true);
};

  // 模拟通知数据
  const mockNotifications = [
    {
      id: 1,
      type: 'achievement',
      title: '🎉 旅行达人成就解锁',
      message: '恭喜您完成了第10次旅行！获得"旅行达人"徽章',
      time: '2小时前',
      read: false
    },
    {
      id: 2,
      type: 'recommendation',
      title: '🌿 春季旅行推荐',
      message: '基于您的旅行历史，为您推荐桂林春季旅行路线',
      time: '1天前',
      read: false
    },
    {
      id: 3,
      type: 'reminder',
      title: '⏰ 旅行计划提醒',
      message: '您的"成都美食之旅"计划于3天后开始',
      time: '2天前',
      read: true
    },
    {
      id: 4,
      type: 'system',
      title: '🔄 系统更新',
      message: '旅行地图功能已升级，新增3D视图模式',
      time: '3天前',
      read: true
    }
  ];
  
  // 模拟推荐数据
  const mockRecommendations = [
    {
      id: 1,
      type: 'destination',
      title: '🌸 春季赏花之旅',
      description: '根据您喜欢自然风光的偏好，推荐您前往婺源、林芝或武汉大学赏花',
      reason: '基于您的兴趣标签：自然风光、摄影打卡',
      priority: 'high',
      tags: ['春季限定', '摄影圣地', '自然风光']
    },
    {
      id: 2,
      type: 'timing',
      title: '🎯 最佳出行时间',
      description: '数据显示您在秋季的旅行频率最高，建议规划秋季出行',
      reason: '您的秋季旅行完成率比其他季节高40%',
      priority: 'medium',
      tags: ['时间优化', '数据分析']
    },
    {
      id: 3,
      type: 'budget',
      title: '💰 预算优化建议',
      description: '您的豪华旅行占比偏高，尝试经济型旅行可节省30%预算',
      reason: '消费分析：豪华旅行占比60%，经济旅行占比20%',
      priority: 'high',
      tags: ['省钱技巧', '预算管理']
    },
    {
      id: 4,
      type: 'destination',
      title: '🏞️ 未探索的新目的地',
      description: '您还未探索西北地区，推荐青海湖、敦煌、喀纳斯等地',
      reason: '基于您的旅行足迹和偏好匹配度',
      priority: 'medium',
      tags: ['新目的地', '文化体验']
    }
  ];

  // 模拟天气数据
  const mockWeatherData = {
    current: {
      temperature: 22,
      condition: '晴天',
      humidity: 65,
      windSpeed: 12,
      icon: '☀️',
      feelsLike: 24
    },
    forecast: [
      { day: '今天', high: 25, low: 18, condition: '晴天', icon: '☀️' },
      { day: '明天', high: 24, low: 17, condition: '多云', icon: '⛅' },
      { day: '后天', high: 23, low: 16, condition: '小雨', icon: '🌧️' },
      { day: '周日', high: 21, low: 15, condition: '多云', icon: '⛅' },
      { day: '周一', high: 22, low: 16, condition: '晴天', icon: '☀️' }
    ]
  };

  // 加载数据
  const loadDashboardData = async () => {
    if (!isAuthenticated) {
      console.log('未登录，不加载数据');
      return;
    }
    
    setLoading(true);
    setError(null);
    setDebugInfo('开始加载数据...');
    
    try {
      // 获取认证令牌
      const token = localStorage.getItem('access_token');
      console.log('🔐 当前用户token:', token ? '有' : '无');
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // 1. 加载统计数据
      console.log('📊 请求仪表板统计...');
      const statsRes = await axios.get('http://localhost:8000/api/dashboard/stats', config);
      console.log('📊 统计数据响应:', statsRes.data);
      setStats(statsRes.data);
      
      // 2. 加载行程
      console.log('🗺️ 请求旅行数据...');
      const tripsRes = await axios.get('http://localhost:8000/api/trips', config);
      console.log('🗺️ 旅行数据完整响应:', tripsRes);
      console.log('🗺️ 旅行数据内容:', tripsRes.data);
      
      // 处理不同的响应结构
      let tripsData = [];
      if (tripsRes.data) {
        // 情况1: 有 success 字段和 trips 数组
        if (tripsRes.data.success !== undefined && tripsRes.data.trips) {
          tripsData = tripsRes.data.trips;
          console.log('✅ 从 success.trips 获取数据，数量:', tripsData.length);
        }
        // 情况2: 直接就是 trips 数组
        else if (Array.isArray(tripsRes.data.trips)) {
          tripsData = tripsRes.data.trips;
          console.log('✅ 从 response.data.trips 获取数据，数量:', tripsData.length);
        }
        // 情况3: 响应本身就是数组
        else if (Array.isArray(tripsRes.data)) {
          tripsData = tripsRes.data;
          console.log('✅ 响应本身就是数组，数量:', tripsData.length);
        }
        // 情况4: 有 trips 字段但结构不同
        else if (tripsRes.data.trips && typeof tripsRes.data.trips === 'object') {
          tripsData = Object.values(tripsRes.data.trips);
          console.log('✅ 转换对象为数组，数量:', tripsData.length);
        }
      }
      
      console.log('🎯 最终设置的 trips 数据:', tripsData);
      setTrips(tripsData);
      
      // 3. 加载通知和推荐（模拟数据）
      setNotifications(mockNotifications);
      setRecommendations(mockRecommendations);
      setWeatherData(mockWeatherData);
      
      setDebugInfo(`加载完成：${tripsData.length} 条旅行记录`);
      
    } catch (error) {
      console.error('❌ 加载数据失败详情:', error);
      console.error('❌ 错误响应:', error.response?.data);
      console.error('❌ 错误状态:', error.response?.status);
      
      let errorMessage = '加载数据失败，请稍后重试';
      if (error.response?.status === 401) {
        errorMessage = '登录已过期，请重新登录';
      } else if (error.response?.data?.detail) {
        errorMessage = `加载失败: ${error.response.data.detail}`;
      }
      
      setError(errorMessage);
      setDebugInfo(`错误：${errorMessage}`);
      
      // 设置默认值避免后续错误
      setTrips([]);
      setStats({
        total_trips: 0,
        completed_trips: 0,
        total_spent: 0,
        explored_cities: 0,
        total_days: 0,
        popular_tags: [],
        monthly_trend: [0,0,0,0,0,0,0,0,0,0,0,0],
        trending_destinations: [],
        user_insights: []
      });
      
      // 使用模拟数据
      setNotifications(mockNotifications);
      setRecommendations(mockRecommendations);
      setWeatherData(mockWeatherData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 InteractiveDashboard 组件加载');
    console.log('🔐 认证状态:', isAuthenticated);
    console.log('🔄 刷新key:', refreshKey);
    
    if (isAuthenticated) {
      loadDashboardData();
    } else {
      setLoading(false);
      setTrips([]);
      setStats(null);
    }
  }, [isAuthenticated, refreshKey]);

  // 添加旅行记录
  const handleAddTrip = () => {
    setShowAddTripModal(true);
  };

  // 处理旅行记录创建成功
  const handleTripAdded = () => {
    console.log('🎉 旅行记录创建成功，刷新数据...');
    setRefreshKey(prev => prev + 1);
    setShowAddTripModal(false);
    window.location.reload();
    // 添加通知
    const newNotification = {
      id: Date.now(),
      type: 'success',
      title: '✅ 旅行记录已创建',
      message: '您的旅行记录已成功保存，可以在仪表板中查看',
      time: '刚刚',
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  // 删除旅行记录
  const handleDeleteTrip = async (tripId) => {
    if (window.confirm('确定要删除这个旅行记录吗？删除后无法恢复。')) {
      try {
        const token = localStorage.getItem('access_token');
        await axios.delete(`http://localhost:8000/api/trips/${tripId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setRefreshKey(prev => prev + 1);
        console.log('🗑️ 删除成功，刷新数据');
        
        // 添加通知
        const newNotification = {
          id: Date.now(),
          type: 'warning',
          title: '🗑️ 旅行记录已删除',
          message: '旅行记录已成功删除',
          time: '刚刚',
          read: false
        };
        setNotifications(prev => [newNotification, ...prev]);
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  // 更新旅行状态
  const handleUpdateStatus = async (tripId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`http://localhost:8000/api/trips/${tripId}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setRefreshKey(prev => prev + 1);
      console.log('🔄 状态更新成功，刷新数据');
      
      // 添加通知
      const statusText = newStatus === 'completed' ? '已完成' : 
                       newStatus === 'ongoing' ? '进行中' : '计划中';
      const newNotification = {
        id: Date.now(),
        type: 'info',
        title: `📝 状态已更新`,
        message: `旅行状态已更新为"${statusText}"`,
        time: '刚刚',
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  // 标记通知为已读
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // 清除所有通知
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // 获取未读通知数量
  const getUnreadNotificationsCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // 快速操作函数
  const quickActions = [
    {
      id: 'export',
      label: '导出数据',
      icon: <Download className="w-4 h-4" />,
      action: () => {
        alert('数据导出功能开发中...');
      }
    },
    {
      id: 'print',
      label: '打印报告',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        window.print();
      }
    },
    {
      id: 'share',
      label: '分享仪表板',
      icon: <Share2 className="w-4 h-4" />,
      action: () => {
        alert('分享功能开发中...');
      }
    },
    {
      id: 'settings',
      label: '个性化设置',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        alert('设置功能开发中...');
      }
    }
  ];

  const filteredTrips = Array.isArray(trips) ? trips.filter(trip => {
    if (!trip || typeof trip !== 'object') return false;
    
    // 状态过滤
    if (activeTab !== 'all' && trip.status !== activeTab) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const name = trip.name ? trip.name.toLowerCase() : '';
      const destination = trip.destination ? trip.destination.toLowerCase() : '';
      
      // 安全地处理 tags，防止 tags 为 null 时报错
      const hasTag = Array.isArray(trip.tags) && trip.tags.some(tag => 
        tag && tag.toString().toLowerCase().includes(searchLower)
      );
      
      return name.includes(searchLower) || destination.includes(searchLower) || hasTag;
    }
    
    return true;
  }) : [];

  console.log('📋 过滤后的 trips:', {
    原始数据条数: trips.length,
    过滤条件: { activeTab, searchTerm },
    过滤后条数: filteredTrips.length,
    过滤后的数据: filteredTrips
  });

  // 如果未登录
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">请登录查看个人旅行数据</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            登录后可以查看您的旅行统计、记录新的旅程，并获得个性化推荐
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-medium hover:opacity-90"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  // 如果正在加载
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载数据中...</p>
          {debugInfo && <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>}
        </div>
      </div>
    );
  }

  // 如果有错误
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">加载失败</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          {debugInfo && <p className="text-sm text-gray-500 mb-4">{debugInfo}</p>}
          <div className="flex gap-3">
            <button
              onClick={loadDashboardData}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg hover:opacity-90"
            >
              重试
            </button>
            <button
              onClick={logout}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:opacity-90"
            >
              重新登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-yellow-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span>
              我的旅行看板
              <span className="block text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                已记录 {stats?.total_trips || 0} 次旅行 • 累计 {stats?.total_days || 0} 天
                {user?.points !== undefined ? ` • ${user.points} 积分` : ''}
              </span>
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 通知按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 relative"
              title="通知"
            >
              <Bell className="w-4 h-4" />
              {getUnreadNotificationsCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getUnreadNotificationsCount()}
                </span>
              )}
            </button>
            
            {/* 通知下拉菜单 */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 shadow-2xl z-50">
                <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                  <h3 className="font-bold">通知中心</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      清除全部
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">暂无通知</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                            ${notification.type === 'achievement' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                              notification.type === 'recommendation' ? 'bg-green-100 dark:bg-green-900/30' :
                              notification.type === 'reminder' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              notification.type === 'warning' ? 'bg-red-100 dark:bg-red-900/30' :
                              'bg-gray-100 dark:bg-gray-800'}`}>
                            {notification.type === 'achievement' ? '🏆' :
                             notification.type === 'recommendation' ? '💡' :
                             notification.type === 'reminder' ? '⏰' :
                             notification.type === 'warning' ? '⚠️' : 'ℹ️'}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* 快速操作按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="快速操作"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {/* 快速操作菜单 */}
            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 shadow-2xl z-50">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action();
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {action.icon}
                    </div>
                    <span className="text-sm">{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* 搜索框 */}
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            <input
              type="text"
              placeholder="搜索旅行 / 标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-48 focus:w-64 focus:ring-2 focus:ring-green-500 transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')} // 清空搜索词，列表就会自动恢复显示全部
                className="absolute right-2 top-2.5 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all"
                title="清除搜索"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* 刷新按钮 */}
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* 强制刷新按钮 */}
          <button
            onClick={() => {
              console.log('手动刷新数据');
              setRefreshKey(prev => prev + 1);
            }}
            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-green-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50"
            title="强制刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* 添加旅行按钮 */}
          <button
            onClick={handleAddTrip}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg flex items-center gap-2 hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            记录旅行
          </button>
        </div>
      </div>

      

      {/* 统计卡片 - 交互式 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 总旅行次数卡片 */}
        {/* 1. 总旅行次数卡片 - 修改为打开分析弹窗 */}
        <div 
          className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl p-5 md:p-6 border dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={() => openAnalysis('trips')}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-500 dark:text-white text-sm">总旅行次数</p>
                {/* 修改提示文字 */}
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-white rounded-full">
                  点击查看分析
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mt-2 text-gray-800 dark:text-white">{stats?.total_trips || 0}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-full bg-gray-200 dark:text-white rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ 
                      width: `${Math.min(
                        (stats?.completed_trips || 0) / Math.max(stats?.total_trips || 1, 1) * 100, 
                        100
                      )}%` 
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">
                  {stats?.completed_trips || 0} 次已完成
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:text-white flex items-center justify-center group-hover:scale-110 transition-transform">
      <FileText className="w-5 h-5 text-green-600 dark:text-white" />
    </div>
          </div>
        </div>

        {/* 探索城市卡片 */}
        <div 
          className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/10 rounded-2xl p-5 md:p-6 border dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={() => setShowCitiesMap(true)}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-500 dark:text-gray-400 text-sm">探索城市</p>
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 dark:text-purple-400 rounded-full">
                  点击查看地图
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats?.explored_cities || 0}</p>
              <div className="mt-3">
                <p className="text-xs text-gray-500 group-hover:text-yellow-500 dark:group-hover:text-purple-400 transition-colors">
                  热门: {stats?.trending_destinations?.[0]?.city || '--'} 
                  ({stats?.trending_destinations?.[0]?.count || 0}次)
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* 累计花费卡片 */}
        <div 
          className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl p-5 md:p-6 border dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={() => openAnalysis('cost')}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-500 dark:text-gray-400 text-sm">累计花费</p>
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-full">
                  点击查看分析
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mt-2">
                ¥{stats?.total_spent ? Math.round(stats.total_spent).toLocaleString() : '0'}
              </p>
              <div className="mt-3">
                <p className="text-xs text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  平均 ¥{stats?.total_spent && stats.completed_trips 
                    ? Math.round(stats.total_spent / Math.max(stats.completed_trips, 1)).toLocaleString() 
                    : '0'}/次
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        {/* 总旅行天数卡片 */}
        {/* 4. 总旅行天数卡片 - 修改为打开分析弹窗 */}
        <div 
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl p-5 md:p-6 border dark:border-gray-700 cursor-pointer hover:shadow-lg transition-all duration-300 group"
          onClick={() => openAnalysis('days')}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-500 dark:text-gray-400 text-sm">总旅行天数</p>
                {/* 修改提示文字 */}
                <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full">
                  点击查看分析
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats?.total_days || 0}</p>
              <div className="mt-3">
                <p className="text-xs text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  平均 {stats?.total_days && stats.total_trips 
                    ? (stats.total_days / Math.max(stats.total_trips, 1)).toFixed(1) 
                    : '0'} 天/次
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 标签和洞察 - 交互式 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 热门标签 */}
        <div className="p-5 md:p-6 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800/50 flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            {stats?.popular_tags && stats.popular_tags.length > 0 ? '我的常去标签' : '热门旅行话题'}
          </h2>
          
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              {(stats?.popular_tags && stats.popular_tags.length > 0 
                ? stats.popular_tags 
                : ['美食探店', '自然风光', '海岛度假', '古镇漫游', '特种兵旅游', '亲子时光', '自驾游', '人文历史']
              ).map((tag, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchTerm(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-1
                    ${stats?.popular_tags && stats.popular_tags.length > 0
                      ? 'bg-gradient-to-r from-green-500 to-yellow-500 text-white' // 用户标签用深色渐变
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-green-600' // 默认标签用浅色样式
                    }`}
                >
                  <TagIcon className="w-3 h-3" />
                  #{tag}
                </button>
              ))}
            </div>
            
            {(!stats?.popular_tags || stats.popular_tags.length === 0) && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                暂无个人数据，以上为推荐话题。记录旅行时添加标签，这里将生成您的专属偏好。
              </p>
            )}
          </div>
        </div>

        {/* 用户洞察 */}
        <div className="p-5 md:p-6 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              个性化洞察
            </h2>
            <button
              onClick={() => setShowStatsDetail(true)}
              className="text-xs px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full hover:opacity-90"
            >
              详细分析
            </button>
          </div>
          <div className="space-y-3">
            {stats?.user_insights && stats.user_insights.length > 0 ? (
              stats.user_insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-yellow-500/5 border border-green-500/10 hover:border-green-500/30 transition-all cursor-pointer group"
                  onClick={() => {
                    // 根据洞察内容进行相应操作
                    if (insight.includes('城市')) {
                      setShowCitiesMap(true);
                    } else if (insight.includes('花费')) {
                      setShowStatsDetail(true);
                    }
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center shrink-0">
                    <Star className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm group-hover:text-green-600 dark:group-hover:text-blue-400 transition-colors">
                    {insight}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 ml-auto" />
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  记录更多旅行获得个性化洞察
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 旅行足迹 */}
        <div className="p-5 md:p-6 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-500" />
              旅行足迹
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTripGallery(true)}
                className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:opacity-90"
              >
                查看相册
              </button>
              <button
                onClick={() => setShowCitiesMap(true)}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:opacity-90"
              >
                查看地图
              </button>
            </div>
          </div>
          <div 
            className="h-48 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowCitiesMap(true)}
          >
            <div className="text-center">
              <div className="relative">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {stats?.explored_cities || 0}
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                已探索 {stats?.explored_cities || 0} 个城市
              </p>
              {stats?.trending_destinations?.[0] && (
                <p className="text-sm text-gray-500 mt-1">
                  最爱: {stats.trending_destinations[0].city}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 旅行记录 - 交互式 */}
      <div className="p-5 md:p-6 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold">旅行记录</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              管理您的旅行计划、进行中和已完成的旅行
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 视图模式切换 */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                title="网格视图"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
                title="列表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* 标签过滤 */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {['all', 'planned', 'ongoing', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`px-3 py-1 rounded-md text-sm transition-all ${activeTab === status 
                    ? 'bg-white dark:bg-gray-700 shadow-md' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {status === 'all' ? '全部' :
                   status === 'planned' ? '计划中' :
                   status === 'ongoing' ? '进行中' : '已完成'}
                </button>
              ))}
            </div>
            
            <span className="text-sm text-gray-500">
              共 {filteredTrips.length} 条记录
              {trips.length !== filteredTrips.length && `（从${trips.length}条中过滤）`}
            </span>
          </div>
        </div>
        
        {filteredTrips.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map(trip => (
                <TripCardGrid 
                  key={trip.id}
                  trip={trip}
                  onViewDetail={() => setShowTripDetail(trip)}
                  onUpdateStatus={(newStatus) => handleUpdateStatus(trip.id, newStatus)}
                  onDelete={() => handleDeleteTrip(trip.id)}
                  onEdit={() => setSelectedTripForEdit(trip)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map(trip => (
                <TripCardList 
                  key={trip.id}
                  trip={trip}
                  onViewDetail={() => setShowTripDetail(trip)}
                  onUpdateStatus={(newStatus) => handleUpdateStatus(trip.id, newStatus)}
                  onDelete={() => handleDeleteTrip(trip.id)}
                  onEdit={() => setSelectedTripForEdit(trip)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500/10 to-yellow-500/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? '没有找到匹配的旅行记录' : '暂无旅行记录'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? '尝试其他搜索词' : '点击"记录旅行"开始您的第一段旅程！'}
            </p>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <p>原始数据: {trips.length} 条记录</p>
              <p>当前筛选: {activeTab !== 'all' ? `状态为${activeTab}` : '全部状态'}</p>
              {searchTerm && <p>搜索关键词: "{searchTerm}"</p>}
            </div>
            <button
              onClick={handleAddTrip}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg hover:opacity-90 transition-all"
            >
              记录旅行
            </button>
          </div>
        )}
      </div>

      {/* 模态框组件 */}
      <AddTripModal
        isOpen={showAddTripModal || !!selectedTripForEdit} // 只要有一个为真就打开
        onClose={() => {
          setShowAddTripModal(false);
          setSelectedTripForEdit(null); // 关闭时清空编辑状态
        }}
        onSuccess={() => {
          handleTripAdded();
          setSelectedTripForEdit(null); // 成功后也要清空
        }}
        tripToEdit={selectedTripForEdit} //把要编辑的数据传进去
      />
      
      {showTripDetail && (
        <TripDetailModal
          trip={showTripDetail}
          onClose={() => setShowTripDetail(null)}
          onUpdate={loadDashboardData}
        />
      )}
      
      <ExploredCitiesMap
        isOpen={showCitiesMap}
        onClose={() => setShowCitiesMap(false)}
      />
      
      <TripGallery
        isOpen={showTripGallery}
        onClose={() => setShowTripGallery(false)}
      />

      <DataAnalysisModal
        isOpen={showStatsDetail}
        onClose={() => setShowStatsDetail(false)}
        defaultTab={analysisType} // 传入当前点击的类型
        basicStats={stats}        // 传入基础数据
      />
    </div>
  );
};

// 网格视图卡片组件

const TripCardGrid = ({ trip, onViewDetail, onUpdateStatus, onDelete, onEdit }) => {
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* 状态标签 (保持在图片上) */}
      <div className="absolute top-3 right-3 z-10">
        <span className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${trip.status === 'completed' 
          ? 'bg-green-100 text-green-700' 
          : trip.status === 'ongoing' 
          ? 'bg-blue-100 text-blue-700' 
          : 'bg-yellow-100 text-yellow-700'}`}>
          {trip.status === 'completed' ? '已完成' :
           trip.status === 'ongoing' ? '进行中' : '计划中'}
        </span>
      </div>
      
      {/* 图片区域 */}
      <div 
        className="h-40 bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative overflow-hidden cursor-pointer"
        onClick={onViewDetail}
      >
        {trip.images && trip.images.length > 0 ? (
          <img
            src={`http://localhost:8000${trip.images[0]}`}
            alt={trip.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              e.target.style.display = 'none'; // 图片加载失败隐藏
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <MapPin className="w-10 h-10" />
          </div>
        )}
      </div>
      
      {/* 内容区域  */}
      <div className="p-4 flex-1 flex flex-col relative">
        
        {/*  评分显示：定位在文字框右上角 */}
        {trip.rating && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-100 dark:border-yellow-700/50 px-2 py-1 rounded-lg">
            <StarIcon className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{trip.rating}</span>
          </div>
        )}

        <h3 
          className="font-bold text-lg mb-2 pr-12 truncate cursor-pointer hover:text-green-500 transition-colors"
          onClick={onViewDetail}
          title={trip.name}
        >
          {trip.name || '未命名旅行'}
        </h3>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{trip.destination || '未知目的地'}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{trip.days || 1} 天</span>
            </div>
            {/* 确保人数显示正确 */}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-600 dark:text-blue-400">
                {trip.people !== undefined ? trip.people : 1} 人
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span>¥{(trip.budget || 0).toLocaleString()}</span>
          </div>
        </div>
        
        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-4 mt-auto">
          {trip.tags && trip.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
              #{tag}
            </span>
          ))}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700 mt-2">
          <button onClick={onViewDetail} className="text-xs text-green-600 hover:underline">
            查看详情
          </button>
          
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 列表视图卡片组件
const TripCardList = ({ trip, onViewDetail, onUpdateStatus, onDelete, onEdit }) => {
  return (
    <div className="group p-4 rounded-xl border dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800/50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 
              className="font-bold text-lg group-hover:text-green-500 transition-colors cursor-pointer"
              onClick={onViewDetail}
            >
              {trip.name || '未命名旅行'}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${trip.status === 'completed' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : trip.status === 'ongoing' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
              {trip.status === 'completed' ? '已完成' :
               trip.status === 'ongoing' ? '进行中' : '计划中'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">目的地</p>
                <p className="font-medium">{trip.destination || '未知'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">天数</p>
                <p className="font-medium">{trip.days || 0} 天</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">人数</p>
                <p className="font-medium">{trip.people || 1} 人</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">预算</p>
                <p className="font-medium">¥{(trip.budget || 0).toLocaleString()}</p>
              </div>
            </div>
            // 在 TripCardList 组件内部，grid grid-cols-2 md:grid-cols-4 的 div 后面，或者作为第5个元素加入：

            <div className="flex items-center gap-2">
              <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">评分</p>
                <p className="font-medium">{trip.rating ? trip.rating : '暂无'}</p>
              </div>
            </div>
          </div>
          
          {trip.tags && Array.isArray(trip.tags) && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {trip.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 text-green-600 dark:text-blue-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {trip.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {trip.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onViewDetail}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
          {trip.status !== 'completed' && (
            <button
              onClick={() => onUpdateStatus('completed')}
              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              title="标记为已完成"
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
        <div className="text-xs text-gray-500">
          创建于 {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : '未知日期'}
          {trip.updated_at && ` • 更新于 ${new Date(trip.updated_at).toLocaleDateString()}`}
        </div>
        <button
          onClick={onViewDetail}
          className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 text-white hover:opacity-90 transition-opacity"
        >
          查看完整详情
        </button>
      </div>
    </div>
  );
};

export default InteractiveDashboard;