import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 确保环境变量被加载
dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MzM5NjQsImV4cCI6MjA1MDUwOTk2NH0.xWGgKJJmjfUUgEjNPcqRJdLQYLlgYDKJgBNxJfJGUJI';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  throw new Error('Supabase configuration is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 获取用户权限信息
async function getUserPermissions(userId) {
  try {
    // 获取用户订阅信息
    const { data: subscriptions, error: subError } = await supabase
      .from('pay_user_subscriptions')
      .select('*, pay_subscription_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('获取订阅信息失败:', subError);
    }

    // 获取用户积分信息
    const { data: credits, error: creditsError } = await supabase
      .from('pay_user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('获取积分信息失败:', creditsError);
    }

    // 构建权限对象
    const permissions = {
      planCode: subscriptions?.pay_subscription_plans?.plan_code || 'free',
      planName: subscriptions?.pay_subscription_plans?.name || '免费版',
      isSubscribed: !!subscriptions,
      subscriptionStatus: subscriptions?.status || 'none',
      features: {
        nano_banana: subscriptions?.pay_subscription_plans?.features?.nano_banana || true, // 免费用户也可以使用基础图片生成
        veo3_video: subscriptions?.pay_subscription_plans?.features?.veo3_video || false,
        sticker: subscriptions?.pay_subscription_plans?.features?.sticker || true, // 免费用户可以使用贴纸功能
        batch_processing: subscriptions?.pay_subscription_plans?.features?.batch_processing || false,
        professional_canvas: subscriptions?.pay_subscription_plans?.features?.professional_canvas || false,
        templates: subscriptions?.pay_subscription_plans?.features?.templates || 'basic'
      },
      monthlyQuota: subscriptions?.pay_subscription_plans?.monthly_quota || 10,
      creditsRemaining: credits?.available_credits || 10 // 免费用户默认10个积分
    };

    return {
      success: true,
      data: {
        permissions,
        subscription: subscriptions,
        credits
      }
    };
  } catch (error) {
    console.error('获取用户权限失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 检查功能权限
async function checkFeaturePermission(userId, feature) {
  try {
    const result = await getUserPermissions(userId);
    if (!result.success) {
      return result;
    }

    const { permissions, credits } = result.data;
    const hasFeatureAccess = permissions.features[feature] || false;
    const creditsRemaining = permissions.creditsRemaining || 0;
    const creditsRequired = 1; // 默认每次操作消耗1个积分
    const hasEnoughCredits = creditsRemaining >= creditsRequired;
    const canUse = hasFeatureAccess && hasEnoughCredits;
    
    let reason = '';
    if (!hasFeatureAccess) {
      reason = `功能 ${feature} 在您的计划中不可用`;
    } else if (!hasEnoughCredits) {
      reason = `积分不足，需要 ${creditsRequired} 积分，当前剩余 ${creditsRemaining} 积分`;
    }
    
    return {
      success: true,
      data: {
        canUse,
        hasFeatureAccess,
        hasEnoughCredits,
        creditsRequired,
        creditsRemaining,
        reason,
        planCode: permissions.planCode,
        feature
      }
    };
  } catch (error) {
    console.error('检查功能权限失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 消费积分
async function consumeCredits(userId, amount) {
  try {
    const { data, error } = await supabase.rpc('consume_user_credits', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error) {
      console.error('消费积分失败:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: {
        consumed: amount,
        remaining: data
      }
    };
  } catch (error) {
    console.error('消费积分失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 路由定义
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserPermissions(userId);
    res.json(result);
  } catch (error) {
    console.error('获取用户权限API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:userId/check-feature', async (req, res) => {
  try {
    const { userId } = req.params;
    const { feature } = req.body;
    const result = await checkFeaturePermission(userId, feature);
    res.json(result);
  } catch (error) {
    console.error('检查功能权限API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:userId/consume-credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    const result = await consumeCredits(userId, amount);
    res.json(result);
  } catch (error) {
    console.error('消费积分API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/:userId/refresh', async (req, res) => {
  try {
    const { userId } = req.params;
    // 刷新权限缓存（这里只是重新获取）
    const result = await getUserPermissions(userId);
    res.json(result);
  } catch (error) {
    console.error('刷新用户权限API错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
