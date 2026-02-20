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
    type: 'service_account',
    project_id: 'jud-drive',
    private_key_id: 'c75e3643247a63717ba727c7e57f2597f729e250',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDjV7CfKogAR890\nEJoe9IrltImfofNyskUXX9xJDV9DPNs+pU4RUbc83UIoR3JUPuYbqXZvBPhB7/My\n2tXo29NaJSlLqQMcXNrgT0w1/wG+5axEhPYzmTfuAH4lN43ldB65g3wbgTTHaaZN\nBO3MpZXlsbXLnisCJcodxP0F+jDOyl35ddEIpkBkBsRZcW5+iutpk/uFCv3UmA3l\n80MR5G6jRu8iN9Fa9M6Rq9yCXdl18Qd+Ov2S96NKOScqnz0xr/WfSg62SUb7LdqL\n/eggzRaMMG++NQHvhQebsnaf61LlKlusErY1lIOG4nN+xLE1kNQa17yl4LOzz+Lo\nSLznh4kJAgMBAAECggEAF6Q8mIy8eGT/WJdKY7o0AIe6ARj/H1gVEcV0+77Rf4VC\nWn0nxWrNRp3OvbASXlrtJIbGq2xlobvBe3Ig6RaFH9x58yWIDojEdSuh5gKXDKJH\nPBfkn4CJPa2c8KNalPgyosGe5CBXW/5rXhqLXSsCD9EfceWInPBPmLFty5OVREe6\ndS0H9fuZ/riLYqFoI7I73zz5Kg8H19I1WrdYHm3+brR9FaTpWzYMXk9EdAdphXb4\nzl7t3ccJB+BxEPSxhsV+P9bWydjYUewNcR1Z0v3uTAou5JoDjXmI7a2+JTTpKGr8\ncrGYE4S2GmqwRplKpHBYi4zv2hDLHmax9oNqJ23lwQKBgQD3rdKy6B+3eLVQ4Meo\n7crf5x0rVQF05VVxRKTL7uBaa/xlJsZINxMz6JkntqoSsohLP0B6Jjlr2WlZF1a5\nKfAqGtf6DIcsEZJPgI1S+ScWSbO1IpFrIIzo88W+s1vHplkWO5oWBmP3p/sA1cen\ngxIgVn7vX05/oBQmfSVjTA5BKQKBgQDq+vZJOHD5gGwbdufQvIs11acdAJ3C7+pl\n+qIAe/0Wi/rBC1eUbFWJ7nmD4x5LFT1vG3amS0mjXxB4tVHLX23x4BOpag5Z86Hb\n2tT2USe5Bd73tkPh9AzBOEWsf1qms2qbktIgte95Pn/5T+CkBlq3twgS2e8ZRzEn\nMT+9wXKk4QKBgQCevhXQ/N13JjJvx+Gv79ibcPFNGIp6dZIxqqFE47F/wr5dxmBH\nYKU6G9YtkfGnUi3wrHWS1HTxHsNaio7W1n5LPjE23li0cf6oXeg2SeI3cr1vVtyF\nILOviq4u753fdEqc6U5011uzG0LQ4jO4tVUkzMtGeHtDaUIA+SzBW7m3IQKBgBRb\ntebWGwOi2rrubFsrWqxJXHcozIJNIvO+6TY9h8niStFa2DWlxSt0G9cPYFqE9pOf\nv4Hc1/5tiBHNM87475+bGFj/NUsZzpYruXO1yElBdvXjNrJm4IwFAhRV3FbBCKV9\n7PKkkKDih1fkUcQkQMvV8b8gXpTEFEAfBjS8g+BBAoGBAI8OtxUAuQLg0FMa1/MH\nndL4R21cBtDWITyiVRnxI+11jaVDwz/yFi/5N0UjtdCKKM/8UepcRe79LYiZFpe7\nTzos+zjiZ61BtD/MBEd39JtWfRCUzQuXO+aPDMiBIi52LS6wjFgmvFLRCyWBz3VQ\nZst1Z5LT/BU/x24KgVc5tdvC\n-----END PRIVATE KEY-----\n',
    client_email: 'jud-drive@jud-drive.iam.gserviceaccount.com',
    client_id: '114266824756162535956',
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

  const sharedDriveParams = {
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive' as const,
    driveId: mainFolderId,
  };

  // Search by storeId first
  const searchById = await drive.files.list({
    ...sharedDriveParams,
    q: `'${mainFolderId}' in parents and name = '${storeId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });
  if (searchById.data.files && searchById.data.files.length > 0) {
    return searchById.data.files[0].id!;
  }

  // Search by storeName if provided
  if (storeName) {
    const searchByName = await drive.files.list({
      ...sharedDriveParams,
      q: `'${mainFolderId}' in parents and name = '${storeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });
    if (searchByName.data.files && searchByName.data.files.length > 0) {
      return searchByName.data.files[0].id!;
    }
  }

  // Create store folder named after the store
  const folderName = storeName || storeId;
  const createResponse = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [mainFolderId],
    },
    fields: 'id',
  });

  return createResponse.data.id!;
}

// List files and folders in a specific Drive folder
export async function listDriveFiles(folderId: string): Promise<DriveListResponse> {
  const drive = getDriveClient();
  const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const isSharedDrive = folderId === mainFolderId;

  // For Shared Drive root, use drives.get instead of files.get
  let folderName = 'التصاميم';
  let folderParents: string[] | undefined;
  if (!isSharedDrive) {
    try {
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, parents',
        supportsAllDrives: true,
      });
      folderName = folderInfo.data.name || 'التصاميم';
      folderParents = folderInfo.data.parents || undefined;
    } catch {
      folderName = 'التصاميم';
    }
  }

  // List all items in the folder
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)',
    orderBy: 'folder,name',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...(isSharedDrive ? { driveId: folderId, corpora: 'drive' } : {}),
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
      id: folderId,
      name: folderName,
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
