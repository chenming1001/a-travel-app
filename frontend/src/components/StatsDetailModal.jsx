// frontend/src/components/StatsDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, DollarSign, Calendar, MapPin, PieChart, BarChart, Target, Users } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const StatsDetailModal = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadStatsDetails();
    }
  }, [isOpen, isAuthenticated]);

  const loadStatsDetails = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:8000/api/dashboard/stats-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载统计详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载统计详情中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        
        {/* 头部 */}
        <div className="sticky top-0 p-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold">旅行数据分析</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              详细统计和趋势分析
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="border-b dark:border-gray-800 px-6">
          <div className="flex gap-4 overflow-x-auto">
            {['overview', 'frequency', 'budget', 'season'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'frequency' && '旅行频率'}
                {tab === 'budget' && '预算分布'}
                {tab === 'season' && '季节偏好'}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {activeTab === 'overview' && stats?.basic_stats && (
            <div className="space-y-6">
              {/* 基础统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">总旅行次数</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.basic_stats.total_trips}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">探索城市</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.basic_stats.explored_cities}</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">总花费</span>
                  </div>
                  <p className="text-2xl font-bold">¥{Math.round(stats.basic_stats.total_spent).toLocaleString()}</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">总天数</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.basic_stats.total_days}</p>
                </div>
              </div>

              {/* 完成率 */}
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-6">
                <h3 className="font-bold mb-4">旅行完成情况</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">已完成</span>
                    <span className="font-medium">{stats.basic_stats.completed_trips} 次</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min(
                          (stats.basic_stats.completed_trips || 0) / 
                          Math.max(stats.basic_stats.total_trips || 1, 1) * 100, 
                          100
                        )}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-right">
                    完成率: {Math.round(
                      (stats.basic_stats.completed_trips || 0) / 
                      Math.max(stats.basic_stats.total_trips || 1, 1) * 100
                    )}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frequency' && stats?.monthly_frequency && (
            <div className="space-y-6">
              <h3 className="font-bold mb-4">月度旅行频率</h3>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">旅行时间分布</span>
                </div>
                
                <div className="h-64 flex items-end justify-between gap-1 px-2">
                  {stats.monthly_frequency.slice(-12).map((item, i) => (
                    <div key={i} className="w-full flex flex-col items-center gap-2">
                      <div className="relative">
                        <div 
                          className="w-8 md:w-10 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all duration-500"
                          style={{ height: `${Math.min(item.trip_count * 30, 200)}px` }}
                        ></div>
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
                          {item.trip_count}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 truncate w-full text-center">
                        {item.month.split('-')[1]}月
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-4">
                  <h4 className="font-medium mb-3">平均每月旅行</h4>
                  <p className="text-2xl font-bold text-center">
                    {(stats.monthly_frequency.reduce((sum, item) => sum + item.trip_count, 0) / 
                      Math.max(stats.monthly_frequency.length, 1)).toFixed(1)} 次
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-4">
                  <h4 className="font-medium mb-3">最活跃月份</h4>
                  <p className="text-lg font-bold text-center">
                    {stats.monthly_frequency.length > 0 
                      ? `${stats.monthly_frequency.sort((a, b) => b.trip_count - a.trip_count)[0].month.split('-')[1]}月`
                      : '暂无数据'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budget' && stats?.budget_distribution && (
            <div className="space-y-6">
              <h3 className="font-bold mb-4">预算分布分析</h3>
              
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {stats.budget_distribution.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2
                        ${item.level === '经济' ? 'bg-yellow-100 text-yellow-600' :
                          item.level === '适中' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'}`}>
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <p className="font-bold">{item.level}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.count} 次 • ¥{Math.round(item.avg_budget)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">各预算水平占比</span>
                  </div>
                  
                  <div className="space-y-2">
                    {stats.budget_distribution.map((item, index) => {
                      const total = stats.budget_distribution.reduce((sum, i) => sum + i.count, 1);
                      const percentage = Math.round((item.count / total) * 100);
                      
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{item.level}</span>
                            <span>{item.count}次 ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-1000
                                ${item.level === '经济' ? 'bg-yellow-500' :
                                  item.level === '适中' ? 'bg-green-500' :
                                  'bg-purple-500'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'season' && stats?.season_preference && (
            <div className="space-y-6">
              <h3 className="font-bold mb-4">季节旅行偏好</h3>
              
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border dark:border-gray-700 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { season: '春季', emoji: '🌸', color: 'from-green-500 to-emerald-500' },
                    { season: '夏季', emoji: '☀️', color: 'from-yellow-500 to-orange-500' },
                    { season: '秋季', emoji: '🍂', color: 'from-orange-500 to-red-500' },
                    { season: '冬季', emoji: '❄️', color: 'from-blue-500 to-cyan-500' }
                  ].map((season, index) => {
                    const pref = stats.season_preference.find(s => s.season === season.season);
                    const count = pref ? pref.count : 0;
                    
                    return (
                      <div key={index} className="text-center">
                        <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${season.color} flex items-center justify-center mb-2 text-2xl`}>
                          {season.emoji}
                        </div>
                        <p className="font-bold">{season.season}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{count} 次旅行</p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">季节偏好分析</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    根据您的旅行记录，可以分析出您在不同季节的旅行偏好，帮助您更好地规划未来的旅行时间。
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">最喜爱季节</div>
                      {stats.season_preference.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xl">
                            {stats.season_preference.sort((a, b) => b.count - a.count)[0].season === '春季' ? '🌸' :
                             stats.season_preference.sort((a, b) => b.count - a.count)[0].season === '夏季' ? '☀️' :
                             stats.season_preference.sort((a, b) => b.count - a.count)[0].season === '秋季' ? '🍂' : '❄️'}
                          </div>
                          <span className="font-medium">
                            {stats.season_preference.sort((a, b) => b.count - a.count)[0].season}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">暂无数据</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">旅行活跃度</div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div 
                            key={star}
                            className={`w-3 h-3 rounded-full 
                              ${stats.season_preference.length > 2 ? 'bg-blue-500' : 'bg-gray-300'}`}
                          ></div>
                        ))}
                        <span className="text-xs ml-2 text-gray-500">
                          {stats.season_preference.length > 2 ? '高' : '低'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsDetailModal;