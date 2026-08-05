import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommunitySpaceService, CommunityMemberService } from '../services';
import { CommunitySeedingService } from '../services/community-seeding.service';
import { CreateSpaceDto, UpdateSpaceStatusDto, SpaceQueryDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Community Spaces')
@Controller('community/spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommunitySpaceController {
  constructor(
    private readonly spaceService: CommunitySpaceService,
    private readonly seedingService: CommunitySeedingService,
    private readonly memberService: CommunityMemberService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a community space (Student, Teacher, Admin)' })
  async create(@Body() dto: CreateSpaceDto, @Req() req: any) {
    const user = req?.user;
    return this.spaceService.create(dto, user);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Get intelligent categorization of community spaces' })
  async discover(@Req() req: any) {
    const user = req?.user;
    return this.spaceService.discover(user);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get community spaces with filters' })
  async findWithFilters(@Query() query: SpaceQueryDto) {
    return this.spaceService.findWithFilters({
      type: query.type,
      category: query.category,
      status: query.status === 'ALL' ? undefined : (query.status || 'APPROVED'),
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    });
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get community space by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.spaceService.findBySlug(slug);
  }

  @Public()
  @Get('type/:type')
  @ApiOperation({ summary: 'Get community spaces by type' })
  async findByType(@Param('type') type: string) {
    return this.spaceService.findByType(type);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get community space by ID' })
  async findById(@Param('id') id: string) {
    return this.spaceService.findById(id);
  }

  @Public()
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get community space analytics' })
  async getAnalytics(@Param('id') id: string) {
    const space = await this.spaceService.findById(id);
    return {
      membersCount: space.membersCount,
      postsCount: space.postsCount,
      onlineCount: space.onlineCount,
      weeklyActivityScore: (space as any).weeklyActivityScore || 0,
      newMembersWeekly: (space as any).newMembersWeekly || 0,
      commentsPerPostRatio: (space as any).commentsPerPostRatio || 0,
    };
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update community approval status (Admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceStatusDto,
  ) {
    return this.spaceService.updateStatus(id, dto);
  }

  @Post('seed-defaults')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Re-seed default subject communities (Admin only)' })
  async seedDefaults() {
    return this.seedingService.seedDefaultCommunities();
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a community space' })
  async joinSpace(@Param('id') id: string, @Req() req: any) {
    console.log(`[JoinSpace] Attempting to join space with ID: ${id}`);
    const userId = req.user.id;
    return this.memberService.joinSpace(id, userId);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a community space' })
  async leaveSpace(@Param('id') id: string, @Req() req: any) {
    console.log(`[LeaveSpace] Attempting to leave space with ID: ${id}`);
    const userId = req.user.id;
    return this.memberService.leaveSpace(id, userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete community space (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.spaceService.delete(id);
  }

  @Post(':id/cover')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload community cover image to Appwrite storage (Admin only)' })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.spaceService.updateSpaceImage(id, 'coverUrl', file);
  }

  @Post(':id/avatar')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload community avatar image to Appwrite storage (Admin only)' })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.spaceService.updateSpaceImage(id, 'avatarUrl', file);
  }

  @Patch(':id/images')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update community images by URL (Admin only)' })
  async updateImages(
    @Param('id') id: string,
    @Body() body: { coverUrl?: string; avatarUrl?: string },
  ) {
    return this.spaceService.updateImages(id, body);
  }
}
