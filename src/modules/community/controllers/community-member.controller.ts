import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityMemberService } from '../services/community-member.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Community Memberships')
@Controller('community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityMemberController {
  constructor(private readonly memberService: CommunityMemberService) {}

  // Routes for joining/leaving spaces are handled in CommunitySpaceController

  @Get('members/me')
  @ApiOperation({ summary: 'Get current user memberships (Space IDs)' })
  async getMyMemberships(@Req() req: any) {
    const userId = req.user.id;
    return this.memberService.getUserMemberships(userId);
  }
}
