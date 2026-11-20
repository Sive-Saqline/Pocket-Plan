import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import { GroupExpensesService } from '../groups/group-expenses.service';
import { ReportQuery } from '../ledger/ledger.dto';
import { LedgerService } from '../ledger/ledger.service';
import {
  assertReportRange,
  monthsRange,
  type ReportRange,
} from '../ledger/reports';

/**
 * GET /reports (PRD §6.9, §10): my personal spending, or with &group_id=
 * one group I belong to. The range is whole months (from, to) or any days
 * (start, end). Group shares stay out of personal reports (decided
 * 2026-11-16); /reports/groups gives my share.
 */
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly groups: GroupExpensesService,
  ) {}

  @Get()
  report(@CurrentUserId() userId: string, @Query() q: ReportQuery) {
    const range = rangeOf(q);
    return q.group_id
      ? this.groups.report(userId, q.group_id, range, q.categories)
      : this.ledger.report(userId, range, {
          categories: q.categories,
          wallets: q.wallets,
        });
  }
}

function rangeOf(q: ReportQuery): ReportRange {
  if (q.start && q.end) return { start: q.start, end: q.end };
  if (q.from && q.to) {
    assertReportRange(q.from, q.to);
    return monthsRange(q.from, q.to);
  }
  throw new BadRequestException('Give a range: from and to, or start and end');
}
