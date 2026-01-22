/**
 * دالة للحصول على رابط صورة المستخدم من مصادر متعددة
 * تدعم بيانات Google OAuth وبيانات Supabase
 */
export function getAvatarUrl(user: any): string | null {
  if (!user) return null;

  // 1. مباشرة من avatar
  if (user.avatar) return user.avatar;

  // 2. من image (NextAuth)
  if (user.image) return user.image;

  // 3. من user_metadata (Supabase)
  if (user.user_metadata) {
    if (user.user_metadata.avatar_url) return user.user_metadata.avatar_url;
    if (user.user_metadata.picture) return user.user_metadata.picture;
  }

  // 4. من identities (Supabase OAuth)
  if (user.identities && user.identities.length > 0) {
    const identity = user.identities[0];
    if (identity.identity_data) {
      if (identity.identity_data.avatar_url) return identity.identity_data.avatar_url;
      if (identity.identity_data.picture) return identity.identity_data.picture;
    }
  }

  // 5. من picture (Google OAuth مباشرة)
  if (user.picture) return user.picture;

  return null;
}

/**
 * الحصول على الحرف الأول من الاسم للـ avatar الافتراضي
 */
export function getAvatarInitial(user: any): string {
  if (!user) return 'م';
  
  if (user.name && user.name.length > 0) {
    return user.name.charAt(0).toUpperCase();
  }
  
  if (user.username && user.username.length > 0) {
    return user.username.charAt(0).toUpperCase();
  }
  
  if (user.email && user.email.length > 0) {
    return user.email.charAt(0).toUpperCase();
  }
  
  return 'م';
}
