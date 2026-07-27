import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminDashboardService) {}

  // ── Stats ──────────────────────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ── Teachers ───────────────────────────────────────────────────────────
  @Get('teachers')
  @ApiOperation({ summary: 'List all teachers with filters' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getTeachers(
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getTeachers({ take, skip, status, search });
  }

  @Post('teachers/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a teacher application' })
  approveTeacher(@Param('id') id: string) {
    return this.adminService.approveTeacher(id);
  }

  @Post('teachers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a teacher application' })
  rejectTeacher(@Param('id') id: string) {
    return this.adminService.rejectTeacher(id);
  }

  // ── Students ───────────────────────────────────────────────────────────
  @Get('students')
  @ApiOperation({ summary: 'List all students' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  getStudents(
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getStudents({ take, skip, search });
  }

  // ── User actions ────────────────────────────────────────────────────────
  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Post('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user account' })
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Post('users/:id/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user account permanently' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Courses ─────────────────────────────────────────────────────────────
  @Get('courses')
  @ApiOperation({ summary: 'List all courses' })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  getCourses(
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getCourses({ take, skip, status, search });
  }

  @Post('courses/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a course' })
  publishCourse(@Param('id') id: string) {
    return this.adminService.publishCourse(id);
  }

  @Post('courses/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish a course' })
  unpublishCourse(@Param('id') id: string) {
    return this.adminService.unpublishCourse(id);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a course completely' })
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  @Get('courses/slug/:slug')
  @ApiOperation({ summary: 'Get course details by slug for admin' })
  getCourseBySlug(@Param('slug') slug: string) {
    return this.adminService.getCourseBySlug(slug);
  }

  // ── Notifications ───────────────────────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification to users' })
  sendNotification(
    @Body() dto: { target: 'ALL' | 'STUDENTS' | 'TEACHERS' | string; title: string; message: string }
  ) {
    return this.adminService.sendNotification(dto);
  }
  // ── Coupons ────────────────────────────────────────────────────────
  @Get('coupons')
  @ApiOperation({ summary: 'Get all coupons' })
  getCoupons(
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.adminService.getCoupons(take, skip);
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create a new coupon' })
  createCoupon(
    @Body() dto: {
      code: string;
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      maxUses?: number;
      validFrom: Date;
      validUntil?: Date;
      courseId?: string;
    }
  ) {
    return this.adminService.createCoupon(dto);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Delete a coupon' })
  deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  @Patch('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a locked user account and reset failed attempts' })
  unlockUser(@Param('id') id: string) {
    return this.adminService.unlockUser(id);
  }
}
