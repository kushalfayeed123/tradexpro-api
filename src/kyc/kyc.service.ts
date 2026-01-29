/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/kyc/kyc.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { KycDecision, ReviewKycDto } from './dtos/review-kyc.dto';
import { SubmitKycDto } from './dtos/submit-kyc.dto';

@Injectable()
export class KycService {
  constructor(@Inject('SUPABASE_CLIENT') private supabase: SupabaseClient) {}

  async initiateKyc(userId: string, level: number) {
    const { data, error } = await this.supabase
      .from('kyc_records')
      .insert({
        user_id: userId,
        level,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data; // contains kyc.id
  }

  async uploadKycDocument(
    userId: string,
    kycId: string,
    file: Express.Multer.File,
  ) {
    console.log(file);
    const path = `${userId}/${kycId}/${file.originalname}`;

    const { error } = await this.supabase.storage
      .from('kyc-documents')
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(error.message);

    return path;
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    // 1. Ensure KYC exists and is draft
    const { data: kyc } = await this.supabase
      .from('kyc_records')
      .select('*')
      .eq('id', dto.kyc_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!kyc || kyc.status !== 'draft') {
      throw new BadRequestException('Invalid KYC state');
    }

    // 2. Insert documents
    const documents = dto.documents.map((doc) => ({
      kyc_id: dto.kyc_id,
      ...doc,
    }));

    const { error: docError } = await this.supabase
      .from('kyc_documents')
      .insert(documents);

    if (docError) throw new BadRequestException(docError.message);

    // 3. Lock KYC for review
    const { error: kycError } = await this.supabase
      .from('kyc_records')
      .update({ status: 'pending_review' })
      .eq('id', dto.kyc_id);

    if (kycError) throw new BadRequestException(kycError.message);

    return { status: 'pending_review' };
  }

  async review(adminId: string, kycId: string, dto: ReviewKycDto) {
    const update: any = {
      status: dto.decision,
      reviewed_at: new Date(),
      reviewed_by: adminId,
    };

    if (dto.decision === KycDecision.REJECTED) {
      update.rejection_reason = dto.rejection_reason;
    }

    const { error } = await this.supabase
      .from('kyc_records')
      .update(update)
      .eq('id', kycId);
    if (error) throw new BadRequestException(error.message);

    return { status: dto.decision };
  }

  async getKycDocument(path: string) {
    const { data, error } = await this.supabase.storage
      .from('kyc-documents')
      .createSignedUrl(path, 60 * 5); // 5 minutes

    if (error) throw new BadRequestException(error.message);
    return data.signedUrl;
  }

  async getUserKyc(userId: string) {
    const { data, error } = await this.supabase
      .from('kyc_records')
      .select(
        `
      id,
      status,
      level,
      created_at,
      reviewed_at,
      reviewed_by,
      rejection_reason,
      documents:kyc_documents (
        id,
        document_type,
        document_url,
        document_number,
        issued_country,
        created_at
      )
    `,
      )
      .eq('user_id', userId)
      .order('level', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data; // null if no KYC record found
  }

  async assertKyc(userId: string, requiredLevel: number) {
    const kyc = await this.getUserKyc(userId);

    if (!kyc) throw new ForbiddenException('KYC approval required');

    if (kyc.level < requiredLevel)
      throw new ForbiddenException(`KYC level ${requiredLevel} required`);
  }

  async listAllKyc() {
    const { data, error } = await this.supabase
      .from('kyc_records')
      .select(
        `
      *,
      user:users!kyc_records_user_fkey(email),
      documents:kyc_documents(*)
    `,
      )
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get a single KYC submission
  async getKycById(kycId: string) {
    const { data, error } = await this.supabase
      .from('kyc_records')
      .select('*, documents:kyc_documents(*)')
      .eq('id', kycId)
      .maybeSingle();

    if (error || !data) throw new BadRequestException('KYC not found');
    return data;
  }
}
