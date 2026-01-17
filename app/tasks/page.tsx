'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TasksByCategory, TaskWithProgress } from '@/types';
import { 
  CheckIcon, 
  LogoutIcon, 
  ChartIcon, 
  getCategoryIcon, 
  SparklesIcon, 
  CelebrationIcon,
  LoadingSpinner,
  ErrorIcon 
} from '@/components/icons';
import Confetti from '@/components/Confetti';
import ShareProgress from '@/components/ShareProgress';

interface TasksStats {
  total: number;
  completed: number;
  percentage: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  percentage: number;
}

// أيقونات SVG للإنجازات
const AchievementIcons = {
  start: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  quarter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  half: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10"/>
      <path d="M18 20V4"/>
      <path d="M6 20v-4"/>
    </svg>
  ),
  threequarter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  complete: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6"/>
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
};

const achievements: Achievement[] = [
  { id: 'start', title: 'البداية', description: 'أكمل أول مهمة', icon: 'start', unlocked: false, percentage: 5 },
  { id: 'quarter', title: 'ربع الطريق', description: 'أكمل 25% من المهام', icon: 'quarter', unlocked: false, percentage: 25 },
  { id: 'half', title: 'نصف الطريق', description: 'أكمل 50% من المهام', icon: 'half', unlocked: false, percentage: 50 },
  { id: 'threequarter', title: 'قريب من النهاية', description: 'أكمل 75% من المهام', icon: 'threequarter', unlocked: false, percentage: 75 },
  { id: 'complete', title: 'البطل', description: 'أكمل جميع المهام', icon: 'complete', unlocked: false, percentage: 100 },
];

const getMotivationalMessage = (percentage: number): string => {
  if (percentage === 0) return 'ابدأ رحلتك نحو النجاح! 🚀';
  if (percentage < 25) return 'بداية رائعة! استمر في التقدم 💪';
  if (percentage < 50) return 'أنت في منتصف الطريق! لا تتوقف 🌟';
  if (percentage < 75) return 'رائع! أنت قريب جداً من الهدف 🎯';
  if (percentage < 100) return 'أنت على وشك الانتهاء! قوة أخيرة 🔥';
  return 'مبروك! أكملت جميع المهام 🎉🏆';
};

const getGreeting = (): string => {
  // توقيت السعودية UTC+3
  const now = new Date();
  const saudiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const hour = saudiTime.getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'صباح الخير';
  } else if (hour >= 12 && hour < 17) {
    return 'مساء الخير';
  } else if (hour >= 17 && hour < 21) {
    return 'مساء الخير';
  } else {
    return 'مساء الخير';
  }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [stats, setStats] = useState<TasksStats>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animatingTasks, setAnimatingTasks] = useState<Set<string>>(new Set());
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithProgress | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyToNotification, setReplyToNotification] = useState<any>(null);
  const [notificationReply, setNotificationReply] = useState('');
  const [sendingNotifReply, setSendingNotifReply] = useState(false);
  const [likedNotifications, setLikedNotifications] = useState<Set<string>>(new Set());
  const [storeRank, setStoreRank] = useState<{ rank: number; total_stores: number; is_top_3: boolean } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());
  const [categoryCompleteMessage, setCategoryCompleteMessage] = useState<{ category: string; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storeId = localStorage.getItem('store_id');
    const savedStoreUrl = localStorage.getItem('store_url');
    
    if (!storeId) {
      router.push('/');
      return;
    }

    if (savedStoreUrl) {
      setStoreUrl(savedStoreUrl);
      setStoreName(extractStoreName(savedStoreUrl));
      fetchStoreMetadata(savedStoreUrl);
    }

    // تحميل الإنجازات المحفوظة لهذا المتجر
    const savedAchievements = localStorage.getItem(`achievements_${storeId}`);
    if (savedAchievements) {
      setUnlockedAchievements(new Set(JSON.parse(savedAchievements)));
    }

    fetchTasks(storeId);
    fetchNotifications(storeId);
    fetchStoreRank(storeId);
  }, [router]);

  const fetchStoreRank = async (storeId: string) => {
    try {
      const response = await fetch(`/api/store/rank?store_id=${storeId}`);
      const data = await response.json();
      if (data.rank) {
        setStoreRank(data);
      }
    } catch (err) {
      console.error('Failed to fetch store rank:', err);
    }
  };

  const fetchStoreMetadata = async (url: string) => {
    try {
      // التحقق من الـ cache أولاً
      const cachedData = localStorage.getItem(`store_metadata_${url}`);
      if (cachedData) {
        const cached = JSON.parse(cachedData);
        // استخدام الـ cache إذا كان أقل من 24 ساعة
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          setStoreName(cached.name);
          setStoreLogo(cached.logo);
          return;
        }
      }

      const response = await fetch(`/api/store/metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.name) {
        setStoreName(data.name);
      }
      if (data.logo || data.favicon) {
        setStoreLogo(data.logo || data.favicon);
      }

      // حفظ في الـ cache
      localStorage.setItem(`store_metadata_${url}`, JSON.stringify({
        name: data.name,
        logo: data.logo || data.favicon,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to fetch store metadata:', err);
    }
  };

  const fetchNotifications = async (storeId: string) => {
    try {
      const response = await fetch(`/api/notifications?store_id=${storeId}`);
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) return;
    
    const storeId = localStorage.getItem('store_id');
    if (!storeId) {
      alert('خطأ: لم يتم العثور على معرف المتجر');
      return;
    }

    console.log('📤 Sending help request...', { storeId, message: helpMessage });
    setSendingHelp(true);
    
    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          task_id: selectedTask?.id || null,
          message: helpMessage
        })
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (response.ok && data.success) {
        alert('تم إرسال طلب المساعدة بنجاح! سيتم الرد عليك قريباً.');
        setHelpMessage('');
        setShowHelpModal(false);
        setSelectedTask(null);
      } else {
        console.error('❌ Error:', data.error);
        alert(data.error || 'فشل إرسال الطلب');
      }
    } catch (err) {
      console.error('❌ Failed to send help request:', err);
      alert('فشل إرسال الطلب - تحقق من الاتصال');
    } finally {
      setSendingHelp(false);
    }
  };

  const markNotificationsAsRead = async () => {
    const storeId = localStorage.getItem('store_id');
    if (!storeId) return;

    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true, store_id: storeId })
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleLikeNotification = (notifId: string) => {
    setLikedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notifId)) {
        newSet.delete(notifId);
      } else {
        newSet.add(notifId);
      }
      return newSet;
    });
  };

  const handleReplyToNotification = async () => {
    if (!notificationReply.trim() || !replyToNotification) return;
    
    const storeId = localStorage.getItem('store_id');
    if (!storeId) return;

    setSendingNotifReply(true);
    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          task_id: null,
          message: `رد على: "${replyToNotification.message}"\n\n${notificationReply}`
        })
      });

      if (response.ok) {
        alert('تم إرسال ردك بنجاح!');
        setNotificationReply('');
        setReplyToNotification(null);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('فشل إرسال الرد');
    } finally {
      setSendingNotifReply(false);
    }
  };

  const checkAchievements = (percentage: number) => {
    // التحقق من جميع الإنجازات التي يجب فتحها
    const newUnlocked = new Set(unlockedAchievements);
    let latestAchievement: Achievement | null = null;
    
    achievements.forEach(achievement => {
      if (percentage >= achievement.percentage && !newUnlocked.has(achievement.id)) {
        newUnlocked.add(achievement.id);
        latestAchievement = achievement;
      }
    });
    
    // تحديث الإنجازات المفتوحة
    if (newUnlocked.size > unlockedAchievements.size) {
      setUnlockedAchievements(newUnlocked);
      
      // حفظ الإنجازات في localStorage
      const storeId = localStorage.getItem('store_id');
      if (storeId) {
        localStorage.setItem(`achievements_${storeId}`, JSON.stringify([...newUnlocked]));
      }
      
      // عرض آخر إنجاز تم فتحه
      if (latestAchievement) {
        setShowAchievement(latestAchievement);
        setTimeout(() => setShowAchievement(null), 5000);
      }
    }
  };

  const extractStoreName = (domain: string): string => {
    try {
      // الدومين الآن نظيف بالفعل (بدون www أو بروتوكول)
      // نأخذ فقط الجزء الأول قبل النقطة
      const name = domain.split('.')[0];
      
      // تحويل الحرف الأول لكبير
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return 'المتجر';
    }
  };

  const fetchTasks = async (storeId: string) => {
    try {
      const response = await fetch(`/api/tasks?store_id=${storeId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'فشل تحميل المهام');
        setLoading(false);
        return;
      }

      setTasks(data.tasks);
      setStats(data.stats);
      checkAchievements(data.stats.percentage);
      setLoading(false);
    } catch (err) {
      setError('حدث خطأ في الاتصال');
      setLoading(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    const storeId = localStorage.getItem('store_id');
    if (!storeId) return;

    setAnimatingTasks(prev => new Set(prev).add(taskId));

    try {
      const response = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, task_id: taskId }),
      });

      if (response.ok) {
        await fetchTasks(storeId);
        
        // التحقق من إكمال قسم كامل
        checkCategoryCompletion();
        
        setTimeout(() => {
          setAnimatingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }, 600);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setAnimatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // رسائل تحفيزية مخصصة لكل قسم
  const getCategoryCompleteMessage = (category: string): string => {
    const messages: Record<string, string[]> = {
      'الإعدادات الأساسية': [
        '🎉 رائع! أسست متجرك بشكل صحيح',
        '✨ بداية قوية! الأساس متين الآن',
        '🚀 انطلاقة ممتازة! المتجر جاهز للنمو'
      ],
      'تحسين المتجر': [
        '💎 متجرك يلمع الآن! تحسينات رائعة',
        '🌟 أصبح متجرك أكثر احترافية',
        '✨ تحسينات مذهلة! العملاء سيلاحظون الفرق'
      ],
      'التسويق': [
        '📢 أنت الآن جاهز للوصول لعملاء أكثر!',
        '🎯 استراتيجية تسويق قوية!',
        '📈 متجرك في طريقه للانتشار!'
      ],
      'خدمة العملاء': [
        '💬 عملاؤك سيحبون خدمتك الممتازة!',
        '🤝 بنيت ثقة قوية مع عملائك',
        '⭐ خدمة عملاء 5 نجوم!'
      ],
      'التحليلات': [
        '📊 الآن تستطيع اتخاذ قرارات ذكية!',
        '🔍 البيانات في صفك الآن',
        '📈 تحليلات قوية = نمو أسرع!'
      ]
    };
    
    const categoryMessages = messages[category] || [
      '🎉 أحسنت! أكملت هذا القسم بنجاح',
      '✨ عمل رائع! استمر في التقدم',
      '🏆 إنجاز جديد! أنت تتقدم بسرعة'
    ];
    
    return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
  };

  const checkCategoryCompletion = () => {
    // التحقق من الأقسام المكتملة حديثاً
    Object.entries(tasks).forEach(([category, categoryTasks]) => {
      const allCompleted = categoryTasks.every(task => task.is_done);
      if (allCompleted && categoryTasks.length > 0 && !completedCategories.has(category)) {
        // قسم جديد مكتمل!
        setCompletedCategories(prev => new Set(prev).add(category));
        setShowConfetti(true);
        
        // عرض رسالة التهنئة
        const message = getCategoryCompleteMessage(category);
        setCategoryCompleteMessage({ category, message });
        
        // إخفاء الرسالة بعد 5 ثواني
        setTimeout(() => setCategoryCompleteMessage(null), 5000);
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('store_id');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            {/* Rotating glow ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            {/* Logo with pulse */}
            <div className="absolute inset-4 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Loading" 
                className="w-full h-full object-contain animate-pulse"
                style={{ 
                  filter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.8)) drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))',
                  animation: 'pulse 1.5s ease-in-out infinite, scale 2s ease-in-out infinite'
                }}
              />
            </div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
        <style jsx>{`
          @keyframes scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-500 to-pink-500">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <ErrorIcon className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-xl text-red-600 font-semibold">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const categoryColors: Record<string, { bg: string; border: string; icon: string; gradient: string }> = {
    'الإعدادات الأساسية': { 
      bg: 'from-blue-900/30 to-cyan-900/30', 
      border: 'border-blue-500/30', 
      icon: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-500'
    },
    'الإطلاق': { 
      bg: 'from-purple-900/30 to-pink-900/30', 
      border: 'border-purple-500/30', 
      icon: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-500'
    },
    'التسويق': { 
      bg: 'from-green-900/30 to-emerald-900/30', 
      border: 'border-green-500/30', 
      icon: 'text-green-400',
      gradient: 'from-green-500 to-emerald-500'
    },
    'التحسينات': { 
      bg: 'from-orange-900/30 to-amber-900/30', 
      border: 'border-orange-500/30', 
      icon: 'text-orange-400',
      gradient: 'from-orange-500 to-amber-500'
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
            />
            {/* Vertical Divider */}
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-1">
                <span className="text-white">{getGreeting()} </span>
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {storeName || 'المتجر'}
                </span>
              </h1>
              <p className="text-purple-300/80 text-sm">تتبع تقدمك وأكمل مهامك بسهولة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Store Profile */}
            {storeUrl && (
              <a
                href={storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-800/50 rounded-xl transition-all border border-purple-500/30 hover:border-purple-400/50 group"
                title={storeUrl}
              >
                {storeLogo ? (
                  <img 
                    src={storeLogo} 
                    alt={storeName}
                    className="w-8 h-8 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-8 h-8 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-lg flex items-center justify-center ${storeLogo ? 'hidden' : ''}`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium hidden sm:block">{storeName}</span>
                <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    markNotificationsAsRead();
                  }
                }}
                className="relative p-3 text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-800/50 rounded-xl transition-all border border-purple-500/30 hover:border-purple-400/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 sm:w-80 bg-purple-950/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden z-50">
                  <div className="p-4 border-b border-purple-500/20">
                    <h3 className="text-white font-bold">الإشعارات</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-purple-300/60">
                        لا توجد إشعارات
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b border-purple-500/10 hover:bg-purple-900/30 transition-colors ${
                            !notif.is_read ? 'bg-purple-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{notif.title}</p>
                              <p className="text-purple-300/80 text-xs mt-1">{notif.message}</p>
                              <div className="flex items-center justify-between mt-3">
                                <p className="text-purple-400/50 text-xs">
                                  {new Date(notif.created_at).toLocaleString('ar-SA')}
                                </p>
                                <div className="flex items-center gap-2">
                                  {/* Like Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLikeNotification(notif.id);
                                    }}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      likedNotifications.has(notif.id)
                                        ? 'bg-pink-500/20 text-pink-400'
                                        : 'hover:bg-purple-800/50 text-purple-400'
                                    }`}
                                    title="إعجاب"
                                  >
                                    <svg className="w-4 h-4" fill={likedNotifications.has(notif.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                  </button>
                                  {/* Reply Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyToNotification(notif);
                                      setShowNotifications(false);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-purple-800/50 text-purple-400 transition-all"
                                    title="رد"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="group p-3 text-purple-300 hover:text-white bg-purple-900/30 hover:bg-red-900/50 rounded-xl transition-all border border-purple-500/30 hover:border-red-400/50"
              title="تسجيل الخروج"
            >
              <LogoutIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>

        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/50 p-8 mb-8 border border-purple-500/20 animate-slide-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <ChartIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">نسبة الإنجاز</h2>
                <p className="text-sm text-purple-300/70">استمر في التقدم!</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                {stats.percentage}%
              </span>
            </div>
          </div>
          
          <div className="relative w-full bg-purple-950/50 rounded-full h-6 overflow-hidden shadow-inner border border-purple-800/30">
            <div
              className="absolute top-0 right-0 h-6 bg-gradient-to-l from-purple-500 via-violet-500 to-fuchsia-500 rounded-full transition-all duration-700 ease-out shadow-lg shadow-purple-500/50"
              style={{ width: `${stats.percentage}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/30 to-transparent animate-shimmer" />
              {/* Glow pulse */}
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>
            {/* Moving light indicator */}
            {stats.percentage > 0 && stats.percentage < 100 && (
              <div 
                className="absolute top-0 h-6 w-3 bg-gradient-to-l from-white/60 via-white/80 to-white/60 rounded-full animate-progress-glow blur-sm"
                style={{ right: `${stats.percentage - 1}%` }}
              />
            )}
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-purple-300/80 font-medium">
              {stats.completed} من {stats.total} مهمة مكتملة
            </p>
            <div className="flex items-center gap-3">
              <ShareProgress
                storeName={storeName}
                percentage={stats.percentage}
                completedTasks={stats.completed}
                totalTasks={stats.total}
                rank={storeRank?.rank}
                totalStores={storeRank?.total_stores}
              />
              {stats.percentage === 100 && (
                <span className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg animate-bounce flex items-center gap-1">
                  <CelebrationIcon /> مبروك!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rank & Motivational Message */}
        <div className="mb-6 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Store Rank */}
          {storeRank && (
            <div className={`relative overflow-hidden backdrop-blur-xl rounded-2xl p-6 border shadow-lg ${
              storeRank.rank === 1 
                ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-500/30' 
                : storeRank.is_top_3 
                  ? 'bg-gradient-to-r from-purple-900/40 to-violet-900/40 border-purple-500/30'
                  : 'bg-purple-950/40 border-purple-500/20'
            }`}>
              {/* Falling Confetti */}
              {storeRank.rank === 1 && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* Confetti pieces */}
                  <div className="absolute w-2 h-3 bg-yellow-400 rotate-12 animate-confetti-fall" style={{ left: '5%', animationDelay: '0s' }} />
                  <div className="absolute w-1.5 h-2 bg-amber-500 -rotate-45 animate-confetti-fall" style={{ left: '15%', animationDelay: '0.4s' }} />
                  <div className="absolute w-2 h-1 bg-yellow-300 rotate-45 animate-confetti-fall" style={{ left: '25%', animationDelay: '0.8s' }} />
                  <div className="absolute w-1 h-3 bg-amber-400 -rotate-12 animate-confetti-fall" style={{ left: '35%', animationDelay: '1.2s' }} />
                  <div className="absolute w-2 h-2 bg-yellow-500 rotate-90 animate-confetti-fall" style={{ left: '45%', animationDelay: '0.2s' }} />
                  <div className="absolute w-1.5 h-3 bg-amber-300 rotate-30 animate-confetti-fall" style={{ left: '55%', animationDelay: '0.6s' }} />
                  <div className="absolute w-2 h-1.5 bg-yellow-400 -rotate-30 animate-confetti-fall" style={{ left: '65%', animationDelay: '1s' }} />
                  <div className="absolute w-1 h-2 bg-amber-500 rotate-60 animate-confetti-fall" style={{ left: '75%', animationDelay: '1.4s' }} />
                  <div className="absolute w-2 h-2 bg-yellow-300 -rotate-60 animate-confetti-fall" style={{ left: '85%', animationDelay: '0.3s' }} />
                  <div className="absolute w-1.5 h-1 bg-amber-400 rotate-15 animate-confetti-fall" style={{ left: '95%', animationDelay: '0.7s' }} />
                </div>
              )}
              <div className="relative flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  storeRank.rank === 1 
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/50' 
                    : storeRank.rank === 2
                      ? 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-lg shadow-gray-400/50'
                      : storeRank.rank === 3
                        ? 'bg-gradient-to-br from-amber-600 to-amber-700 shadow-lg shadow-amber-600/50'
                        : 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-lg shadow-purple-500/50'
                }`}>
                  <span className={`text-2xl font-bold ${storeRank.rank <= 3 ? 'text-white' : 'text-white'}`}>
                    #{storeRank.rank}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">ترتيبك بين المتاجر</h3>
                  <p className={`text-sm ${storeRank.rank === 1 ? 'text-yellow-300' : 'text-purple-300/80'}`}>
                    {storeRank.rank === 1 
                      ? '🏆 أنت في المركز الأول!' 
                      : storeRank.is_top_3 
                        ? '⭐ أنت ضمن أفضل 3 متاجر!'
                        : `من أصل ${storeRank.total_stores} متجر`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-purple-900/40 to-fuchsia-900/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{stats.percentage >= 100 ? '🏆' : stats.percentage >= 75 ? '🔥' : stats.percentage >= 50 ? '⭐' : stats.percentage >= 25 ? '💪' : '🚀'}</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{getMotivationalMessage(stats.percentage)}</h3>
                <p className="text-purple-300/80 text-sm">استمر في العمل لتحقيق أهدافك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Display */}
        <div className="mb-6 animate-fade-in">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              الإنجازات
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {achievements.map((achievement, index) => {
                const isUnlocked = unlockedAchievements.has(achievement.id);
                const IconComponent = AchievementIcons[achievement.icon as keyof typeof AchievementIcons];
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-500 transform hover:scale-105 group ${
                      isUnlocked
                        ? 'bg-transparent border-yellow-500/60 shadow-xl shadow-yellow-500/20'
                        : 'bg-purple-900/20 border-purple-700/30 opacity-50 grayscale'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    title={achievement.description}
                  >
                    {/* Glow effect for unlocked */}
                    {isUnlocked && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-amber-400/10 animate-pulse" />
                    )}
                    
                    {/* Icon */}
                    <div className={`relative flex justify-center mb-3 ${isUnlocked ? 'animate-bounce' : ''}`} style={{ animationDuration: '2s' }}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isUnlocked 
                          ? 'bg-yellow-500/20 border-2 border-yellow-400/50' 
                          : 'bg-purple-800/50'
                      }`}>
                        {IconComponent && IconComponent('w-7 h-7 text-white')}
                      </div>
                    </div>
                    
                    {/* Title */}
                    <div className={`text-sm text-center font-bold truncate ${isUnlocked ? 'text-yellow-300' : 'text-purple-400'}`}>
                      {achievement.title}
                    </div>
                    
                    {/* Description */}
                    <div className={`text-xs text-center mt-1 ${isUnlocked ? 'text-yellow-200/70' : 'text-purple-500'}`}>
                      {achievement.description}
                    </div>
                    
                    {/* Unlocked badge */}
                    {isUnlocked && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-pulse">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    {/* Locked overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-purple-950/30">
                        <svg className="w-6 h-6 text-purple-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(tasks).map(([category, categoryTasks], index) => {
            const colors = categoryColors[category] || categoryColors['الإعدادات الأساسية'];
            const completedCount = categoryTasks.filter(t => t.is_done).length;
            const categoryPercentage = Math.round((completedCount / categoryTasks.length) * 100);
            
            return (
              <div 
                key={category} 
                className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20 hover:shadow-purple-900/50 hover:border-purple-400/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30`}>
                      {getCategoryIcon(category, "w-6 h-6 text-white")}
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      {category}
                    </h3>
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${colors.icon}`}>
                      {completedCount}/{categoryTasks.length}
                    </div>
                    <div className="text-xs text-purple-400/70">{categoryPercentage}%</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryTasks.map((task, taskIndex) => {
                    const isAnimating = animatingTasks.has(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                          task.is_done 
                            ? `bg-gradient-to-r ${colors.bg} ${colors.border} opacity-60` 
                            : 'bg-purple-900/20 border-purple-700/30 hover:border-purple-500/50 hover:bg-purple-900/30 hover:shadow-lg hover:shadow-purple-500/20'
                        } ${isAnimating ? 'scale-105 shadow-2xl shadow-purple-500/50' : ''}`}
                        style={{ animationDelay: `${taskIndex * 50}ms` }}
                      >
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={task.is_done}
                            onChange={() => handleToggle(task.id)}
                            className="peer sr-only"
                          />
                          <div 
                            onClick={() => handleToggle(task.id)}
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                            task.is_done 
                              ? `bg-gradient-to-br ${colors.gradient} border-transparent shadow-lg shadow-purple-500/50` 
                              : 'border-purple-500/40 bg-purple-950/50 group-hover:border-purple-400/60'
                          } ${isAnimating ? 'animate-bounce' : ''}`}>
                            {task.is_done && (
                              <CheckIcon className="w-5 h-5 text-white animate-scale-in" />
                            )}
                          </div>
                        </div>
                        
                        <span className={`flex-1 text-lg transition-all duration-300 ${
                          task.is_done
                            ? 'text-purple-400/60 line-through'
                            : 'text-purple-100 font-medium group-hover:text-white'
                        }`}>
                          {task.title}
                        </span>

                        {/* أيقونة للإشارة إلى وجود تفاصيل */}
                        <svg className="w-5 h-5 text-purple-400/50 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>

                        {task.is_done && (
                          <SparklesIcon className="animate-scale-in" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="bg-purple-950/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-purple-500/30 max-w-lg w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedTask.is_done 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-br from-purple-500 to-fuchsia-500'
                }`}>
                  {selectedTask.is_done ? (
                    <CheckIcon className="w-6 h-6 text-white" />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  selectedTask.is_done 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {selectedTask.is_done ? 'مكتملة ✓' : 'قيد التنفيذ'}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-purple-400 hover:text-white transition-colors p-2 hover:bg-purple-800/50 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Task Title */}
            <h2 className="text-2xl font-bold text-white mb-4">{selectedTask.title}</h2>

            {/* Task Description */}
            <div className="bg-purple-900/30 rounded-2xl p-5 mb-6 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300 mb-2">شرح المهمة:</h3>
              <p className="text-purple-100 leading-relaxed">
                {selectedTask.description || 'قم بإكمال هذه المهمة لتحسين متجرك وزيادة مبيعاتك. هذه المهمة مهمة لنجاح متجرك الإلكتروني.'}
              </p>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2 mb-6 text-sm text-purple-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>القسم: {selectedTask.category}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  handleToggle(selectedTask.id);
                  setSelectedTask(null);
                }}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                  selectedTask.is_done
                    ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 border border-purple-500/30'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30'
                }`}
              >
                {selectedTask.is_done ? (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    إلغاء الإكمال
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-6 h-6" />
                    تم التنفيذ
                  </>
                )}
              </button>

              {/* Help Button */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-full py-3 rounded-xl font-medium text-amber-300 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                طلب مساعدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Request Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-purple-950/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-amber-500/30 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">طلب مساعدة</h2>
                {selectedTask && (
                  <p className="text-amber-300/80 text-sm">بخصوص: {selectedTask.title}</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white mb-2 text-sm font-medium">اكتب استفسارك</label>
              <textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="اكتب استفسارك أو المشكلة التي تواجهها..."
                rows={4}
                className="w-full px-4 py-3 bg-purple-900/30 border-2 border-amber-500/30 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-400 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendHelp}
                disabled={sendingHelp || !helpMessage.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingHelp ? (
                  'جاري الإرسال...'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    إرسال
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowHelpModal(false);
                  setHelpMessage('');
                }}
                className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl font-medium hover:bg-purple-900/70 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply to Notification Modal */}
      {replyToNotification && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setReplyToNotification(null)}
        >
          <div 
            className="bg-purple-950/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-green-500/30 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">رد على الإشعار</h2>
              </div>
            </div>

            {/* Original Message */}
            <div className="bg-green-900/20 rounded-xl p-4 mb-4 border border-green-500/20">
              <div className="text-green-400 text-xs mb-1">الرسالة الأصلية:</div>
              <p className="text-green-100 text-sm">{replyToNotification.message}</p>
            </div>

            <div className="mb-6">
              <label className="block text-white mb-2 text-sm font-medium">ردك</label>
              <textarea
                value={notificationReply}
                onChange={(e) => setNotificationReply(e.target.value)}
                placeholder="اكتب ردك هنا..."
                rows={4}
                className="w-full px-4 py-3 bg-purple-900/30 border-2 border-green-500/30 text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-400 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReplyToNotification}
                disabled={sendingNotifReply || !notificationReply.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingNotifReply ? (
                  'جاري الإرسال...'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    إرسال الرد
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setReplyToNotification(null);
                  setNotificationReply('');
                }}
                className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl font-medium hover:bg-purple-900/70 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confetti */}
      <Confetti isActive={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Category Complete Popup */}
      {categoryCompleteMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 shadow-2xl shadow-green-500/50 border-2 border-green-300 max-w-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">أكملت قسم {categoryCompleteMessage.category}!</h3>
                <p className="text-sm text-green-100">{categoryCompleteMessage.message}</p>
              </div>
            </div>
            <button
              onClick={() => setCategoryCompleteMessage(null)}
              className="absolute top-2 left-2 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Achievement Popup */}
      {showAchievement && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-6 shadow-2xl shadow-yellow-500/50 border-2 border-yellow-300">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
                {AchievementIcons[showAchievement.icon as keyof typeof AchievementIcons]?.('w-10 h-10 text-white')}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">إنجاز جديد!</h3>
                <p className="text-xl font-bold text-yellow-100">{showAchievement.title}</p>
                <p className="text-sm text-yellow-50/80">{showAchievement.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from { 
            transform: scale(0);
          }
          to { 
            transform: scale(1);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100vh) translateX(50px);
          }
        }
        @keyframes confetti-fall {
          0% {
            top: -10%;
            opacity: 1;
          }
          100% {
            top: 110%;
            opacity: 0.7;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes progress-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        .animate-progress-glow {
          animation: progress-glow 1.5s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-float {
          animation: float linear infinite;
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
