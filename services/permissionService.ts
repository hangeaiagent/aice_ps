/**
 * 权限管理服务
 * 基于支付数据库结构实现用户权限验证和积分管理
 */

import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

// 权限类型定义
export interface UserPermissions {
  plan_code: string;
  plan_name: string;
  features: {
    nano_banana: boolean;
    veo3_video: boolean;
    sticker: boolean;
    batch_processing: boolean;
    professional_canvas: boolean;
    all_templates: boolean;
  };
  limits: {
    daily_usage?: number;
    concurrent_jobs?: number;
    credits_monthly: number;
  };
  credits: {
    total_credits: number;
    used_credits: number;
    available_credits: number;
    monthly_quota: number;
  };
  priority: 'low' | 'normal' | 'high' | 'highest' | 'vip';
  subscription_status: 'free' | 'active' | 'expired' | 'cancelled';
}

// 功能类型定义
export type FeatureType = 'nano_banana' | 'veo3_video' | 'sticker' | 'batch_processing' | 'professional_canvas';

// 权限检查结果
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  credits_required?: number;
  priority_level?: string;
}

// 积分消费结果
export interface CreditConsumptionResult {
  success: boolean;
  credits_consumed?: number;
  remaining_credits?: number;
  reason?: string;
  message?: string;
}

class PermissionService {
  private permissionsCache = new Map<string, { permissions: UserPermissions; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取用户权限信息
   */
  async getUserPermissions(user: User): Promise<UserPermissions> {
    const cacheKey = user.id;
    const cached = this.permissionsCache.get(cacheKey);
    
    // 检查缓存
    if (cached && cached.expires > Date.now()) {
      return cached.permissions;
    }

    try {
      // 通过后台API获取用户权限信息
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/user-permissions/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '获取用户权限失败');
      }

      const { permissions: apiPermissions, subscription, credits } = result.data;

      // 直接使用后台API返回的权限信息
      const userPermissions: UserPermissions = {
        plan_code: apiPermissions.planCode,
        plan_name: apiPermissions.planName,
          features: {
          nano_banana: apiPermissions.features.nano_banana || false,
          veo3_video: apiPermissions.features.veo3_video || false,
          sticker: apiPermissions.features.sticker || false,
          batch_processing: apiPermissions.features.batch_processing || false,
          professional_canvas: apiPermissions.features.professional_canvas || false,
          all_templates: apiPermissions.features.templates === 'all'
          },
          limits: {
          daily_usage: this.getDailyUsageLimit(apiPermissions.planCode),
          concurrent_jobs: this.getConcurrentJobsLimit(apiPermissions.planCode),
          credits_monthly: apiPermissions.monthlyQuota || 0
          },
          credits: {
            total_credits: credits?.total_credits || 0,
            used_credits: credits?.used_credits || 0,
          available_credits: apiPermissions.creditsRemaining || 0,
          monthly_quota: apiPermissions.monthlyQuota || 0
        },
        priority: this.getPriorityLevel(apiPermissions.planCode),
        subscription_status: apiPermissions.isSubscribed ? (apiPermissions.subscriptionStatus || 'active') : 'none'
      };

      // 缓存权限信息
      this.permissionsCache.set(cacheKey, {
        permissions: userPermissions,
        expires: Date.now() + this.CACHE_TTL
      });

      return userPermissions;
    } catch (error) {
      console.error('获取用户权限失败:', error);
      // 返回默认免费权限
      return this.getDefaultFreePermissions();
    }
  }

  /**
   * 检查用户是否有特定功能权限
   */
  async checkFeaturePermission(user: User, featureType: FeatureType, resourceData?: any): Promise<PermissionCheckResult> {
    try {
      // 通过后台API检查功能权限
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/user-permissions/${user.id}/check-feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature: featureType,
          resourceData
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '检查功能权限失败');
      }

      const { canUse, hasFeatureAccess, hasEnoughCredits, creditsRequired, creditsRemaining, reason, planCode } = result.data;

      if (!canUse) {
        return {
          allowed: false,
          reason: !hasFeatureAccess ? 'feature_not_available' : 'insufficient_credits',
          message: reason || '功能不可用',
          credits_required: creditsRequired
        };
      }

      return {
        allowed: true,
        credits_required: creditsRequired,
        priority_level: this.getPriorityLevel(planCode)
      };
    } catch (error) {
      console.error('权限检查失败:', error);
      return {
        allowed: false,
        reason: 'permission_check_failed',
        message: '权限检查失败，请稍后重试'
      };
    }
  }

  /**
   * 消费用户积分
   */
  async consumeCredits(user: User, featureType: FeatureType, resourceData?: any): Promise<CreditConsumptionResult> {
    try {
      const creditsRequired = this.getCreditsRequired(featureType, resourceData);
      
      if (creditsRequired === 0) {
        return { success: true, credits_consumed: 0 };
      }

      // 通过后台API消费积分
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/user-permissions/${user.id}/consume-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature: featureType,
          resourceData,
          creditsToConsume: creditsRequired
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          success: false,
          reason: 'credit_consumption_failed',
          message: result.error || '积分消费失败'
        };
      }

      // 清除权限缓存
      this.permissionsCache.delete(user.id);

      return {
        success: true,
        credits_consumed: result.data.creditsConsumed,
        remaining_credits: result.data.creditsRemaining
      };
    } catch (error) {
      console.error('积分消费异常:', error);
      return {
        success: false,
        reason: 'unexpected_error',
        message: '发生意外错误，请稍后重试'
      };
    }
  }

  /**
   * 获取功能所需积分数
   */
  private getCreditsRequired(featureType: FeatureType, resourceData?: any): number {
    const baseCredits = {
      nano_banana: 14,
      veo3_video: 160,
      sticker: 14,
      batch_processing: 0,
      professional_canvas: 0
    };

    let credits = baseCredits[featureType] || 0;

    // 根据资源数据调整积分消耗
    if (resourceData) {
      if (featureType === 'nano_banana') {
        // 根据图片尺寸调整积分
        const sizeMultiplier = {
          '1:1': 1.0,
          '16:9': 1.2,
          '9:16': 1.2,
          '4:3': 1.1,
          '3:4': 1.1
        }[resourceData.aspectRatio] || 1.0;
        credits = Math.ceil(credits * sizeMultiplier);
      } else if (featureType === 'veo3_video') {
        // 根据视频时长调整积分
        const duration = resourceData.duration || 5;
        credits = Math.ceil(credits * (duration / 5));
      }
    }

    return credits;
  }

  /**
   * 获取今日使用次数
   */
  private async getTodayUsageCount(userId: string, featureType: FeatureType): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('pay_feature_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (error) {
      console.error('获取今日使用次数失败:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * 获取正在运行的任务数量
   */
  private async getRunningJobsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pay_feature_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('获取运行任务数失败:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * 记录功能使用
   */
  private async recordFeatureUsage(userId: string, featureType: FeatureType, creditsConsumed: number, resourceData?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('pay_feature_usage')
        .insert({
          user_id: userId,
          feature_type: featureType,
          credits_consumed: creditsConsumed,
          usage_data: resourceData || {},
          status: 'pending'
        });

      if (error) {
        console.error('记录功能使用失败:', error);
      }
    } catch (error) {
      console.error('记录功能使用异常:', error);
    }
  }

  /**
   * 获取每日使用限制
   */
  private getDailyUsageLimit(planCode: string): number {
    const limits = {
      free: 3,
      starter: 100,
      advanced: 500,
      professional: -1, // 无限制
      lifetime: -1
    };
    return limits[planCode as keyof typeof limits] || 3;
  }

  /**
   * 获取并发任务限制
   */
  private getConcurrentJobsLimit(planCode: string): number {
    const limits = {
      free: 1,
      starter: 2,
      advanced: 5,
      professional: 10,
      lifetime: 20
    };
    return limits[planCode as keyof typeof limits] || 1;
  }

  /**
   * 获取优先级级别
   */
  private getPriorityLevel(planCode: string): UserPermissions['priority'] {
    const priorities = {
      free: 'low' as const,
      starter: 'normal' as const,
      advanced: 'high' as const,
      professional: 'highest' as const,
      lifetime: 'vip' as const
    };
    return priorities[planCode as keyof typeof priorities] || 'low';
  }

  /**
   * 获取默认免费权限
   */
  private getDefaultFreePermissions(): UserPermissions {
    return {
      plan_code: 'free',
      plan_name: '免费版',
      features: {
        nano_banana: true,
        veo3_video: false,
        sticker: true,
        batch_processing: false,
        professional_canvas: false,
        all_templates: false
      },
      limits: {
        daily_usage: 3,
        concurrent_jobs: 1,
        credits_monthly: 0
      },
      credits: {
        total_credits: 0,
        used_credits: 0,
        available_credits: 0,
        monthly_quota: 0
      },
      priority: 'low',
      subscription_status: 'free'
    };
  }

  /**
   * 刷新用户权限缓存
   */
  async refreshUserPermissions(userId: string): Promise<void> {
    try {
      // 清除本地缓存
    this.permissionsCache.delete(userId);
      
      // 通过后台API刷新权限缓存
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/user-permissions/${userId}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn('刷新后台权限缓存失败:', response.status);
      }
    } catch (error) {
      console.warn('刷新权限缓存失败:', error);
    }
  }

  /**
   * 清除所有权限缓存
   */
  clearPermissionsCache(): void {
    this.permissionsCache.clear();
  }
}

export const permissionService = new PermissionService();