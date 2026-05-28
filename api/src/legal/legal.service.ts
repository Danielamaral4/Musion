import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataDeletionRequestDto } from '../dto/create-data-deletion-request.dto';

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async createDataDeletionRequest(dto: CreateDataDeletionRequestDto) {
    const email = String(dto.email || '').trim().toLowerCase();
    const username = dto.username?.trim() || null;
    const reason = dto.reason?.trim() || null;

    return this.prisma.dataDeletionRequest.create({
      data: {
        email,
        username,
        reason,
      },
    });
  }

  async listDataDeletionRequests(status = 'PENDING') {
    return this.prisma.dataDeletionRequest.findMany({
      where: status === 'ALL' ? undefined : { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateDataDeletionRequestStatus(id: number, status: string) {
    return this.prisma.dataDeletionRequest.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
  }
}
