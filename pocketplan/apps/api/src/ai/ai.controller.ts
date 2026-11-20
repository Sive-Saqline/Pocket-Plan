import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import { CategorizeDto, ParseExpenseDto } from './ai.dto';
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

  @Post('categorize')
  @HttpCode(200)
  categorize(@CurrentUserId() userId: string, @Body() dto: CategorizeDto) {
    return this.ai.categorize(userId, dto);
  }
}
