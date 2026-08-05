import { Controller, Get } from '@nestjs/common';
import {
  Public,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Protected by the global AuthGuard — returns 401 without a valid session cookie. */
  @Get('me')
  getMe(@Session() session: UserSession) {
    return session.user;
  }
}
