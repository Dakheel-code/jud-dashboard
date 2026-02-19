import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("slack_webhooks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ webhooks: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: "فشل في جلب الإعدادات", detail: e?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  try {
    const body = await request.json();
    const {
      name,
      webhook_url,
      channel_name,
      notify_new_store,
      notify_store_complete,
      notify_milestone,
      notify_help_request,
    } = body;

    if (!name || !webhook_url) {
      return NextResponse.json(
        { error: "الاسم ورابط Webhook مطلوبان" },
        { status: 400 }
      );
    }

    if (!webhook_url.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json({ error: "رابط Webhook غير صالح" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("slack_webhooks")
      .insert({
        name,
        webhook_url,
        channel_name,
        notify_new_store: notify_new_store ?? true,
        notify_store_complete: notify_store_complete ?? true,
        notify_milestone: notify_milestone ?? true,
        notify_help_request: notify_help_request ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ webhook: data, message: "تم إضافة Webhook بنجاح" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "فشل في إضافة Webhook", detail: e?.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف Webhook مطلوب" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("slack_webhooks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ webhook: data, message: "تم تحديث Webhook بنجاح" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "فشل في تحديث Webhook", detail: e?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرف Webhook مطلوب" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { error } = await supabase.from("slack_webhooks").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "تم حذف Webhook بنجاح" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "فشل في حذف Webhook", detail: e?.message },
      { status: 500 }
    );
  }
}
