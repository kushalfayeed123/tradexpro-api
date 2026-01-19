import { SetMetadata } from '@nestjs/common';

export const RequireKyc = (level: number) => SetMetadata('kycLevel', level);
