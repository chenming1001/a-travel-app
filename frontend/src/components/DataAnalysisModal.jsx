// frontend/src/components/DataAnalysisModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  X, BarChart3, Calendar, DollarSign, Activity, 
  Zap, Map, Clock, Users, Compass, BrainCircuit 
} from 'lucide-react';
import axios from 'axios';

// === 1. 手写雷达图组件===
const RadarChart = ({ data, size = 200 }) => {
  if (!data || data.length < 3) return null;
  const center = size / 2;
  const radius = (size / 2) - 40;
  const angleSlice = (Math.PI * 2) / data.length;
  const getCoordinates = (value, index, max) => {
    const angle = index * angleSlice - (Math.PI / 2);
    const r = (value / max) * radius;
    return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r };
  };
  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  const gridPoints = levels.map(level => data.map((_, i) => getCoordinates(100 * level, i, 100)));
  const dataPoints = data.map((d, i) => getCoordinates(d.A, i, 100));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <div className="flex justify-center items-center py-4">
      <svg width={size} height={size} className="overflow-visible">
        {gridPoints.map((levelPoints, idx) => (
          <path key={idx} d={levelPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + 'Z'} fill="none" stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-gray-700" />
        ))}
        {data.map((_, i) => {
          const p = getCoordinates(100, i, 100);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" className="dark:stroke-gray-700" />;
        })}
        <path d={dataPath} fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="2" />
        {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" />)}
        {data.map((d, i) => {
          const p = getCoordinates(120, i, 100);
          return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400 font-medium">{d.subject}</text>;
        })}
      </svg>
    </div>
  );
};

// === 2.通用柱状图组件 (CustomBarChart) ===
const CustomBarChart = ({ data, colorClass = "bg-blue-500", heightClass = "h-40" }) => {
  // 如果没有数据，或者全是0
  if (!data || data.length === 0) return <div className="text-center text-gray-400 py-10 text-xs">暂无数据</div>;
  
  const maxVal = Math.max(...data.map(d => d.value)) || 1; // 防止除以0

  return (
    <div className={`w-full ${heightClass} flex items-end justify-between gap-2 pt-6`}>
      {data.map((item, idx) => {
        const percent = (item.value / maxVal) * 100;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            {/* 顶部数值显示 */}
            <span className={`text-[10px] mb-1 font-bold transition-all ${item.value > 0 ? 'text-gray-700 dark:text-gray-300 opacity-100' : 'opacity-0'}`}>
              {item.value > 0 ? item.value : ''}
            </span>
            
            {/* 柱子本体 */}
            <div 
              className={`w-full rounded-t-md transition-all duration-500 relative ${item.value > 0 ? colorClass : 'bg-gray-100 dark:bg-gray-800'}`}
              style={{ 
                height: item.value > 0 ? `${percent}%` : '4px', // 0值给个底座
                opacity: item.value > 0 ? 0.8 : 1
              }}
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {item.label}: {item.value}
              </div>
            </div>
            
            {/* 底部标签 */}
            <span className="text-[10px] text-gray-500 mt-2 truncate w-full text-center transform scale-90">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const DataAnalysisModal = ({ isOpen, onClose, defaultTab = 'dna' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab === 'trips' ? 'dna' : defaultTab);
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get('http://localhost:8000/api/dashboard/stats-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateAiReport = async () => {
    setGeneratingReport(true);
    setAiReport(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.post('http://localhost:8000/api/dashboard/ai-analysis', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAiReport(res.data.report);
      } else {
        setAiReport("分析服务暂时不可用: " + res.data.message);
      }
    } catch (err) {
      setAiReport("网络请求失败，请检查后端日志。");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!isOpen) return null;

  const KPICard = ({ icon: Icon, label, value, subtext, color }) => (
    <div className={`p-4 rounded-xl border ${color} bg-opacity-10 dark:bg-opacity-10`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color.replace('border', 'text')}`} />
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-5 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              WanderAI 深度行为分析报告
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">ALGORITHM: V2.0 // ANALYZING USER {new Date().getFullYear()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-56 bg-gray-50 dark:bg-gray-800/30 border-r dark:border-gray-800 p-3 space-y-1">
            {[
              { id: 'dna', label: '旅行人格 DNA', icon: Activity },
              { id: 'behavior', label: '行为习惯分析', icon: Clock },
              { id: 'finance', label: '经济学模型', icon: DollarSign },
              { id: 'geo', label: '地理空间足迹', icon: Map },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all ${
                  activeTab === item.id 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
            <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
            <button 
              onClick={() => setActiveTab('ai_insight')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all ${
                activeTab === 'ai_insight' 
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md' 
                : 'hover:bg-yellow-50 dark:hover:bg-gray-700 text-yellow-600 dark:text-yellow-500'
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> AI 深度诊断
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-xs">正在计算高阶指标...</p>
              </div>
            ) : !data ? (
              <div className="text-center py-20 text-gray-500">无法生成报告</div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                
                {/* 1. DNA Tab */}
                {activeTab === 'dna' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border dark:border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-yellow-500"></div>
                      <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">五维人格雷达</h3>
                      <RadarChart data={data.advanced_stats?.travel_dna} size={280} />
                    </div>
                    <div className="space-y-4">
                       <h3 className="font-bold text-lg">AI 洞察结论</h3>
                       <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                         <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                           根据算法分析，您的旅行风格偏向
                           <span className="font-bold text-green-600 dark:text-green-400 mx-1">
                             {data.advanced_stats?.travel_dna?.sort((a,b) => b.A - a.A)[0]?.subject || '平衡型'}
                           </span>。
                           您的探索度打败了 
                           <span className="font-mono font-bold mx-1">{data.advanced_stats?.travel_dna?.find(i=>i.subject==='探索度')?.A}%</span>
                           的用户。
                         </p>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <KPICard icon={Compass} label="累积里程" value={`${(data.advanced_stats?.kpi?.total_distance_km || 0).toLocaleString()} km`} color="border-purple-200 bg-purple-50 text-yellow-600" />
                         <KPICard icon={Zap} label="决策速度" value={data.advanced_stats?.kpi?.avg_lead_time_days < 7 ? "极速" : "稳健"} color="border-yellow-200 bg-yellow-50 text-yellow-600" />
                       </div>
                    </div>
                  </div>
                )}

                {/* 2. Behavior Tab (使用新的柱状图) */}
                {activeTab === 'behavior' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <KPICard icon={Clock} label="平均提前规划" value={`${data.advanced_stats?.kpi?.avg_lead_time_days || 0} 天`} color="border-blue-200 text-green-600" />
                       <KPICard icon={Calendar} label="最爱出行季节" value={data.season_preference?.sort((a,b)=>b.count-a.count)[0]?.season || '未知'} color="border-orange-200 text-orange-600" />
                       <KPICard icon={Users} label="常用出行模式" value="结伴游" color="border-green-200 text-green-600" subtext="平均 2.5 人同行"/>
                    </div>
                    
                    <div className="p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl">
                      <h3 className="font-bold mb-4">月度出行频率热力图</h3>
                      
                      {/* 调用新的柱状图组件 */}
                      <CustomBarChart 
                        data={(() => {
                          // 数据预处理：如果没数据，生成假数据占位
                          let chartData = data.monthly_frequency;
                          if (!chartData || chartData.length === 0) {
                             chartData = Array.from({length: 6}, (_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - (5 - i));
                                const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                return { month: monthStr, trip_count: 0 };
                             });
                          }
                          // 转换格式适配 CustomBarChart: {label, value}
                          return chartData.map(item => ({
                            label: item.month,
                            value: item.trip_count
                          }));
                        })()}
                        colorClass="bg-green-500"
                        heightClass="h-48"
                      />
                      
                      {(!data.monthly_frequency || data.monthly_frequency.length === 0) && (
                        <p className="text-center text-xs text-gray-400 mt-4">
                          暂无时间数据，请补充“开始日期”以生成图表
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Finance Tab (使用新的柱状图) */}
                {activeTab === 'finance' && (
                   <div className="space-y-6">
                     <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg">
                        <div className="flex justify-between items-start">
                           <div>
                             <p className="text-emerald-100 text-sm mb-1">人均单日投入 (CPPPD)</p>
                             <h2 className="text-4xl font-bold">¥ {data.advanced_stats?.kpi?.avg_spend_per_person_day || 0}</h2>
                             <p className="text-xs mt-2 opacity-80">此指标反映了您的旅行生活质量指数</p>
                           </div>
                           <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm"><DollarSign className="w-8 h-8" /></div>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* 左侧：消费分布图表 */}
                       <div className="p-4 border dark:border-gray-700 rounded-xl">
                         <h4 className="text-sm text-gray-500 mb-2">消费阶梯分布</h4>
                         
                         {/* 使用 CustomBarChart */}
                         <CustomBarChart 
                           data={data.budget_distribution?.map(b => ({
                             label: b.level,
                             value: b.count
                           }))}
                           colorClass="bg-emerald-500"
                           heightClass="h-32"
                         />
                       </div>
                       
                       {/* 右侧：总投资 */}
                       <div className="p-4 border dark:border-gray-700 rounded-xl flex flex-col justify-center items-center text-center">
                         <div className="text-sm text-gray-500">累计旅行投资</div>
                         <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">¥ {(data.basic_stats?.total_spent || 0).toLocaleString()}</div>
                       </div>
                    </div>
                   </div>
                )}

                {/* 4. Geo Tab */}
                {activeTab === 'geo' && (
                  <div className="text-center py-10 space-y-4">
                    <div className="inline-flex p-6 bg-purple-50 dark:bg-purple-900/20 rounded-full mb-4">
                       <Map className="w-12 h-12 text-yellow-500" />
                    </div>
                    <h3 className="text-2xl font-bold">您的足迹已覆盖 {(data.advanced_stats?.kpi?.total_distance_km || 0).toLocaleString()} 公里</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      通过 Haversine 算法计算，您的旅行总跨度相当于横跨了 {(data.advanced_stats?.kpi?.total_distance_km / 5000).toFixed(1)} 次中国版图。
                    </p>
                    <button className="px-6 py-2 bg-yellow-500 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors">
                      查看详细3D地球 (Coming Soon)
                    </button>
                  </div>
                )}

                {/* 5. AI Tab */}
                {activeTab === 'ai_insight' && (
                  <div className="h-full flex flex-col">
                    {!aiReport && !generatingReport && (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6">
                          <BrainCircuit className="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">生成您的专属旅行行为报告</h3>
                        <p className="text-gray-500 max-w-md mb-8">AI 将分析您的消费陷阱和行为模式，生成心理学级别的诊断书。</p>
                        <button onClick={generateAiReport} className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                          <Zap className="w-4 h-4" /> 启动深度分析
                        </button>
                      </div>
                    )}
                    
                    {generatingReport && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mb-4"></div>
                        <h3 className="font-bold animate-pulse">AI 正在思考中...</h3>
                        <p className="text-sm text-gray-400">正在分析您的消费模式和地理轨迹</p>
                      </div>
                    )}

                    {aiReport && (
                      <div className="flex-1 overflow-y-auto">
                        <div className="prose max-w-none p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                          {aiReport}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAnalysisModal;