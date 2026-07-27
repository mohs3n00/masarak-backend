import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiTags, ApiConsumes, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as os from 'os';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// الامتدادات المسموح بها فقط (حماية من extension bypass)
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif'];
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.zip'];
const ALLOWED_FOLDERS = [
  'masarak/avatars',
  'masarak/thumbnails',
  'masarak/attachments',
  'masarak/covers',
  'masarak/courses',
  'masarak/teachers',
  'masarak/community',
  'masarak/logos',
  'masarak/certificates',
  'masarak/banners'
];

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // ✅ كل upload يحتاج JWT
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image to Cloudinary (requires auth)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'The target folder in Cloudinary (e.g. masarak/avatars)',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext) ? ext : '.jpg';
          cb(null, `img-${uniqueSuffix}${safeExt}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (
          !file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|jfif|pjpeg)$/) ||
          !ALLOWED_IMAGE_EXTENSIONS.includes(ext)
        ) {
          return cb(new BadRequestException('Only image files (jpg, png, gif, webp, jfif) are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    if (!folder) throw new BadRequestException('Folder name is required');
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException('Invalid folder. Allowed: ' + ALLOWED_FOLDERS.join(', '));
    }
    return this.uploadService.uploadImage(file, folder);
  }

  @Post('file')
  @ApiOperation({ summary: 'Upload a file (PDF, DOC, ZIP) to Cloudinary (requires auth)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'masarak/attachments' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname).toLowerCase();
          const safeExt = ALLOWED_FILE_EXTENSIONS.includes(ext) ? ext : '.bin';
          cb(null, `file-${uniqueSuffix}${safeExt}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedMimes = /\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|zip|x-rar-compressed)$/;
        if (!file.mimetype.match(allowedMimes) || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException('Only PDF, DOC, DOCX, ZIP files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    if (!folder) throw new BadRequestException('Folder name is required');
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException('Invalid folder. Allowed: ' + ALLOWED_FOLDERS.join(', '));
    }
    return this.uploadService.uploadFileResource(file, folder);
  }
}
