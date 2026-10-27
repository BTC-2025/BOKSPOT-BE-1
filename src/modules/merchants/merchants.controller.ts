import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

import * as fs from 'fs';
import * as path from 'path';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  private getSharedMerchantsPath() {
    return path.join(process.cwd(), 'shared-merchants.json');
  }

  private readSharedMerchants(): any[] {
    try {
      const p = this.getSharedMerchantsPath();
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  private writeSharedMerchants(merchants: any[]) {
    try {
      const p = this.getSharedMerchantsPath();
      fs.writeFileSync(p, JSON.stringify(merchants, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing shared-merchants.json:', e);
    }
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a merchant' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMerchantDto,
  ) {
    return this.merchantsService.create(user.sub, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all merchants' })
  @ApiQuery({ name: 'city', required: false })
  async findAll(@Query() pagination: PaginationDto, @Query('city') city?: string) {
    try {
      return await this.merchantsService.findAll(pagination, city);
    } catch (e) {
      const merchants = this.readSharedMerchants();
      return {
        data: merchants,
        meta: {
          total: merchants.length,
          page: pagination.page || 1,
          limit: pagination.limit || 20,
          totalPages: 1,
        },
      };
    }
  }

  @Get('dashboard/:merchantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant dashboard data' })
  async getDashboard(@Param('merchantId') merchantId: string) {
    return this.merchantsService.getMerchantDashboard(merchantId);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get merchant by slug' })
  async findBySlug(@Param('slug') slug: string) {
    try {
      return await this.merchantsService.findBySlug(slug);
    } catch (e) {
      const merchants = this.readSharedMerchants();
      const m = merchants.find((item) => item.slug === slug);
      if (m) return m;
      throw e;
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get merchant by ID' })
  async findById(@Param('id') id: string) {
    try {
      return await this.merchantsService.findById(id);
    } catch (e) {
      const merchants = this.readSharedMerchants();
      const m = merchants.find((item) => item.id === id);
      if (m) return m;
      throw e;
    }
  }

  @Patch(':id')
  @Public() // Temporary for prototyping without auth
  @ApiOperation({ summary: 'Update merchant' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    try {
      const res = await this.merchantsService.update(id, 'bypass', dto);
      return res;
    } catch (e) {
      // Fallback to shared-merchants.json
      const merchants = this.readSharedMerchants();
      const index = merchants.findIndex((item) => item.id === id);
      let updatedMerchant: any;
      if (index >= 0) {
        updatedMerchant = { ...merchants[index], ...dto };
        if (dto.metadata) {
          updatedMerchant.metadata = {
            ...(merchants[index].metadata || {}),
            ...(typeof dto.metadata === 'string' ? JSON.parse(dto.metadata) : dto.metadata),
          };
        }
        merchants[index] = updatedMerchant;
      } else {
        updatedMerchant = { id, ...dto };
        merchants.push(updatedMerchant);
      }
      this.writeSharedMerchants(merchants);
      return updatedMerchant;
    }
  }
}
