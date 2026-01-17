'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TasksByCategory } from '@/types';

interface StoreDetails {
  store_url: string;
  created_at: string;
}

export default function StoreDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/tasks?store_id=${storeId}`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks);
        setStoreDetails({
          store_url: 'Store Details',
          created_at: new Date().toISOString(),
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch store data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">تفاصيل المتجر</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            العودة للوحة الإدارة
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(tasks).map(([category, categoryTasks]) => (
            <div key={category} className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                {category}
              </h3>
              <div className="space-y-3">
                {categoryTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={task.is_done}
                      disabled
                      className="w-5 h-5 text-blue-600 rounded cursor-not-allowed"
                    />
                    <span
                      className={`flex-1 ${
                        task.is_done
                          ? 'text-gray-400 line-through'
                          : 'text-gray-700'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.is_done && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        مكتمل
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
