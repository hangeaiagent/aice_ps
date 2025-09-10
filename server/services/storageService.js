import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local'; // 'local' 或 'aws'
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // 初始化 AWS S3（如果使用 AWS 存储）
    if (this.storageType === 'aws') {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      this.bucketName = process.env.AWS_S3_BUCKET;
      
      if (!this.bucketName) {
        console.warn('AWS S3 配置不完整，回退到本地存储');
        this.storageType = 'local';
      }
    }
    
    // 确保本地上传目录存在
    this.ensureUploadsDir();
  }

  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      console.log('创建上传目录:', this.uploadsDir);
    }
  }

  // 保存图片到本地存储
  async saveToLocal(imageBuffer, filename, mimeType) {
    const filePath = path.join(this.uploadsDir, filename);
    
    try {
      await fs.writeFile(filePath, imageBuffer);
      
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const imageUrl = `${baseUrl}/images/${filename}`;
      
      console.log('图片已保存到本地:', filePath);
      
      return {
        imageUrl,
        filename,
        storage: 'local',
        path: filePath
      };
    } catch (error) {
      console.error('保存图片到本地失败:', error);
      throw new Error(`保存图片到本地失败: ${error.message}`);
    }
  }

  // 保存图片到 AWS S3
  async saveToAWS(imageBuffer, filename, mimeType) {
    const params = {
      Bucket: this.bucketName,
      Key: `images/${filename}`,
      Body: imageBuffer,
      ContentType: mimeType,
      ACL: 'public-read' // 设置为公开可读
    };

    try {
      const result = await this.s3.upload(params).promise();
      
      console.log('图片已上传到 AWS S3:', result.Location);
      
      return {
        imageUrl: result.Location,
        filename,
        storage: 'aws',
        s3Key: params.Key,
        etag: result.ETag
      };
    } catch (error) {
      console.error('上传图片到 AWS S3 失败:', error);
      throw new Error(`上传图片到 AWS S3 失败: ${error.message}`);
    }
  }

  // 主要的保存图片方法
  async saveImage(imageBuffer, filename, mimeType) {
    switch (this.storageType) {
      case 'aws':
        try {
          return await this.saveToAWS(imageBuffer, filename, mimeType);
        } catch (error) {
          console.warn('AWS 存储失败，回退到本地存储:', error.message);
          return await this.saveToLocal(imageBuffer, filename, mimeType);
        }
      case 'local':
      default:
        return await this.saveToLocal(imageBuffer, filename, mimeType);
    }
  }

  // 删除图片
  async deleteImage(filename, storage = null) {
    const actualStorage = storage || this.storageType;
    
    try {
      switch (actualStorage) {
        case 'aws':
          await this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: `images/${filename}`
          }).promise();
          console.log('已从 AWS S3 删除图片:', filename);
          break;
        case 'local':
        default:
          const filePath = path.join(this.uploadsDir, filename);
          await fs.unlink(filePath);
          console.log('已从本地删除图片:', filename);
          break;
      }
      return true;
    } catch (error) {
      console.error('删除图片失败:', error);
      return false;
    }
  }

  // 获取存储配置信息
  getStorageInfo() {
    return {
      type: this.storageType,
      uploadsDir: this.storageType === 'local' ? this.uploadsDir : null,
      bucketName: this.storageType === 'aws' ? this.bucketName : null,
      region: this.storageType === 'aws' ? process.env.AWS_REGION : null
    };
  }
}

export const storageService = new StorageService();