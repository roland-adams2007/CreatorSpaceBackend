import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseBase64Data = (base64String) => {
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    return { mimeType, buffer };
  } catch (error) {
    return null;
  }
};

const extractFileInfo = (fileName) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  let name, extension, originalName;

  if (lastDotIndex === -1) {
    name = fileName;
    extension = "";
    originalName = fileName;
  } else {
    name = fileName.substring(0, lastDotIndex);
    extension = fileName.substring(lastDotIndex + 1).toLowerCase();
    originalName = fileName;
  }

  return { name, extension, originalName };
};

const determineFileType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "presentation";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "document";
  if (mimeType.includes("text/")) return "text";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "archive";
  return "other";
};

const getUploadsDir = () => {
  return path.join(__dirname, "..", "public/uploads");
};

const getUserUploadDir = (userId) => {
  return path.join(getUploadsDir(), userId.toString());
};

const getFolderPath = (userId, folderId) => {
  if (!folderId) {
    return getUserUploadDir(userId);
  }
  return path.join(getUserUploadDir(userId), folderId.toString());
};

const saveFileToDisk = (buffer, fileName, userId, folderId = null) => {
  const userDir = getUserUploadDir(userId);
  const folderDir = folderId
    ? path.join(userDir, folderId.toString())
    : userDir;
  const filePath = path.join(folderDir, fileName);
  const relativePath = `/public/uploads/${userId}/${folderId ? folderId + "/" : ""}${fileName}`;

  fs.mkdir(folderDir, { recursive: true });
  fs.writeFile(filePath, buffer);

  return relativePath;
};

const createFolderOnDisk = (id, userId, parentId = null) => {
  const baseDir = parentId
    ? path.join(getUserUploadDir(userId), parentId.toString())
    : getUserUploadDir(userId);

  const folderPath = path.join(baseDir, String(id));
  const relativePath = `/public/uploads/${userId}/${parentId ? parentId + "/" : ""}${id}`;

  fs.mkdir(folderPath, { recursive: true });

  return relativePath;
};

const deleteFileFromDisk = (filePath) => {
  const absolutePath = path.join(__dirname, "..", filePath);

  try {
    fs.access(absolutePath);
    fs.unlink(absolutePath);
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

const deleteFolderFromDisk = (folderPath) => {
  const absolutePath = path.join(__dirname, "..", folderPath);

  try {
    fs.access(absolutePath);
    fs.rm(absolutePath, { recursive: true, force: true });
  } catch (error) {
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
};

const moveFileOnDisk = (oldFilePath, userId, newFolderId, fileName) => {
  const oldAbsolutePath = path.join(__dirname, "..", oldFilePath);
  const newDir = newFolderId
    ? path.join(getUserUploadDir(userId), newFolderId.toString())
    : getUserUploadDir(userId);

  const newAbsolutePath = path.join(newDir, fileName);
  const newRelativePath = `/public/uploads/${userId}/${newFolderId ? newFolderId + "/" : ""}${fileName}`;

  fs.mkdir(newDir, { recursive: true });
  fs.rename(oldAbsolutePath, newAbsolutePath);

  return newRelativePath;
};

const moveFolderOnDisk = (folderName, userId, newParentId) => {
  const oldDir = path.join(getUserUploadDir(userId), folderName);
  const newDir = newParentId
    ? path.join(getUserUploadDir(userId), newParentId.toString(), folderName)
    : path.join(getUserUploadDir(userId), folderName);

  const newRelativePath = `/public/uploads/${userId}/${newParentId ? newParentId + "/" : ""}${folderName}`;

  fs.rename(oldDir, newDir);

  return newRelativePath;
};

export {
  parseBase64Data,
  extractFileInfo,
  determineFileType,
  saveFileToDisk,
  createFolderOnDisk,
  deleteFileFromDisk,
  deleteFolderFromDisk,
  moveFileOnDisk,
  moveFolderOnDisk,
  getUploadsDir,
  getUserUploadDir,
  getFolderPath,
};
