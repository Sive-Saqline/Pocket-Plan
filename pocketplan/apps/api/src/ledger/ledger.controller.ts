import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import {
  CopyBudgetsDto,
  CreateExpenseDto,
  CreateWalletDto,
  ListExpensesQuery,
  MonthQuery,
  SetBudgetDto,
  UpdateExpenseDto,
} from './ledger.dto';
import { LedgerService } from './ledger.service';

// Route prefixes follow PRD §10; every route is scoped to the signed-in user.
@Controller()
@UseGuards(AuthGuard)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('categories')
  categories(@CurrentUserId() userId: string) {
    return this.ledger.categories(userId);
  }

  @Get('accounts')
  wallets(@CurrentUserId() userId: string) {
    return this.ledger.wallets(userId);
  }

  @Post('accounts')
  createWallet(@CurrentUserId() userId: string, @Body() body: CreateWalletDto) {
    return this.ledger.createWallet(userId, body);
  }

  @Get('expenses')
  expenses(@CurrentUserId() userId: string, @Query() query: ListExpensesQuery) {
    return this.ledger.expenses(userId, query);
  }

  @Post('expenses')
  createExpense(
    @CurrentUserId() userId: string,
    @Body() body: CreateExpenseDto,
  ) {
    return this.ledger.createExpense(userId, body);
  }

  @Patch('expenses/:id')
  updateExpense(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateExpenseDto,
  ) {
    return this.ledger.updateExpense(userId, id, body);
  }

  @Delete('expenses/:id')
  @HttpCode(204)
  async deleteExpense(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.ledger.deleteExpense(userId, id);
  }

  @Get('budgets')
  budgets(@CurrentUserId() userId: string, @Query() { month }: MonthQuery) {
    return this.ledger.budgets(userId, month);
  }

  @Put('budgets')
  setBudget(@CurrentUserId() userId: string, @Body() body: SetBudgetDto) {
    return this.ledger.setBudget(userId, body);
  }

  @Delete('budgets/:categoryId')
  @HttpCode(204)
  async deleteBudget(
    @CurrentUserId() userId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() { month }: MonthQuery,
  ) {
    await this.ledger.deleteBudget(userId, month, categoryId);
  }

  @Post('budgets/copy')
  copyBudgets(@CurrentUserId() userId: string, @Body() body: CopyBudgetsDto) {
    return this.ledger.copyBudgets(userId, body);
  }

  @Get('reports/summary')
  summary(@CurrentUserId() userId: string, @Query() { month }: MonthQuery) {
    return this.ledger.summary(userId, month);
  }
}
