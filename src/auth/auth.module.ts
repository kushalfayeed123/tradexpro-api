import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminGuard } from './guards/admin.guard';
import { EmailTemplate } from 'src/helpers/email-template.helper';
import { NotificationService } from 'src/notifications/notification.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SupabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AdminGuard,
    EmailTemplate,
    NotificationService,
  ],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}
