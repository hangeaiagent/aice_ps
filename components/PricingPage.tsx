/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, CreditCardIcon, TrendingUpIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SubscriptionPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  plan_name_en: string;
  description?: string;
  price_monthly: number;
  price_yearly: number;
  credits_monthly: number;
  features: {
    nano_banana?: boolean;
    veo3_video?: boolean;
    sticker?: boolean;
    templates?: string;
    editing_tools?: string;
    ai_models?: string;
    batch_processing?: boolean;
    professional_canvas?: boolean;
    priority_queue?: string;
    dedicated_manager?: boolean;
  };
  is_active: boolean;
  sort_order: number;
}

const PricingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('获取套餐失败:', error);
        setError('无法加载套餐信息');
        return;
      }

      setPlans(data || []);
    } catch (err) {
      console.error('获取套餐失败:', err);
      setError('无法加载套餐信息');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      // 触发登录模态框
      const event = new CustomEvent('openAuthModal');
      window.dispatchEvent(event);
      return;
    }

    // TODO: 实现支付逻辑
    alert(`即将订阅 ${plan.plan_name} 套餐，支付功能开发中...`);
  };

  const getFeatureList = (features: SubscriptionPlan['features']) => {
    const featureList = [];
    
    if (features.nano_banana) featureList.push('Nano Banana 图片生成');
    if (features.veo3_video) featureList.push('Veo3 视频生成');
    if (features.sticker) featureList.push('贴纸制作');
    if (features.templates === 'all') featureList.push('全部模板');
    if (features.editing_tools === 'all') featureList.push('全部编辑工具');
    if (features.ai_models === 'multiple') featureList.push('多种AI模型');
    if (features.batch_processing) featureList.push('批量处理');
    if (features.professional_canvas) featureList.push('专业画布');
    if (features.priority_queue) featureList.push(`${features.priority_queue === 'high' ? '高' : features.priority_queue === 'highest' ? '最高' : '普通'}优先级队列`);
    if (features.dedicated_manager) featureList.push('专属客户经理');

    return featureList;
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const getYearlySavings = (plan: SubscriptionPlan) => {
    const monthlyTotal = plan.price_monthly * 12;
    const yearlySavings = monthlyTotal - plan.price_yearly;
    return yearlySavings > 0 ? Math.round((yearlySavings / monthlyTotal) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">加载失败</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            选择适合您的套餐
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 mb-8"
          >
            解锁强大的AI图像编辑功能，提升您的创作效率
          </motion.p>

          {/* 计费周期切换 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
              月付
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>
              年付
            </span>
            {billingCycle === 'yearly' && (
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                节省最多30%
              </span>
            )}
          </motion.div>
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const isPopular = plan.plan_code === 'advanced';
            const yearlySavings = getYearlySavings(plan);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-gray-800 rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                  isPopular 
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* 推荐标签 */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                      推荐
                    </span>
                  </div>
                )}

                {/* 套餐名称 */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.plan_name}</h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    ${getPrice(plan)}
                    <span className="text-lg font-normal text-gray-400">
                      /{billingCycle === 'monthly' ? '月' : '年'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && yearlySavings > 0 && (
                    <div className="text-sm text-green-400">
                      节省 {yearlySavings}%
                    </div>
                  )}
                </div>

                {/* 积分额度 */}
                <div className="text-center mb-6 p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                    <TrendingUpIcon className="w-5 h-5" />
                    <span className="font-medium">月度积分</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {plan.credits_monthly.toLocaleString()}
                  </div>
                </div>

                {/* 功能列表 */}
                <div className="mb-6">
                  <ul className="space-y-3">
                    {getFeatureList(plan.features).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                        <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 订阅按钮 */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                    isPopular
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg hover:shadow-xl'
                      : plan.plan_code === 'free'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CreditCardIcon className="w-4 h-4" />
                    {plan.plan_code === 'free' ? '当前套餐' : '立即订阅'}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* 底部说明 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-gray-400"
        >
          <p className="mb-4">所有套餐都包含7天免费试用期，随时可以取消</p>
          <p className="text-sm">
            需要帮助？请联系我们的 
            <a href="mailto:support@nanobanana.gitagent.io" className="text-blue-400 hover:text-blue-300">
              客服团队
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;
