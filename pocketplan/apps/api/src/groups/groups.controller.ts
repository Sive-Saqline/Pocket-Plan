import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import { GroupExpensesService } from './group-expenses.service';
import {
  ChangeRoleDto,
  CreateGroupDto,
  CreateInviteDto,
  GroupExpenseDto,
  OptionalMonthQuery,
  RequiredMonthQuery,
  SettlementDto,
  UpdateGroupDto,
} from './groups.dto';
import { GroupsService } from './groups.service';

const uuid = new ParseUUIDPipe({ version: '4' });

// PRD v4 §10. Every route checks that the caller is a current member;
// non-members get 404, so they can't tell whether a group exists (§12).
@Controller('groups')
@UseGuards(AuthGuard)
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly expenses: GroupExpensesService,
  ) {}

  // --- groups ----------------------------------------------------------------

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.groups.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: CreateGroupDto) {
    return this.groups.create(userId, body);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id', uuid) id: string) {
    return this.groups.get(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Body() body: UpdateGroupDto,
  ) {
    return this.groups.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUserId() userId: string, @Param('id', uuid) id: string) {
    return this.groups.remove(userId, id);
  }

  // --- members ---------------------------------------------------------------

  @Patch(':id/members/:userId')
  changeRole(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) target: string,
    @Body() { role }: ChangeRoleDto,
  ) {
    return this.groups.changeRole(userId, id, target, role);
  }

  /** Remove someone, or leave (your own user id). */
  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) target: string,
  ) {
    return this.groups.removeMember(userId, id, target);
  }

  // --- invites ---------------------------------------------------------------

  @Post(':id/invites')
  invite(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Body() body: CreateInviteDto,
  ) {
    return this.groups.invite(userId, id, body);
  }

  @Get(':id/invites')
  invites(@CurrentUserId() userId: string, @Param('id', uuid) id: string) {
    return this.groups.invites(userId, id);
  }

  @Delete(':id/invites/:inviteId')
  @HttpCode(204)
  revokeInvite(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('inviteId', uuid) inviteId: string,
  ) {
    return this.groups.revokeInvite(userId, id, inviteId);
  }

  // --- expenses --------------------------------------------------------------

  @Get(':id/expenses')
  expensesList(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Query() { month }: OptionalMonthQuery,
  ) {
    return this.expenses.list(userId, id, month);
  }

  @Post(':id/expenses')
  addExpense(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Body() body: GroupExpenseDto,
  ) {
    return this.expenses.create(userId, id, body);
  }

  /** Replaces the expense and its split (send every field). */
  @Patch(':id/expenses/:expenseId')
  updateExpense(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('expenseId', uuid) expenseId: string,
    @Body() body: GroupExpenseDto,
  ) {
    return this.expenses.update(userId, id, expenseId, body);
  }

  @Delete(':id/expenses/:expenseId')
  @HttpCode(204)
  deleteExpense(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('expenseId', uuid) expenseId: string,
  ) {
    return this.expenses.remove(userId, id, expenseId);
  }

  // --- balances, settlements, dashboard -------------------------------------

  @Get(':id/balances')
  balances(@CurrentUserId() userId: string, @Param('id', uuid) id: string) {
    return this.expenses.balances(userId, id);
  }

  @Post(':id/settlements')
  settle(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Body() body: SettlementDto,
  ) {
    return this.expenses.settle(userId, id, body);
  }

  @Delete(':id/settlements/:settlementId')
  undoSettlement(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Param('settlementId', uuid) settlementId: string,
  ) {
    return this.expenses.undoSettlement(userId, id, settlementId);
  }

  @Get(':id/summary')
  summary(
    @CurrentUserId() userId: string,
    @Param('id', uuid) id: string,
    @Query() { month }: RequiredMonthQuery,
  ) {
    return this.expenses.summary(userId, id, month);
  }
}

/** Invites addressed to me (by email) and invite links. */
@Controller('invites')
@UseGuards(AuthGuard)
export class InvitesController {
  constructor(private readonly groups: GroupsService) {}

  @Get('received')
  received(@CurrentUserId() userId: string) {
    return this.groups.received(userId);
  }

  @Post('received/:inviteId/accept')
  acceptReceived(
    @CurrentUserId() userId: string,
    @Param('inviteId', uuid) inviteId: string,
  ) {
    return this.groups.acceptReceived(userId, inviteId);
  }

  @Post('received/:inviteId/decline')
  @HttpCode(204)
  declineReceived(
    @CurrentUserId() userId: string,
    @Param('inviteId', uuid) inviteId: string,
  ) {
    return this.groups.declineReceived(userId, inviteId);
  }

  @Get('token/:token')
  preview(@CurrentUserId() userId: string, @Param('token') token: string) {
    return this.groups.preview(userId, validToken(token));
  }

  @Post('token/:token/accept')
  accept(@CurrentUserId() userId: string, @Param('token') token: string) {
    return this.groups.accept(userId, validToken(token));
  }
}

/** My share of group spending, for the personal monthly report. */
@Controller('reports')
@UseGuards(AuthGuard)
export class GroupReportsController {
  constructor(private readonly expenses: GroupExpensesService) {}

  @Get('groups')
  myGroupMonth(
    @CurrentUserId() userId: string,
    @Query() { month }: RequiredMonthQuery,
  ) {
    return this.expenses.myMonth(userId, month);
  }
}

/** Tokens are 32 random bytes in base64url (43 characters). */
function validToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new NotFoundException("This invite link isn't valid");
  }
  return token;
}
