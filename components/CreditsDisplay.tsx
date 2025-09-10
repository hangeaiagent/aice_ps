/**
 * 积分显示组件
 * 显示用户当前积分状态和使用情况
 */

import React from 'react';
import { motion } from 'framer-motion';
import { usePermissions } from '../hooks/usePermissions';
import { SparkleIcon, CreditCardIcon, TrendingUpIcon } from './icons';

interface CreditsDisplayProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

const CreditsDisplay: React.FC<CreditsDisplayProps> = ({
  className = '',
  showDetails = true,
  compact = false
}) => {
  const { permissions, getCreditsInfo, getPlanInfo, loading } = usePermissions();
  
  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-700 rounded-lg h-16 w-full"></div>
      </div>
    );
  }

  if (!permissions) {
    return null;
  }

  const credits = getCreditsInfo();
  const planInfo = getPlanInfo();
  
  if (!credits || !planInfo) {
    return null;
  }

  const usagePercentage = credits.monthly_quota > 0 
    ? ((credits.monthly_quota - credits.available_credits) / credits.monthly_quota) * 100 
    : 0;

  const isFreePlan = planInfo.code === 'free';
  const isLowCredits = credits.available_credits < 50 && credits.monthly_quota > 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SparkleIcon className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-200">
          {credits.available_credits}
        </span>
        {credits.monthly_quota > 0 && (
          <span className="text-xs text-gray-400">
            / {credits.monthly_quota}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-lg p-4 backdrop-blur-sm ${className}`}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-5 h-5 text-blue-400" />
          <h4 className="font-semibold text-gray-200">积分余额</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isFreePlan 
              ? 'bg-gray-600 text-gray-300' 
              : planInfo.status === 'active'
              ? 'bg-green-600 text-green-100'
              : 'bg-yellow-600 text-yellow-100'
          }`}>
            {planInfo.name}
          </span>
        </div>
      </div>

      {/* 积分显示 */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-white">
            {credits.available_credits}
          </span>
          {credits.monthly_quota > 0 && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-lg text-gray-300">
                {credits.monthly_quota}
              </span>
            </>
          )}
          <span className="text-sm text-gray-400 ml-1">积分</span>
        </div>

        {/* 进度条 */}
        {credits.monthly_quota > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>本月已使用</span>
              <span>{Math.round(usagePercentage)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  usagePercentage > 80 
                    ? 'bg-gradient-to-r from-red-500 to-red-600' 
                    : usagePercentage > 60
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="space-y-3">
          {/* 使用统计 */}
          {credits.monthly_quota > 0 && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-gray-400 mb-1">已使用</div>
                <div className="font-semibold text-gray-200">
                  {credits.used_credits}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-gray-400 mb-1">剩余</div>
                <div className="font-semibold text-gray-200">
                  {credits.available_credits}
                </div>
              </div>
            </div>
          )}

          {/* 低积分警告 */}
          {isLowCredits && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 text-yellow-300">
                <TrendingUpIcon className="w-4 h-4" />
                <span className="text-sm font-medium">积分不足提醒</span>
              </div>
              <p className="text-xs text-yellow-200 mt-1">
                您的积分余额较低，建议升级套餐或购买积分包
              </p>
            </motion.div>
          )}

          {/* 免费用户提示 */}
          {isFreePlan && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <CreditCardIcon className="w-4 h-4" />
                <span className="text-sm font-medium">升级获得更多积分</span>
              </div>
              <p className="text-xs text-blue-200 mb-3">
                付费套餐提供充足的月度积分额度，让您畅享所有 AI 功能
              </p>
              <button
                onClick={() => window.open('/pricing', '_blank')}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
              >
                查看套餐
              </button>
            </div>
          )}

          {/* 操作按钮 */}
          {!isFreePlan && (
            <div className="flex gap-2">
              <button
                onClick={() => window.open('/pricing', '_blank')}
                className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-md transition-colors"
              >
                管理套餐
              </button>
              {isLowCredits && (
                <button
                  onClick={() => window.open('/pricing', '_blank')}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  购买积分
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CreditsDisplay;