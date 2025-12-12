// components/TripCard.jsx
import React, { useState } from 'react';
import { 
  MapPin, Calendar, Users, Wallet, Heart, Share2, 
  Edit, Trash2, Star, Clock, CheckCircle, XCircle,
  Navigation, MoreVertical, FileText, Image as ImageIcon
} from 'lucide-react';

const TripCard = ({ trip, theme, onEdit, onDelete, onShare, onView }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false); // 控制图片加载失败回退

  // 状态样式配置
  const getStatusConfig = (status) => {
    const configs = {
      completed: { color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30', icon: <CheckCircle className="w-3 h-3" />, text: '已完成' },
      upcoming: { color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30', icon: <Clock className="w-3 h-3" />, text: '待出行' },
      generated: { color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30', icon: <FileText className="w-3 h-3" />, text: '已生成' },
      cancelled: { color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30', icon: <XCircle className="w-3 h-3" />, text: '已取消' }
    };
    return configs[status] || configs.generated;
  };

  // 渐变色配置
  const getTagColors = (tag) => {
    const colors = {
      '美食探索': 'from-red-500 to-pink-500',
      '摄影打卡': 'from-purple-500 to-indigo-500',
      '历史人文': 'from-amber-500 to-orange-500',
      '自然风光': 'from-green-500 to-emerald-500',
      '户外探险': 'from-orange-500 to-amber-500',
      '时尚购物': 'from-pink-500 to-rose-500',
      '都市夜游': 'from-blue-500 to-cyan-500',
      '亲子旅行': 'from-indigo-500 to-purple-500'
    };
    return colors[tag] || 'from-gray-500 to-gray-700';
  };

  const statusConfig = getStatusConfig(trip.status);

  // 拼接图片完整地址
  const getImageUrl = (url) => {
    if (!url) return null;
    // 如果已经是完整地址(http开头)或者blob预览地址，直接返回
    if (url.startsWith('http') || url.startsWith('blob')) return url;
    // 否则加上后端地址前缀
    return `http://localhost:8000${url}`;
  };

  return (
    <div className={`group relative rounded-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
      
      {/* 封面区域：高度设置为 h-48 以保证美观 */}
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
        
        {/* 逻辑判断：有图片且未报错 -> 显示照片；否则 -> 显示原本好看的渐变UI */}
        {trip.images && trip.images.length > 0 && !imgError ? (
          <img 
            src={getImageUrl(trip.images[0])}
            alt={trip.destination}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              console.log("图片加载失败，回退到默认样式:", e.target.src);
              setImgError(true); // 加载失败时，自动切换回下面的渐变样式
            }}
          />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${getTagColors(trip.tags?.[0] || '美食探索')} opacity-90 transition-opacity group-hover:opacity-100`}></div>
            {/* 增加一点纹理质感 */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="absolute inset-0 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
              <div className="text-white text-center p-4">
                <div className="text-5xl mb-3 drop-shadow-md filter">
                  {trip.destination?.includes('北京') ? '🏛️' : 
                   trip.destination?.includes('上海') ? '🌃' : 
                   trip.destination?.includes('成都') ? '🐼' : 
                   trip.destination?.includes('广州') ? '🍜' : 
                   trip.destination?.includes('西安') ? '🏮' : 
                   trip.destination?.includes('杭州') ? '🌸' : 
                   trip.destination?.includes('三亚') ? '🌴' : '✈️'}
                </div>
                <h3 className="text-2xl font-bold drop-shadow-sm tracking-wide">{trip.destination || '未知目的地'}</h3>
              </div>
            </div>
          </>
        )}
        
        {/* 状态标签 (绝对定位) */}
        <div className="absolute top-3 left-3">
          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md bg-white/90 text-gray-800`}>
            {statusConfig.icon}
            <span>{statusConfig.text}</span>
          </div>
        </div>

        {/* 评分 (绝对定位) */}
        {trip.rating && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-800">{trip.rating}</span>
          </div>
        )}

        {/* 图片数量角标 (仅当显示照片时出现) */}
        {trip.images && trip.images.length > 1 && !imgError && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            <span>{trip.images.length}</span>
          </div>
        )}

        {/* 悬浮菜单按钮 (绝对定位) */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="relative">
             <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20 overflow-hidden text-sm text-gray-700">
                  <button onClick={() => { onEdit && onEdit(trip); setShowMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-gray-50 flex gap-2 items-center"><Edit className="w-3 h-3"/> 编辑</button>
                  <button onClick={() => { onDelete && onDelete(trip); setShowMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-500 flex gap-2 items-center"><Trash2 className="w-3 h-3"/> 删除</button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="overflow-hidden mr-2">
            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-1 truncate" title={trip.name}>{trip.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0" /> {trip.destination}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></span>
              <span className="flex items-center gap-1 flex-shrink-0"><Calendar className="w-3 h-3" /> {trip.days}天</span>
            </div>
          </div>
          <button onClick={() => setIsLiked(!isLiked)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* 标签行 */}
        {trip.tags && trip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {trip.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className={`px-2 py-0.5 text-xs rounded-full bg-gradient-to-r ${getTagColors(tag)} text-white shadow-sm`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 信息统计栏 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-500">同行</p>
              <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{trip.people}人</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-gray-500">预算</p>
              <p className="font-bold text-gray-800 dark:text-gray-200 truncate">¥{trip.budget?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => onView && onView(trip)}
            className="flex-1 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            查看详情 <Navigation className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onShare && onShare(trip)}
            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-500"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripCard;