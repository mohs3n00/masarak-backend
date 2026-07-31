import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunitySpaceService } from '../services';
import { CreateSpaceDto } from '../dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Community Spaces')
@Controller('community/spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommunitySpaceController {
  constructor(private readonly spaceService: CommunitySpaceService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new space (Admins only)' })
  async create(@Body() dto: CreateSpaceDto) {
    return this.spaceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active spaces' })
  async findAll() {
    return this.spaceService.findAll();
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get spaces by type' })
  async findByType(@Param('type') type: string) {
    return this.spaceService.findByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get space by ID' })
  async findById(@Param('id') id: string) {
    return this.spaceService.findById(id);
  }
}
