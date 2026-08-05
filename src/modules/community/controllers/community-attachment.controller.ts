import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommunityAttachmentService } from '../services';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { COMMUNITY_DEFAULTS } from '../constants/community.constants';

@ApiTags('Community Attachments')
@Controller('community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityAttachmentController {
  constructor(private readonly attachmentService: CommunityAttachmentService) {}

  @Post('posts/:postId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: COMMUNITY_DEFAULTS.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload attachment for a post' })
  async upload(
    @Param('postId') postId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.attachmentService.uploadForPost(postId, file);
  }

  @Get('posts/:postId/attachments')
  @ApiOperation({ summary: 'Get attachments for a post' })
  async getByPost(@Param('postId') postId: string) {
    return this.attachmentService.getAttachmentsForPost(postId);
  }

  @Delete('attachments/:id')
  @ApiOperation({ summary: 'Delete attachment' })
  async delete(@Param('id') id: string) {
    return this.attachmentService.delete(id);
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: COMMUNITY_DEFAULTS.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image directly to Appwrite storage' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.attachmentService.uploadRawFile(file);
  }
}
