import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 获取用户权限信息
 * GET /api/user-permissions/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    console.log('获取用户权限信息:', userId);

    // 查询用户订阅信息
    const { data: subscription, error: subError } = await supabase
      .from('pay_user_subscriptions')
      .select(`
        *,
        pay_subscription_plans (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('获取用户订阅失败:', subError);
    }

    // 查询用户积分信息
    const { data: credits, error: creditsError } = await supabase
      .from('pay_user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      console.error('获取用户积分失败:', creditsError);
    }

    // 构建权限对象
    let permissions = {
      planCode: 'free',
      planName: '免费版',
      creditsRemaining: 0,
      monthlyQuota: 0,
      features: {
        nano_banana: false,
        templates: 'basic',
        editing_tools: 'basic'
      },
      isSubscribed: false,
      subscriptionStatus: null,
      subscriptionEndDate: null
    };

    // 如果有有效订阅
    if (subscription?.pay_subscription_plans) {
      const plan = subscription.pay_subscription_plans;
      permissions = {
        planCode: plan.plan_code,
        planName: plan.plan_name,
        creditsRemaining: credits?.available_credits || 0,
        monthlyQuota: credits?.monthly_quota || plan.credits_monthly,
        features: plan.features || {},
        isSubscribed: true,
        subscriptionStatus: subscription.status,
        subscriptionEndDate: subscription.end_date,
        subscriptionType: subscription.subscription_type
      };
    } else if (credits) {
      // 只有积分信息，没有订阅
      permissions.creditsRemaining = credits.available_credits || 0;
      permissions.monthlyQuota = credits.monthly_quota || 0;
    }

    res.json({
      success: true,
      data: {
        permissions,
        subscription: subscription || null,
        credits: credits || null
      }
    });

  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({
      error: '获取用户权限失败',
      detail: error.message
    });
  }
});

/**
 * 检查用户功能权限
 * POST /api/user-permissions/:userId/check-feature
 */
router.post('/:userId/check-feature', async (req, res) => {
  try {
    const { userId } = req.params;
    const { feature, resourceData } = req.body;

    if (!userId || !feature) {
      return res.status(400).json({ error: '用户ID和功能类型不能为空' });
    }

    console.log('检查用户功能权限:', { userId, feature, resourceData });

    // 获取用户权限信息
    const permissionsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/user-permissions/${userId}`);
    const permissionsData = await permissionsResponse.json();

    if (!permissionsData.success) {
      return res.status(500).json({ error: '获取用户权限失败' });
    }

    const { permissions } = permissionsData.data;

    // 检查功能权限
    let canUse = false;
    let reason = '';
    let creditsRequired = 1;

    switch (feature) {
      case 'nano_banana':
        canUse = permissions.features.nano_banana === true;
        reason = canUse ? '' : '需要升级到付费套餐';
        creditsRequired = 2;
        break;
      case 'image_editing':
        canUse = true; // 基础功能，所有用户都可以使用
        creditsRequired = 1;
        break;
      case 'template_advanced':
        canUse = permissions.features.templates === 'all';
        reason = canUse ? '' : '需要升级套餐以使用高级模板';
        creditsRequired = 1;
        break;
      case 'batch_processing':
        canUse = permissions.features.batch_processing === true;
        reason = canUse ? '' : '需要升级到进阶版或更高套餐';
        creditsRequired = 5;
        break;
      default:
        canUse = true;
        creditsRequired = 1;
    }

    // 检查积分是否足够
    const hasEnoughCredits = permissions.creditsRemaining >= creditsRequired;

    res.json({
      success: true,
      data: {
        canUse: canUse && hasEnoughCredits,
        hasFeatureAccess: canUse,
        hasEnoughCredits,
        creditsRequired,
        creditsRemaining: permissions.creditsRemaining,
        reason: !canUse ? reason : (!hasEnoughCredits ? '积分不足' : ''),
        planCode: permissions.planCode
      }
    });

  } catch (error) {
    console.error('检查功能权限失败:', error);
    res.status(500).json({
      error: '检查功能权限失败',
      detail: error.message
    });
  }
});

/**
 * 消费用户积分
 * POST /api/user-permissions/:userId/consume-credits
 */
router.post('/:userId/consume-credits', async (req, res) => {
  try {
    const { userId } = req.params;
    const { feature, resourceData, creditsToConsume } = req.body;

    if (!userId || !feature || !creditsToConsume) {
      return res.status(400).json({ error: '参数不完整' });
    }

    console.log('消费用户积分:', { userId, feature, creditsToConsume });

    // 获取当前积分信息
    const { data: credits, error: creditsError } = await supabase
      .from('pay_user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('获取积分信息失败:', creditsError);
      return res.status(500).json({ error: '获取积分信息失败' });
    }

    if (!credits || credits.available_credits < creditsToConsume) {
      return res.json({
        success: false,
        error: '积分不足',
        creditsRemaining: credits?.available_credits || 0,
        creditsRequired: creditsToConsume
      });
    }

    // 更新积分
    const newUsedCredits = credits.used_credits + creditsToConsume;
    const newAvailableCredits = credits.available_credits - creditsToConsume;

    const { error: updateError } = await supabase
      .from('pay_user_credits')
      .update({
        used_credits: newUsedCredits,
        available_credits: newAvailableCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('更新积分失败:', updateError);
      return res.status(500).json({ error: '更新积分失败' });
    }

    // 记录积分消费
    const { error: transactionError } = await supabase
      .from('pay_credit_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'usage',
        credits: -creditsToConsume,
        description: `使用功能: ${feature}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.warn('记录积分交易失败:', transactionError);
    }

    res.json({
      success: true,
      data: {
        creditsConsumed: creditsToConsume,
        creditsRemaining: newAvailableCredits,
        totalUsed: newUsedCredits
      }
    });

  } catch (error) {
    console.error('消费积分失败:', error);
    res.status(500).json({
      error: '消费积分失败',
      detail: error.message
    });
  }
});

/**
 * 刷新用户权限缓存
 * POST /api/user-permissions/:userId/refresh
 */
router.post('/:userId/refresh', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('刷新用户权限缓存:', userId);
    
    // 这里可以清除缓存逻辑
    // 目前直接返回成功
    
    res.json({
      success: true,
      message: '权限缓存已刷新'
    });

  } catch (error) {
    console.error('刷新权限缓存失败:', error);
    res.status(500).json({
      error: '刷新权限缓存失败',
      detail: error.message
    });
  }
});

export default router;
