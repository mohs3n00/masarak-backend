import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminTaxonomyService } from '../services/admin-taxonomy.service';

@ApiTags('Admin Taxonomy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/taxonomy')
export class AdminTaxonomyController {
  constructor(private readonly taxonomyService: AdminTaxonomyService) {}



  // ── Subjects ───────────────────────────────────────────────────────────
  @Get('subjects')
  @ApiOperation({ summary: 'Get all subjects' })
  getSubjects() {
    return this.taxonomyService.getSubjects();
  }

  @Post('subjects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subject' })
  createSubject(@Body() dto: { name: string; description?: string }) {
    return this.taxonomyService.createSubject(dto);
  }

  @Patch('subjects/:id')
  @ApiOperation({ summary: 'Update a subject' })
  updateSubject(@Param('id') id: string, @Body() dto: { name?: string; description?: string }) {
    return this.taxonomyService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subject' })
  deleteSubject(@Param('id') id: string) {
    return this.taxonomyService.deleteSubject(id);
  }
}
