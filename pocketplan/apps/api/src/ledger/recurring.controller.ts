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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUserId } from '../auth/auth.guard';
import {
  ConfirmRecurringDto,
  CreateRecurringDto,
  TodayQuery,
  UpdateRecurringDto,
} from './ledger.dto';
import { RecurringService } from './recurring.service';

// PRD §10: /recurring-expenses and /recurring-expenses/:id/confirm.
@Controller('recurring-expenses')
@UseGuards(AuthGuard)
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() { today }: TodayQuery) {
    return this.recurring.list(userId, today);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body() body: CreateRecurringDto,
    @Query() { today }: TodayQuery,
  ) {
    return this.recurring.create(userId, body, today);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRecurringDto,
    @Query() { today }: TodayQuery,
  ) {
    return this.recurring.update(userId, id, body, today);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.recurring.remove(userId, id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmRecurringDto,
  ) {
    return this.recurring.confirm(userId, id, body);
  }
}
