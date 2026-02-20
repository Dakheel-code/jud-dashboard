// app/api/drive/route.ts
// API Route for Google Drive operations (list, upload, create folder, delete)

import { NextRequest, NextResponse } from 'next/server';
import {
  getStoreDriveFolder,
  listDriveFiles,
  uploadFileToDrive,
  createDriveFolder,
  deleteDriveFile,
  renameDriveFile,
} from '@/lib/google-drive';

// GET - List files in a folder
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const folderId = searchParams.get('folder_id');
    const storeName = searchParams.get('store_name') || undefined;

    if (!storeId) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // If no specific folder, get the store's root folder
    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await getStoreDriveFolder(storeId, storeName);
    }

    const result = await listDriveFiles(targetFolderId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Drive list error:', error);
    const msg = error.message || 'Failed to list files';
    const detail = error.errors?.[0]?.message || error.code || '';
    return NextResponse.json(
      { error: msg, detail },
      { status: 500 }
    );
  }
}

// POST - Upload file or create folder
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle folder creation (JSON body)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { store_id, folder_id, folder_name, action } = body;

      if (!store_id) {
        return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
      }

      if (action === 'create_folder') {
        if (!folder_name) {
          return NextResponse.json({ error: 'folder_name is required' }, { status: 400 });
        }

        let parentFolderId = folder_id;
        if (!parentFolderId) {
          parentFolderId = await getStoreDriveFolder(store_id);
        }

        const folder = await createDriveFolder(parentFolderId, folder_name);
        return NextResponse.json({ success: true, folder });
      }

      if (action === 'rename') {
        const { file_id, new_name } = body;
        if (!file_id || !new_name) {
          return NextResponse.json({ error: 'file_id and new_name are required' }, { status: 400 });
        }
        const file = await renameDriveFile(file_id, new_name);
        return NextResponse.json({ success: true, file });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Handle file upload (multipart form data)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const storeId = formData.get('store_id') as string;
    const folderId = formData.get('folder_id') as string | null;

    if (!file || !storeId) {
      return NextResponse.json(
        { error: 'file and store_id are required' },
        { status: 400 }
      );
    }

    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = await getStoreDriveFolder(storeId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await uploadFileToDrive(
      targetFolderId,
      file.name,
      buffer,
      file.type || 'application/octet-stream'
    );

    return NextResponse.json({ success: true, file: uploadedFile });
  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a file or folder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('file_id');

    if (!fileId) {
      return NextResponse.json({ error: 'file_id is required' }, { status: 400 });
    }

    await deleteDriveFile(fileId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Drive delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
