'use client';

import { useEffect, useState } from 'react';
import AnnouncementBell from './AnnouncementBell';

export default function GlobalAnnouncementBell() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    setIsLoggedIn(!!userStr);

    // Listen for storage changes
    const handleStorage = () => {
      const userStr = localStorage.getItem('admin_user');
      setIsLoggedIn(!!userStr);
    };

    window.addEventListener('storage', handleStorage);
    
    // Check periodically
    const interval = setInterval(() => {
      const userStr = localStorage.getItem('admin_user');
      setIsLoggedIn(!!userStr);
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Only show if logged in
  if (!isLoggedIn) return null;

  return <AnnouncementBell />;
}
