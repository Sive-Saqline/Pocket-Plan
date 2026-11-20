import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import {
  CategorizeDto,
  ParseExpenseDto,
  ReportAskDto,
  ReportViewDto,
} from './ai.dto';
import { AiService } from './ai.service';

/**
 * PRD §6.14-6.15: suggestions only. 200, not 201: nothing is created; the
 * client fills its form and the user decides whether to save (PRD §11).
 */
@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('parse-expense')
  @HttpCode(200)
  parseExpense(@CurrentUserId() userId: string, @Body() dto: ParseExpenseDto) {
    return this.ai.parseExpense(userId, dto);
  }

  /** Reports: a question in, the filters to show and a written answer out. */
  @Post('report-ask')
  @HttpCode(200)
  reportAsk(@CurrentUserId() userId: string, @Body() dto: ReportAskDto) {
    return this.ai.reportAsk(userId, dto);
  }

  /** Reports: plain-language insights for the report on screen. */
  @Post('insights')
  @HttpCode(200)
  insights(@CurrentUserId() userId: string, @Body() dto: ReportViewDto) {
    return this.ai.reportInsights(userId, dto);
  }

  @Post('categorize')
  @HttpCode(200)
  categorize(@CurrentUserId() userId: string, @Body() dto: CategorizeDto) {
    return this.ai.categorize(userId, dto);
  }
}
