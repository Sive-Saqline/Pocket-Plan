import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GroupsService } from '../groups/groups.service';
import { isoDate } from '../ledger/defaults';
import { LedgerService } from '../ledger/ledger.service';
import { AiError, AiProvider, type AiRequest } from './ai.provider';
import { CategorizeDto, ParseExpenseDto } from './ai.dto';
import { RateLimiter } from './rate-limiter';
import {
  categorizeRequest,
  categorySuggestion,
  groupCategorizeRequest,
  groupCategorySuggestion,
  groupParseRequest,
  groupSuggestion,
  personalParseRequest,
  personalSuggestion,
  type GroupOptions,
} from './suggestions';

/** Per user: generous for typing, tight enough to protect the AI quota. */
const CALLS_PER_MINUTE = 20;

/**
 * AI suggestions for the expense forms (PRD §6.14-6.15). Nothing here
 * writes data: the answer fills a form the user checks and saves (PRD §11).
 */
@Injectable()
export class AiService {
  private readonly limiter = new RateLimiter(CALLS_PER_MINUTE, 60_000);

  constructor(
    private readonly ai: AiProvider,
    private readonly ledger: LedgerService,
    private readonly groups: GroupsService,
  ) {}

  async parseExpense(
    userId: string,
    { text, today, groupId }: ParseExpenseDto,
  ) {
    this.throttle(userId);
    const day = today ?? isoDate(new Date());
    if (groupId) {
      const options = await this.groupOptions(userId, groupId);
      const raw = await this.ask(groupParseRequest(text, options, day));
      return groupSuggestion(raw, options, day);
    }
    const [{ categories, accounts }, groups] = await Promise.all([
      this.ledger.entryOptions(userId),
      this.groups.names(userId),
    ]);
    const options = { categories, wallets: accounts, groups };
    const raw = await this.ask(personalParseRequest(text, options, day));
    return personalSuggestion(raw, options, day);
  }

  async categorize(userId: string, { description, groupId }: CategorizeDto) {
    this.throttle(userId);
    if (groupId) {
      await this.groupOptions(userId, groupId); // members only
      return groupCategorySuggestion(
        await this.ask(groupCategorizeRequest(description)),
      );
    }
    const { categories } = await this.ledger.entryOptions(userId);
    return categorySuggestion(
      await this.ask(categorizeRequest(description, categories)),
      categories,
    );
  }

  /** 404 unless I'm an active member. */
  private async groupOptions(
    userId: string,
    groupId: string,
  ): Promise<GroupOptions> {
    const group = await this.groups.get(userId, groupId);
    return {
      name: group.name,
      me: userId,
      members: group.members
        .filter((m) => m.active)
        .map((m) => ({ userId: m.userId, name: m.name })),
    };
  }

  private throttle(userId: string) {
    if (!this.limiter.take(userId)) {
      throw new HttpException(
        'Too many AI requests. Wait a minute, or fill in the form yourself.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Provider failures become messages the form can show as they are. */
  private async ask(request: AiRequest) {
    try {
      return await this.ai.generateJson(request);
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      switch (err.reason) {
        case 'not_configured':
          throw new ServiceUnavailableException(
            "AI suggestions aren't set up yet. Fill in the form yourself.",
          );
        case 'timeout':
          throw new ServiceUnavailableException(
            'The AI took too long. Try again, or fill in the form yourself.',
          );
        case 'busy':
          throw new ServiceUnavailableException(
            'The AI is busy right now. Try again in a minute, or fill in the form yourself.',
          );
        default:
          throw new BadGatewayException(
            "The AI couldn't read that. Fill in the form yourself.",
          );
      }
    }
  }
}
