import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import { GroupExpensesService } from '../groups/group-expenses.service';
import { ReportQuery } from '../ledger/ledger.dto';
import { LedgerService } from '../ledger/ledger.service';

/**
 * GET /reports?from=YYYY-MM&to=YYYY-MM (PRD §6.9, §10): my personal
 * spending, or with &group_id= one group I belong to. Group shares stay out
 * of personal reports (decided 2026-11-16); /reports/groups gives my share.
 */
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly groups: GroupExpensesService,
  ) {}

  @Get()
  report(
    @CurrentUserId() userId: string,
    @Query() { from, to, group_id }: ReportQuery,
  ) {
    return group_id
      ? this.groups.report(userId, group_id, from, to)
      : this.ledger.report(userId, from, to);
  }
}
