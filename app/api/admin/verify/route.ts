import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const headerToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    // التحقق من وجود token
    if (!token && !headerToken) {
      return NextResponse.json(
        { authenticated: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // في الإنتاج، يجب التحقق من الـ token في قاعدة البيانات
    // حالياً نتحقق فقط من وجوده
    return NextResponse.json({
      authenticated: true,
      message: 'مصرح'
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'حدث خطأ' },
      { status: 500 }
    );
  }
}
