// frontend/src/components/LoginModal.jsx
import React, { useState } from 'react';
import { X, User, Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const result = await login(formData.username, formData.password);
        if (result.success) {
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        // 注册 - 验证必填字段
        if (!formData.username || !formData.email || !formData.password) {
          setError('请填写所有必填字段');
          setLoading(false);
          return;
        }
        
        if (formData.password.length < 6) {
          setError('密码至少需要6个字符');
          setLoading(false);
          return;
        }

  const result = await register({
    username: formData.username,
    email: formData.email,
    password: formData.password,
    full_name: formData.full_name || formData.username
  });
        
        if (result.success) {
          onClose();
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('认证错误:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: ''
    });
    setError('');
  };

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        
        {/* 头部 */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isLogin ? '登录您的WanderAI账户' : '开始您的旅行规划之旅'}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">姓名</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="例如：张三"
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="example@email.com"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              用户名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="输入用户名"
                required
                minLength="3"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              密码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="输入密码"
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-1">密码至少需要6个字符</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5" />
                登录
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                注册
              </>
            )}
          </button>

          <div className="text-center pt-4 border-t dark:border-gray-800">
            <button
              type="button"
              onClick={handleSwitchMode}
              className="text-sm text-green-500 hover:text-green-600"
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;