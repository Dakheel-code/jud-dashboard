import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// دالة لتحديث بداية الاشتراك عند إكمال مهمة إطلاق الحملات
async function updateSubscriptionStartDate(store_id: string, task_id: string, newIsDone: boolean) {
  try {
    // جلب معلومات المهمة
    const { data: taskInfo } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', task_id)
      .single();
    
    // التحقق من أن المهمة هي "إطلاق الحملات"
    if (taskInfo?.title === 'إطلاق الحملات') {
      if (newIsDone) {
        // تحديث بداية الاشتراك بالتاريخ الحالي
        await supabase
          .from('stores')
          .update({ subscription_start_date: new Date().toISOString() })
          .eq('id', store_id);
      } else {
        // إلغاء بداية الاشتراك
        await supabase
          .from('stores')
          .update({ subscription_start_date: null })
          .eq('id', store_id);
      }
    }
  } catch (error) {
  }
}

// دالة لحساب نسبة الإنجاز وإرسال إشعارات Slack
async function checkAndSendMilestoneNotification(
  request: NextRequest,
  store_id: string,
  newIsDone: boolean
) {
  if (!newIsDone) return; // لا نرسل إشعار عند إلغاء المهمة
  
  try {
    // جلب عدد المهام الكلي
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });
    
    // جلب عدد المهام المكتملة للمتجر
    const { count: completedTasks } = await supabase
      .from('tasks_progress')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .eq('is_done', true);
    
    if (!totalTasks || !completedTasks) return;
    
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    
    // جلب معلومات المتجر
    const { data: storeInfo } = await supabase
      .from('stores')
      .select('store_url')
      .eq('id', store_id)
      .single();
    
    // إرسال إشعار عند 50%
    if (percentage === 50) {
      await fetch(`${request.nextUrl.origin}/api/admin/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'milestone',
          data: {
            store_url: storeInfo?.store_url,
            store_id,
            percentage: 50
          }
        })
      });
    }
    
    // إرسال إشعار عند 100%
    if (percentage === 100) {
      await fetch(`${request.nextUrl.origin}/api/admin/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'store_complete',
          data: {
            store_url: storeInfo?.store_url,
            store_id
          }
        })
      });
    }
  } catch (error) {
  }
}

export async function POST(request: NextRequest) {
  try {
    const { store_id, task_id } = await request.json();

    if (!store_id || !task_id) {
      return NextResponse.json(
        { error: 'store_id and task_id are required' },
        { status: 400 }
      );
    }

    const { data: existingProgress, error: fetchError } = await supabase
      .from('tasks_progress')
      .select('id, store_id, task_id, is_done')
      .eq('store_id', store_id)
      .eq('task_id', task_id)
      .single();

    if (existingProgress) {
      const newIsDone = !existingProgress.is_done;
      
      const { error: updateError } = await supabase
        .from('tasks_progress')
        .update({
          is_done: newIsDone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      // تحديث بداية الاشتراك إذا كانت مهمة إطلاق الحملات
      await updateSubscriptionStartDate(store_id, task_id, newIsDone);
      
      // التحقق من المراحل وإرسال إشعارات
      await checkAndSendMilestoneNotification(request, store_id, newIsDone);

      return NextResponse.json({
        success: true,
        is_done: newIsDone,
      });
    }

    const { error: insertError } = await supabase
      .from('tasks_progress')
      .insert([
        {
          store_id,
          task_id,
          is_done: true,
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create progress' },
        { status: 500 }
      );
    }

    // تحديث بداية الاشتراك إذا كانت مهمة إطلاق الحملات
    await updateSubscriptionStartDate(store_id, task_id, true);
    
    // التحقق من المراحل وإرسال إشعارات
    await checkAndSendMilestoneNotification(request, store_id, true);

    return NextResponse.json({ success: true, is_done: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
