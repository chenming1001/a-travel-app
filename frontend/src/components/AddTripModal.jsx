// frontend/src/components/AddTripModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Tag, 
  FileText, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit, 
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AddTripModal = ({ isOpen, onClose, onSuccess, tripToEdit }) => {
  // ================= 状态管理 =================
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 图片状态：包含新上传的(preview)和已存在的(url)
  const [images, setImages] = useState([]);
  
  // 错误与成功消息状态
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  // 表单数据初始状态
  const initialFormState = {
    name: '',
    destination: '',
    description: '',
    days: 3,
    people: 2,
    budget: 0,
    tags: [],
    start_date: '',
    end_date: '',
    status: 'planned',
    rating: '', // 使用空字符串以便输入框显示 placeholder
    notes: '',
    tagInput: '' // 标签输入框的临时状态
  };

  const [formData, setFormData] = useState(initialFormState);

  // ================= 核心逻辑：数据回填与重置 =================
  useEffect(() => {
    if (isOpen) {
      // 清除之前的状态
      setError('');
      setSuccess('');
      setLoading(false);

      if (tripToEdit) {
        console.log('📝 进入编辑模式，回填数据:', tripToEdit);
        
        // 1. 回填基础字段
        setFormData({
          name: tripToEdit.name || '',
          destination: tripToEdit.destination || '',
          description: tripToEdit.description || '',
          days: tripToEdit.days || 3,
          people: tripToEdit.people || 2,
          budget: tripToEdit.budget || 0,
          tags: Array.isArray(tripToEdit.tags) ? tripToEdit.tags : [],
          // 日期截取 YYYY-MM-DD
          start_date: tripToEdit.start_date ? tripToEdit.start_date.substring(0, 10) : '',
          end_date: tripToEdit.end_date ? tripToEdit.end_date.substring(0, 10) : '',
          status: tripToEdit.status || 'planned',
          rating: tripToEdit.rating !== null && tripToEdit.rating !== undefined ? tripToEdit.rating : '',
          notes: tripToEdit.notes || '',
          tagInput: ''
        });

        // 2. 回填图片
        if (tripToEdit.images && Array.isArray(tripToEdit.images) && tripToEdit.images.length > 0) {
          const existingImages = tripToEdit.images.map(url => ({
            preview: `http://localhost:8000${url}`, // 拼接完整后端地址
            name: '已存图片',
            isExisting: true
          }));
          setImages(existingImages);
        } else {
          setImages([]);
        }
      } else {
        // 新建模式：重置所有状态
        console.log('✨ 进入新建模式');
        setFormData(initialFormState);
        setImages([]);
      }
    }
  }, [isOpen, tripToEdit]);

  // 如果模态框未打开，不渲染任何内容
  if (!isOpen) return null;

  // ================= 事件处理逻辑 =================

  // 1. 通用输入框处理
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 特殊处理数字类型的字段
    if (['days', 'people', 'budget', 'rating'].includes(name)) {
      if (value === '') {
        // 允许清空输入框
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        // 解析数值
        const numValue = (name === 'rating' || name === 'budget') 
          ? parseFloat(value) 
          : parseInt(value, 10);
          
        setFormData(prev => ({ 
          ...prev, 
          [name]: isNaN(numValue) ? '' : numValue 
        }));
      }
    } else {
      // 普通文本字段
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 2. 标签处理逻辑
  const handleAddTag = () => {
    const val = formData.tagInput.trim();
    
    if (val && !formData.tags.includes(val)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, val], // 添加新标签
        tagInput: '' // 清空输入框
      }));
    } else if (formData.tags.includes(val)) {
      // 如果重复，仅清空输入框，也可以加个提示
      setFormData(prev => ({ ...prev, tagInput: '' }));
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // 阻止表单默认提交
      handleAddTag();     // 触发添加标签
    }
  };

  const handleRemoveTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // 3. 图片上传逻辑
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setError('');

    // 创建预览对象
    const previewImages = files.map(file => ({
      file, // 原始文件对象，用于上传
      preview: URL.createObjectURL(file), // 本地预览 URL
      name: file.name,
      isExisting: false // 标记为新图片
    }));

    setImages(prev => [...prev, ...previewImages]);
    setUploading(false);
    
    // 清空 input value，允许重复选择同一文件
    e.target.value = '';
  };

  const removeImage = (index) => {
    const imageToRemove = images[index];
    
    // 只有新上传的图片需要释放内存 URL
    if (!imageToRemove.isExisting) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 4. 表单提交逻辑
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 基础验证
      if (!formData.name.trim()) throw new Error('请填写旅行名称');
      if (!formData.destination.trim()) throw new Error('请填写目的地');

      // 构造提交给后端的数据对象
      const tripData = {
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        description: formData.description.trim() || null,
        days: Number(formData.days) || 1,
        people: Number(formData.people) || 1, // 确保是数字
        budget: Number(formData.budget) || 0,
        tags: formData.tags || [],
        status: formData.status || 'planned',
        notes: formData.notes.trim() || null,
        // 日期为空则传 null
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        // rating 为空字符串则传 null，否则传数字
        rating: (formData.rating === '' || formData.rating === null) ? null : Number(formData.rating)
      };

      console.log('📤 提交数据:', tripData);

      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('未登录，请先登录');

      // 决定 API 路径和方法
      let url = 'http://localhost:8000/api/trips';
      let method = 'POST';

      if (tripToEdit) {
        url = `http://localhost:8000/api/trips/${tripToEdit.id}`;
        method = 'PUT';
      }

      // 发送主数据请求
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tripData)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`服务器响应格式错误: ${responseText.substring(0, 50)}...`);
      }

      if (!response.ok) {
        if (response.status === 422) {
          console.error('参数验证失败:', responseData);
          throw new Error('数据格式错误，请检查输入项');
        }
        throw new Error(responseData.detail || '请求失败');
      }

      if (responseData.success) {
        // 获取 Trip ID (新建时从返回获取，编辑时从 props 获取)
        const tripId = tripToEdit ? tripToEdit.id : responseData.trip?.id;
        
        setSuccess(tripToEdit ? '旅行记录更新成功！' : '旅行记录创建成功！');
        
        // 处理新图片上传
        // 筛选出 isExisting 为 false 的图片进行上传
        const newImages = images.filter(img => !img.isExisting);
        
        if (newImages.length > 0 && tripId) {
          console.log(`📸 开始上传 ${newImages.length} 张新图片...`);
          
          for (const image of newImages) {
            const imageFormData = new FormData();
            imageFormData.append('file', image.file);
            
            try {
              await fetch(`http://localhost:8000/api/trips/${tripId}/upload-image`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: imageFormData
              });
            } catch (uploadError) {
              console.warn('单张图片上传失败:', uploadError);
              // 不阻断主流程，仅记录日志
            }
          }
        }
        
        // 回调通知父组件
        if (onSuccess) {
          // 如果是编辑，为了即时响应，可以手动合并数据返回，或者使用后端返回的最新数据
          const updatedTrip = tripToEdit 
            ? { ...tripToEdit, ...tripData } 
            : responseData.trip;
          onSuccess(updatedTrip);
        }
        
        // 延迟关闭模态框，让用户看到成功提示
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        throw new Error(responseData.message || '操作失败');
      }

    } catch (error) {
      console.error('提交过程出错:', error);
      setError(error.message || '系统错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // 重置表单并关闭
    setFormData(initialFormState);
    setImages([]);
    setError('');
    setSuccess('');
    onClose();
  };

  // ================= UI 渲染 =================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 p-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              {tripToEdit ? (
                <>
                  <Edit className="w-6 h-6 text-green-500"/> 编辑旅行记录
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-green-500"/> 记录新旅行
                </>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tripToEdit ? '修改您的旅行详情与回忆' : '记录您的旅行经历，开始规划新的旅程'}
            </p>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 消息提示区 */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <CheckCircle className="w-4 h-4" /> {success}
              </div>
            )}

            {/* Grid Layout Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 旅行名称 */}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  旅行名称 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="例如：北京文化之旅"
                    required
                  />
                </div>
              </div>

              {/* 目的地 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  目的地 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="例如：北京"
                    required
                  />
                </div>
              </div>

              {/* 天数 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  游玩天数
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="days"
                    min="1"
                    max="365"
                    value={formData.days}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* 人数 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  同行人数
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="people"
                    min="1"
                    value={formData.people}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* 预算 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  预算 (¥)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="budget"
                    min="0"
                    step="100"
                    value={formData.budget}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* 评分 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  评分 (0-5)
                </label>
                <div className="relative">
                  <Star className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    name="rating"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="暂无评分"
                  />
                </div>
              </div>

              {/* 状态 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  状态
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full pl-4 pr-10 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all appearance-none"
                  >
                    <option value="planned">📅 计划中</option>
                    <option value="ongoing">🚀 进行中</option>
                    <option value="completed">✅ 已完成</option>
                  </select>
                  {/* 自定义下拉箭头 */}
                  <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* 日期范围 */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  开始日期
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                  结束日期
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                />
              </div>

            </div>

            {/* 描述区域 */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                旅行描述
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none transition-all"
                placeholder="描述一下您的旅行经历..."
              />
            </div>

            {/* 标签管理区域 */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                标签 (按回车添加)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  name="tagInput"
                  value={formData.tagInput}
                  onChange={handleChange}
                  onKeyDown={handleTagInputKeyDown}
                  className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="输入标签，例如：美食、自驾..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-95 transition-all shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* 标签列表展示 */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  {formData.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm shadow-sm animate-in zoom-in duration-200"
                    >
                      <Tag className="w-3 h-3 text-green-500" />
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(index)} 
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 图片上传区域 */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                旅行图片 {tripToEdit && images.length > 0 && <span className="text-xs font-normal text-gray-500 ml-2">(包含 {images.filter(i=>i.isExisting).length} 张现有图片)</span>}
              </label>
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group
                  ${uploading 
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploading ? '正在处理图片...' : '点击或拖拽上传新图片'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  支持 JPG, PNG, WEBP (单张最大 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              
              {/* 图片预览网格 */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* 遮罩层 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                      
                      {/* 删除按钮 */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {/* 标记：现有图片 vs 新图片 */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium text-white shadow-sm pointer-events-none">
                        {image.isExisting ? (
                          <span className="bg-green-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded">已保存</span>
                        ) : (
                          <span className="bg-green-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded">新上传</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                备注
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none transition-all"
                placeholder="记录一些特别的经历或注意事项..."
              />
            </div>

          </form>
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 z-10 flex gap-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-3 px-4 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
              ${tripToEdit 
                ? 'bg-gradient-to-r from-green-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              }
              ${loading ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {tripToEdit ? '正在保存...' : '正在创建...'}
              </>
            ) : (
              <>
                {tripToEdit ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {tripToEdit ? '保存修改' : '创建旅行记录'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTripModal;
