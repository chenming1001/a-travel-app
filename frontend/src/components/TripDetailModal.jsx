// frontend/src/components/TripDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Calendar, Users, Wallet, Star, Tag, 
  FileText, Edit, Trash2, Navigation, Camera, Heart,
  CheckCircle, Clock, XCircle, Share2, Download,
  ArrowLeft, ArrowRight, Clock as ClockIcon, Home,
  Utensils, Camera as CameraIcon, Castle, Mountain,
  Save, Printer, ExternalLink, Eye, EyeOff, Copy,
  ThumbsUp, MessageCircle, Mail, Facebook, Twitter,
  Instagram, Send, Loader2, ShoppingBag
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const TripDetailModal = ({ trip, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [liked, setLiked] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(trip?.notes || '');
  const [rating, setRating] = useState(trip?.rating || 0);
  const [sharing, setSharing] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempRating, setTempRating] = useState(trip?.rating || 0);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { user } = useAuth();

  // 图片地址处理函数：自动补全后端地址
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob')) return url;
    return `http://localhost:8000${url}`;
  };

  // 初始化数据
  useEffect(() => {
    if (trip) {
      // 图片处理：优先使用真实图片
      if (trip.images && Array.isArray(trip.images) && trip.images.length > 0) {
        setImages(trip.images);
      } else {
        // 如果没有图片，置空（不要用模拟图，否则用户会困惑）
        setImages([]);
      }
      
      // 初始化状态
      setNotes(trip.notes || '');
      setRating(trip.rating || 0);
      setTempRating(trip.rating || 0);
    }
  }, [trip]);

  if (!trip) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'ongoing': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'planned': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'ongoing': return '进行中';
      case 'planned': return '计划中';
      default: return status;
    }
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这个旅行记录吗？此操作不可撤销。')) {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        await axios.delete(`http://localhost:8000/api/trips/${trip.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        onUpdate?.();
        onClose();
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      await axios.put(`http://localhost:8000/api/trips/${trip.id}`, {
        status: newStatus
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      onUpdate?.();
      trip.status = newStatus;
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 笔记保存逻辑
  const handleSaveNotesAndRating = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      console.log('正在保存笔记:', notes, '评分:', tempRating);

      await axios.put(`http://localhost:8000/api/trips/${trip.id}`, {
        notes: notes,
        rating: tempRating
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setRating(tempRating);
      setIsEditingNotes(false);
      onUpdate?.(); // 通知父组件更新
      alert('笔记保存成功！'); //用户反馈
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setSharing(true);
      const shareData = {
        title: trip.name,
        text: `查看我的旅行记录：${trip.name} - ${trip.destination}`,
        url: window.location.origin + '/trips/' + trip.id
      };
      
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('分享失败:', error);
      if (error.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.origin + '/trips/' + trip.id);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadReport = () => {
    const report = `
旅行报告：${trip.name}
==============================

目的地：${trip.destination}
行程天数：${trip.days}天
同行人数：${trip.people}人
预算：¥${trip.budget?.toLocaleString() || '0'}
实际花费：¥${trip.actual_cost?.toLocaleString() || '未记录'}
状态：${getStatusText(trip.status)}
评分：${rating.toFixed(1)}/5.0

旅行描述：
${trip.description || '无描述'}

个人笔记：
${notes || '无笔记'}

标签：${trip.tags?.join(', ') || '无标签'}

生成时间：${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/\s+/g, '_')}_旅行报告.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${trip.name} - 旅行报告</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          .info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .label { font-weight: bold; color: #64748b; }
          .value { color: #1e293b; }
          .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
          .tag { background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 16px; font-size: 14px; }
          .notes { background: #fefce8; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .rating { color: #f59e0b; font-size: 18px; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 30px;">
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">打印</button>
          <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-left: 10px;">关闭</button>
        </div>
        
        <h1>${trip.name}</h1>
        
        <div class="info">
          <p><span class="label">目的地：</span><span class="value">${trip.destination}</span></p>
          <p><span class="label">行程天数：</span><span class="value">${trip.days}天</span></p>
          <p><span class="label">同行人数：</span><span class="value">${trip.people}人</span></p>
          <p><span class="label">预算：</span><span class="value">¥${trip.budget?.toLocaleString() || '0'}</span></p>
          <p><span class="label">实际花费：</span><span class="value">¥${trip.actual_cost?.toLocaleString() || '未记录'}</span></p>
          <p><span class="label">状态：</span><span class="value">${getStatusText(trip.status)}</span></p>
          <p><span class="label">评分：</span><span class="value rating">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))} (${rating.toFixed(1)}/5.0)</span></p>
        </div>
        
        ${trip.description ? `<h3>旅行描述</h3><p>${trip.description}</p>` : ''}
        
        ${trip.tags?.length > 0 ? `
          <h3>旅行标签</h3>
          <div class="tags">
            ${trip.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        
        ${notes ? `
          <h3>个人笔记</h3>
          <div class="notes">
            ${notes.replace(/\n/g, '<br>')}
          </div>
        ` : ''}
        
        <div style="margin-top: 40px; color: #64748b; font-size: 12px; text-align: center;">
          报告生成时间：${new Date().toLocaleString()}<br>
          WanderAI 旅行助手
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未设置';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return '日期格式错误';
    }
  };

  const getTagIcon = (tag) => {
    switch (tag) {
      case '美食探索': return <Utensils className="w-3 h-3" />;
      case '摄影打卡': return <CameraIcon className="w-3 h-3" />;
      case '历史人文': return <Castle className="w-3 h-3" />;
      case '自然风光': return <Mountain className="w-3 h-3" />;
      case '购物': return <ShoppingBag className="w-3 h-3" />;
      case '户外探险': return <Mountain className="w-3 h-3" />;
      default: return <Tag className="w-3 h-3" />;
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
  };

  // 评分渲染函数
  const renderRatingStars = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          // 点击星星时，直接设置分数，并自动开启编辑模式（显示保存按钮）
          onClick={() => {
            setTempRating(star);
            setIsEditingNotes(true);
          }}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          
          // 样式总是显示为手型指针 (cursor-pointer)
          className={`text-2xl transition-all duration-200 ${
            star <= (hoverRating || tempRating) 
              ? 'text-yellow-500 transform scale-110' 
              : 'text-gray-300'
          } cursor-pointer`}
          
          // 只有正在保存(loading)时才禁用，平时都能点
          disabled={loading}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
        {tempRating.toFixed(1)} / 5.0
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        
        {/* 头部 */}
        <div className="sticky top-0 z-10 p-6 border-b dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold truncate">{trip.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trip.status)}`}>
                  {getStatusText(trip.status)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  {rating > 0 ? rating.toFixed(1) : '未评分'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.username ? `由 ${user.username} 创建` : ''}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 标签栏 */}
        <div className="border-b dark:border-gray-800">
          <div className="flex overflow-x-auto">
            {['overview', 'details', 'photos', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'details' && '详细信息'}
                {tab === 'photos' && '照片'}
                {tab === 'notes' && '笔记'}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 基本信息卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0 text-white"><MapPin className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">目的地</p>
                      <p className="font-medium truncate">{trip.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shrink-0 text-white"><Calendar className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">行程日期</p>
                      <p className="font-medium truncate">
                        {trip.start_date ? formatDate(trip.start_date) : '未设置'}
                        {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shrink-0 text-white"><Users className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">同行人数</p>
                      <p className="font-medium">{trip.people || 1} 人</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 text-white"><Wallet className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">预算</p>
                      <p className="font-medium">¥{trip.budget?.toLocaleString() || '0'}</p>
                      {trip.actual_cost && (
                        <p className="text-sm text-gray-500">
                          实际花费: ¥{trip.actual_cost.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {trip.tags && trip.tags.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">旅行标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {trip.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm flex items-center gap-2"
                      >
                        {getTagIcon(tag)}
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 描述 */}
              {trip.description && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <h3 className="font-medium mb-2">描述</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{trip.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                 <h3 className="font-medium mb-2">详细数据</h3>
                 <p className="text-gray-600">行程天数：{trip.days} 天</p>
                 <p className="text-gray-600">创建时间：{formatDate(trip.created_at)}</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                 <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-300">预算分析</h3>
                 <div className="flex justify-between">
                    <span>预算:</span>
                    <span className="font-bold">¥{trip.budget}</span>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              {images.length > 0 ? (
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={getImageUrl(images[currentImageIndex])}
                      alt={`Trip photo ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                         e.target.style.display='none';
                         e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400">图片加载失败</div>';
                      }}
                    />
                    
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    
                    {/* 图片指示器 */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex 
                              ? 'bg-white w-6' 
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleImageClick(idx)}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                            idx === currentImageIndex 
                              ? 'border-blue-500 scale-105' 
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={getImageUrl(img)}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无照片</p>
                  <p className="text-sm text-gray-400 mt-1">上传一些旅行照片来记录美好瞬间</p>
                </div>
              )}
            </div>
          )}

          {/* 笔记 Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* 评分 */}
              <div className="p-4 rounded-xl border dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">评分</h3>
                  {isEditingNotes && (
                    <button
                      onClick={() => setTempRating(rating)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      重置评分
                    </button>
                  )}
                </div>
                {renderRatingStars()}
              </div>

              {/* 笔记编辑 */}
              <div className="p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">行程笔记</h3>
                  <div className="flex items-center gap-2">
                    {isEditingNotes ? (
                      <>
                        <button
                          onClick={() => {
                            setIsEditingNotes(false);
                            setTempRating(rating);
                            setNotes(trip.notes || '');
                          }}
                          disabled={loading}
                          className="px-3 py-1 text-sm rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveNotesAndRating}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          {loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          保存
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingNotes(true)}
                        className="px-3 py-1 text-sm rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        编辑笔记
                      </button>
                    )}
                  </div>
                </div>
                
                {isEditingNotes ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-60 p-4 rounded-lg border dark:border-gray-700 bg-transparent resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="记录这次旅行的感受、收获和建议..."
                  />
                ) : (
                  <div className="min-h-[200px] whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {notes || '暂无笔记，点击右上角“编辑”添加。'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 p-6 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => handleUpdateStatus(trip.status === 'completed' ? 'planned' : 'completed')}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {trip.status === 'completed' ? '标记为计划中' : '标记为已完成'}
            </button>

            <button
              onClick={() => setLiked(!liked)}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Heart className={`w-4 h-4 transition-all ${liked ? 'fill-red-500 text-red-500 animate-pulse' : ''}`} />
              {liked ? '已收藏' : '收藏'}
            </button>

            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载报告
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : copySuccess ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {copySuccess ? '已复制' : sharing ? '分享中' : '分享'}
            </button>

            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;