/**
 * 权限管理 Hook
 * 提供用户权限检查、积分管理等功能
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { permissionService, UserPermissions, FeatureType, PermissionCheckResult, CreditConsumptionResult } from '../services/permissionService';

interface UsePermissionsReturn {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  
  // 权限检查
  hasFeature: (feature: FeatureType) => boolean;
  checkPermission: (feature: FeatureType, resourceData?: any) => Promise<PermissionCheckResult>;
  
  // 积分管理
  consumeCredits: (feature: FeatureType, resourceData?: any) => Promise<CreditConsumptionResult>;
  getCreditsInfo: () => UserPermissions['credits'] | null;
  
  // 套餐信息
  getPlanInfo: () => { code: string; name: string; status: string } | null;
  getPriorityLevel: () => string;
  
  // 刷新权限
  refreshPermissions: () => Promise<void>;
  
  // 使用限制检查
  canUseFeature: (feature: FeatureType) => boolean;
  getRemainingDailyUsage: () => number | null;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取用户权限
  const fetchPermissions = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setPermissions(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userPermissions = await permissionService.getUserPermissions(user);
      setPermissions(userPermissions);
    } catch (err) {
      console.error('获取用户权限失败:', err);
      setError('获取权限信息失败');
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  // 初始化和用户状态变化时获取权限
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // 检查是否有特定功能
  const hasFeature = useCallback((feature: FeatureType): boolean => {
    if (!permissions) return false;
    return permissions.features[feature] === true;
  }, [permissions]);

  // 检查权限
  const checkPermission = useCallback(async (feature: FeatureType, resourceData?: any): Promise<PermissionCheckResult> => {
    if (!user) {
      return {
        allowed: false,
        reason: 'not_authenticated',
        message: '请先登录后使用该功能'
      };
    }

    try {
      return await permissionService.checkFeaturePermission(user, feature, resourceData);
    } catch (error) {
      console.error('权限检查失败:', error);
      return {
        allowed: false,
        reason: 'check_failed',
        message: '权限检查失败，请稍后重试'
      };
    }
  }, [user]);

  // 消费积分
  const consumeCredits = useCallback(async (feature: FeatureType, resourceData?: any): Promise<CreditConsumptionResult> => {
    if (!user) {
      return {
        success: false,
        reason: 'not_authenticated',
        message: '请先登录后使用该功能'
      };
    }

    try {
      const result = await permissionService.consumeCredits(user, feature, resourceData);
      
      // 如果消费成功，刷新权限信息
      if (result.success) {
        await fetchPermissions();
      }
      
      return result;
    } catch (error) {
      console.error('积分消费失败:', error);
      return {
        success: false,
        reason: 'consumption_failed',
        message: '积分消费失败，请稍后重试'
      };
    }
  }, [user, fetchPermissions]);

  // 获取积分信息
  const getCreditsInfo = useCallback((): UserPermissions['credits'] | null => {
    return permissions?.credits || null;
  }, [permissions]);

  // 获取套餐信息
  const getPlanInfo = useCallback(() => {
    if (!permissions) return null;
    return {
      code: permissions.plan_code,
      name: permissions.plan_name,
      status: permissions.subscription_status
    };
  }, [permissions]);

  // 获取优先级
  const getPriorityLevel = useCallback((): string => {
    return permissions?.priority || 'low';
  }, [permissions]);

  // 刷新权限
  const refreshPermissions = useCallback(async () => {
    if (user) {
      permissionService.refreshUserPermissions(user.id);
      await fetchPermissions();
    }
  }, [user, fetchPermissions]);

  // 检查是否可以使用功能（综合检查）
  const canUseFeature = useCallback((feature: FeatureType): boolean => {
    if (!permissions) return false;
    
    // 检查功能是否可用
    if (!permissions.features[feature]) return false;
    
    // 免费用户检查每日限制
    if (permissions.subscription_status === 'free' && permissions.limits.daily_usage) {
      // 这里简化处理，实际应该查询今日使用次数
      return true; // 在实际使用时会通过 checkPermission 进行详细检查
    }
    
    return true;
  }, [permissions]);

  // 获取剩余每日使用次数
  const getRemainingDailyUsage = useCallback((): number | null => {
    if (!permissions || !permissions.limits.daily_usage) return null;
    
    // 这里返回限制数量，实际使用次数需要通过 API 查询
    return permissions.limits.daily_usage;
  }, [permissions]);

  return {
    permissions,
    loading,
    error,
    hasFeature,
    checkPermission,
    consumeCredits,
    getCreditsInfo,
    getPlanInfo,
    getPriorityLevel,
    refreshPermissions,
    canUseFeature,
    getRemainingDailyUsage
  };
};