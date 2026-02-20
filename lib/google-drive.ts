// lib/google-drive.ts
// Google Drive API Integration Service
// This handles all interactions with Google Drive API v3

import { google } from 'googleapis';

// Types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface DriveListResponse {
  files: DriveFile[];
  folders: DriveFolder[];
  currentFolder: {
    id: string;
    name: string;
  };
  breadcrumb: { id: string; name: string }[];
}

// Initialize Google Drive client using Service Account
function getDriveClient() {
  const credentials = {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID || '',
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

// Get or create a store-specific folder inside the main designs folder
export async function getStoreDriveFolder(storeId: string, storeName?: string): Promise<string> {
  const drive = getDriveClient();
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  // Search for existing store folder
  const searchResponse = await drive.files.list({
    q: `'${mainFolderId}' in parents and name = '${storeId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create store folder if it doesn't exist
  const folderName = storeName ? `${storeName} - ${storeId}` : storeId;
  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [mainFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  return createResponse.data.id!;
}

// List files and folders in a specific Drive folder
export async function listDriveFiles(folderId: string): Promise<DriveListResponse> {
  const drive = getDriveClient();

  // Get current folder info
  const folderInfo = await drive.files.get({
    fileId: folderId,
    fields: 'id, name, parents',
    supportsAllDrives: true,
  });

  // List all items in the folder
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)',
    orderBy: 'folder,name',
    pageSize: 1000,
    supportsAllDrives: true,
  });

  const allFiles = response.data.files || [];

  const folders: DriveFolder[] = allFiles
    .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
    .map(f => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      createdTime: f.createdTime || undefined,
      modifiedTime: f.modifiedTime || undefined,
      webViewLink: f.webViewLink || undefined,
    }));

  const files: DriveFile[] = allFiles
    .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
    .map(f => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: f.size || undefined,
      createdTime: f.createdTime || undefined,
      modifiedTime: f.modifiedTime || undefined,
      webViewLink: f.webViewLink || undefined,
      webContentLink: f.webContentLink || undefined,
      iconLink: f.iconLink || undefined,
      thumbnailLink: f.thumbnailLink || undefined,
      parents: f.parents || undefined,
    }));

  // Build breadcrumb
  const breadcrumb = await buildBreadcrumb(drive, folderId);

  return {
    files,
    folders,
    currentFolder: {
      id: folderInfo.data.id!,
      name: folderInfo.data.name!,
    },
    breadcrumb,
  };
}

// Build breadcrumb path from current folder to root store folder
async function buildBreadcrumb(
  drive: ReturnType<typeof google.drive>,
  folderId: string
): Promise<{ id: string; name: string }[]> {
  const breadcrumb: { id: string; name: string }[] = [];
  let currentId = folderId;
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  // Walk up the folder tree (max 10 levels to prevent infinite loops)
  for (let i = 0; i < 10; i++) {
    try {
      const response = await drive.files.get({
        fileId: currentId,
        fields: 'id, name, parents',
        supportsAllDrives: true,
      });

      breadcrumb.unshift({
        id: response.data.id!,
        name: response.data.name!,
      });

      // Stop if we reached the main folder or no parent
      if (currentId === mainFolderId || !response.data.parents || response.data.parents.length === 0) {
        break;
      }

      currentId = response.data.parents[0];
    } catch {
      break;
    }
  }

  return breadcrumb;
}

// Upload a file to Google Drive
export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<DriveFile> {
  const drive = getDriveClient();

  const { Readable } = require('stream');
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink',
    supportsAllDrives: true,
  });

  return {
    id: response.data.id!,
    name: response.data.name!,
    mimeType: response.data.mimeType!,
    size: response.data.size || undefined,
    createdTime: response.data.createdTime || undefined,
    modifiedTime: response.data.modifiedTime || undefined,
    webViewLink: response.data.webViewLink || undefined,
    webContentLink: response.data.webContentLink || undefined,
    iconLink: response.data.iconLink || undefined,
    thumbnailLink: response.data.thumbnailLink || undefined,
  };
}

// Create a new folder in Google Drive
export async function createDriveFolder(
  parentFolderId: string,
  folderName: string
): Promise<DriveFolder> {
  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink',
    supportsAllDrives: true,
  });

  return {
    id: response.data.id!,
    name: response.data.name!,
    mimeType: response.data.mimeType!,
    createdTime: response.data.createdTime || undefined,
    modifiedTime: response.data.modifiedTime || undefined,
    webViewLink: response.data.webViewLink || undefined,
  };
}

// Delete a file or folder from Google Drive
export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}

// Rename a file or folder
export async function renameDriveFile(fileId: string, newName: string): Promise<DriveFile> {
  const drive = getDriveClient();

  const response = await drive.files.update({
    fileId,
    requestBody: {
      name: newName,
    },
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  return {
    id: response.data.id!,
    name: response.data.name!,
    mimeType: response.data.mimeType!,
    size: response.data.size || undefined,
    createdTime: response.data.createdTime || undefined,
    modifiedTime: response.data.modifiedTime || undefined,
    webViewLink: response.data.webViewLink || undefined,
    webContentLink: response.data.webContentLink || undefined,
  };
}
