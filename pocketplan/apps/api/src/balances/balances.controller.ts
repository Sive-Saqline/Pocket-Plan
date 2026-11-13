import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { BalancePreviewDto } from './preview.dto';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Post('preview')
  @HttpCode(200)
  preview(@Body() body: BalancePreviewDto) {
    return this.balances.preview(body);
  }
}
