/**
 * 权限保护组件
 * 用于保护需要特定权限的功能和界面
 */

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { FeatureType } from '../services/permissionService';
import { LockIcon, SparkleIcon, CreditCardIcon } from './icons';
import Spinner from './Spinner';

interface PermissionGuardProps {
  feature: FeatureType;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  showLoginPrompt?: boolean;
  className?: string;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true,
  showLoginPrompt = true,
  className = ''
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading, hasFeature, canUseFeature, getPlanInfo } = usePermissions();

  // 加载状态
  if (authLoading || permissionsLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Spinner className="w-8 h-8 text-blue-400" />
        <span className="ml-3 text-gray-400">检查权限中...</span>
      </div>
    );
  }

  // 未登录状态
  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;

    if (!showLoginPrompt) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center ${className}`}
      >
        <LockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">需要登录</h3>
        <p className="text-gray-400 mb-4">此功能需要登录后使用</p>
        <button
          onClick={() => {
            // 触发登录模态框
            const event = new CustomEvent('openAuthModal');
            window.dispatchEvent(event);
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          立即登录
        </button>
      </motion.div>
    );
  }

  // 检查功能权限
  const hasRequiredFeature = hasFeature(feature);
  const canUse = canUseFeature(feature);
  
  if (!hasRequiredFeature || !canUse) {
    if (fallback) return <>{fallback}</>;

    const planInfo = getPlanInfo();
    const isFreePlan = planInfo?.code === 'free';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-lg p-6 text-center backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <SparkleIcon className="w-12 h-12 text-blue-400" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <LockIcon className="w-3 h-3 text-gray-900" />
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-200 mb-2">
          {isFreePlan ? '升级解锁高级功能' : '功能不可用'}
        </h3>
        
        <p className="text-gray-400 mb-4">
          {isFreePlan
            ? `${getFeatureName(feature)} 功能需要付费套餐才能使用`
            : `当前套餐不支持 ${getFeatureName(feature)} 功能`
          }
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showUpgrade && (
            <button
              onClick={() => {
                // 跳转到定价页面
                window.open('/pricing', '_blank');
              }}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all transform hover:scale-105"
            >
              <CreditCardIcon className="w-5 h-5 mr-2" />
              {isFreePlan ? '查看套餐' : '升级套餐'}
            </button>
          )}
          
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors"
          >
            返回
          </button>
        </div>

        {/* 功能对比提示 */}
        {isFreePlan && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400 mb-1">免费版</div>
                <div className="text-gray-300">
                  基础功能
                  <br />
                  每日 3 次使用
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 mb-1">付费版</div>
                <div className="text-blue-300">
                  全功能解锁
                  <br />
                  无限制使用
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // 权限检查通过，渲染子组件
  return <>{children}</>;
};

// 获取功能显示名称
function getFeatureName(feature: FeatureType): string {
  const names = {
    nano_banana: 'Nano Banana 图片生成',
    veo3_video: 'Veo3 视频生成',
    sticker: '贴纸制作',
    batch_processing: '批量处理',
    professional_canvas: '专业画布编辑'
  };
  return names[feature] || feature;
}

export default PermissionGuard;