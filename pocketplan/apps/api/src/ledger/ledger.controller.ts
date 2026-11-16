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
  CreateCategoryDto,
  CreateExpenseDto,
  CreateWalletDto,
  DeleteCategoryQuery,
  ListExpensesQuery,
  MonthQuery,
  SetBudgetDto,
  UpdateCategoryDto,
  UpdateExpenseDto,
  UpdateWalletDto,
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

  @Post('categories')
  createCategory(
    @CurrentUserId() userId: string,
    @Body() body: CreateCategoryDto,
  ) {
    return this.ledger.createCategory(userId, body);
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.ledger.updateCategory(userId, id, body);
  }

  /** ?moveTo=<categoryId> moves the category's expenses and recurring expenses there first. */
  @Delete('categories/:id')
  @HttpCode(204)
  async deleteCategory(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() { moveTo }: DeleteCategoryQuery,
  ) {
    await this.ledger.deleteCategory(userId, id, moveTo);
  }

  @Get('accounts')
  wallets(@CurrentUserId() userId: string) {
    return this.ledger.wallets(userId);
  }

  @Post('accounts')
  createWallet(@CurrentUserId() userId: string, @Body() body: CreateWalletDto) {
    return this.ledger.createWallet(userId, body);
  }

  @Patch('accounts/:id')
  updateWallet(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWalletDto,
  ) {
    return this.ledger.updateWallet(userId, id, body);
  }

  @Delete('accounts/:id')
  @HttpCode(204)
  async deleteWallet(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.ledger.deleteWallet(userId, id);
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
