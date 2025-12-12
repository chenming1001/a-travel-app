// components/DashboardView.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, MapPin, DollarSign, Calendar, 
  Star, Clock, BarChart3, PieChart, Download,
  Eye, EyeOff, RefreshCw, ChevronRight, ChevronLeft,
  Heart, Share2, Award, FileText, X
} from 'lucide-react';

const DashboardView = ({ theme }) => {
  const [stats, setStats] = useState({
    generatedPlans: 12,
    exploredCities: 8,
    totalDistance: 3450,
    totalBudget: 12000,
    favoriteCities: ['北京', '上海', '成都']
  });

  const [recentTrips, setRecentTrips] = useState([
    {
      id: 1,
      name: "北京故宫文化游",
      destination: "北京",
      days: 3,
      budget: 3500,
      tags: ["历史人文", "摄影打卡"],
      date: "2024-03-15",
      status: "completed",
      rating: 4.8
    },
    {
      id: 2,
      name: "上海都市探索",
      destination: "上海",
      days: 2,
      budget: 2800,
      tags: ["时尚购物", "都市夜游"],
      date: "2024-03-10",
      status: "completed",
      rating: 4.5
    },
    {
      id: 3,
      name: "成都美食之旅",
      destination: "成都",
      days: 4,
      budget: 4200,
      tags: ["美食探索", "自然风光"],
      date: "2024-03-05",
      status: "upcoming",
      rating: 4.9
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [favorites, setFavorites] = useState([1, 2]);

  const toggleFavorite = (planId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId];
      
      localStorage.setItem('favoritePlans', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const getWeatherData = () => {
    return ['北京', '上海', '成都'].map(city => ({
      city,
      temperature: Math.floor(Math.random() * 15) + 15,
      weather: ['晴天', '多云', '小雨'][Math.floor(Math.random() * 3)]
    }));
  };

  const weatherData = getWeatherData();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {/* 顶部标题 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            旅行数据看板
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            查看您的旅行数据和统计信息
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLoading(true)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 md:p-6 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">生成行程</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.generatedPlans}</p>
            </div>
            <FileText className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 md:p-6 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm">探索城市</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.exploredCities}</p>
            </div>
            <MapPin className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 md:p-6 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm">总旅行预算</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">¥{stats.totalBudget.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 md:p-6 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-sm">累计里程</p>
              <p className="text-2xl md:text-3xl font-bold mt-2">{stats.totalDistance} km</p>
            </div>
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：用户洞察 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 用户洞察卡片 */}
          <div className={`p-5 md:p-6 rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                个性化洞察
              </h2>
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {showInsights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {showInsights && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">您最关注的城市: {stats.favoriteCities.join(', ')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      基于您的搜索和聊天记录
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                  <h3 className="font-bold mb-2 text-purple-600 dark:text-purple-400">🎯 为您推荐</h3>
                  <p className="text-sm">
                    根据您的旅行偏好，建议尝试错峰出行，可以节省20-30%的旅行预算
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 旅行趋势分析 */}
          <div className={`p-5 md:p-6 rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-bold mb-6">旅行趋势分析</h2>
            <div className="h-32 flex items-end justify-between gap-1 px-2">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="w-full flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500"
                    style={{ height: `${h}%` }}
                  ></div>
                  <span className="text-xs text-gray-400">{'MTWTFSS'[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：天气和近期活动 */}
        <div className="space-y-6">
          {/* 实时天气 */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg p-5 md:p-6 text-white">
            <h2 className="text-lg font-bold mb-6">热门城市天气</h2>
            
            <div className="space-y-4">
              {weatherData.map((weather, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-lg">
                        {weather.weather === '晴天' ? '☀️' : weather.weather === '多云' ? '⛅' : '🌧️'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{weather.city}</p>
                      <p className="text-sm opacity-80">{weather.weather}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{weather.temperature}°C</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 热门目的地 */}
          <div className={`p-5 md:p-6 rounded-2xl shadow-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-lg font-bold mb-6">热门目的地</h2>
            <div className="space-y-4">
              {stats.favoriteCities.map((city, idx) => (
                <div
                  key={city}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{city}</p>
                      <p className="text-sm text-gray-500">热门旅行城市</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 历史计划列表 */}
      <div className="mt-8 p-5 md:p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">近期旅行计划</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">收藏数:</span>
            <span className="font-medium">{favorites.length}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4">行程名称</th>
                <th className="text-left py-3 px-4">目的地</th>
                <th className="text-left py-3 px-4">天数</th>
                <th className="text-left py-3 px-4">预算</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.map(plan => (
                <tr key={plan.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleFavorite(plan.id)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            favorites.includes(plan.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        />
                      </button>
                      <span className="font-medium">{plan.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {plan.destination}
                    </div>
                  </td>
                  <td className="py-3 px-4">{plan.days} 天</td>
                  <td className="py-3 px-4 font-medium">¥{plan.budget?.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`分享${plan.name}`)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;