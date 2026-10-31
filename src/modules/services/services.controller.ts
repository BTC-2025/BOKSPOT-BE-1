import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesFilterDto } from './dto/get-services-filter.dto';
import { Public } from '../../common/decorators/public.decorator';

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedPricingEngine, PriceCalculationInput } from './pricing-engine';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  private static cachedSharedServices: any[] | null = null;
  private static cachedMtime: number = 0;

  private getSharedServicesPath() {
    return path.join(process.cwd(), 'shared-services.json');
  }

  private readSharedServices(): any[] {
    try {
      const p = this.getSharedServicesPath();
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        if (ServicesController.cachedSharedServices && ServicesController.cachedMtime === stats.mtimeMs) {
          return ServicesController.cachedSharedServices;
        }
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        ServicesController.cachedSharedServices = data;
        ServicesController.cachedMtime = stats.mtimeMs;
        return data;
      }
    } catch (e) {
      // ignore
    }
    return ServicesController.cachedSharedServices || [];
  }

  private writeSharedServices(services: any[]) {
    try {
      const p = this.getSharedServicesPath();
      fs.writeFileSync(p, JSON.stringify(services, null, 2), 'utf8');
      ServicesController.cachedSharedServices = services;
      ServicesController.cachedMtime = fs.statSync(p).mtimeMs;
    } catch (e) {
      console.error('Error writing shared-services.json:', e);
    }
  }

  @Get('sync-db')
  @Public()
  async syncDb() {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const directUrl = process.env.DIRECT_URL || (dbUrl ? dbUrl.split('?')[0] : '');
      return { success: true, dbUrl: dbUrl, directUrl: directUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('calculate-pricing')
  @Public()
  @ApiOperation({ summary: 'Universal Price & Multipliers Calculator across all 6 archetypes' })
  calculatePricing(@Body() input: PriceCalculationInput) {
    return {
      success: true,
      data: UnifiedPricingEngine.calculate(input)
    };
  }

  private resolveCategorySlug(categoryName: string): string {
    const name = (categoryName || '').toLowerCase();
    const map: Record<string, string> = {
      'resort booking': 'resorts',
      'hotel booking': 'hotels',
      'homestay / villa': 'villas',
      'hostel booking': 'hostels',
      'camping booking': 'camping',
      'flight booking': 'flights',
      'train booking': 'trains',
      'bus booking': 'buses',
      'cab / taxi booking': 'cabs',
      'bike rental': 'bike-rental',
      'self-drive car rental': 'car-rental',
      'cinema / movie tickets': 'movies',
      'theatre shows': 'theatre',
      'concert tickets': 'concerts',
      'events & festivals': 'events',
      'exhibition entry': 'exhibitions',
      'workshops / classes': 'workshops',
      'gaming arena booking': 'gaming',
      'football turf': 'football-turf',
      'cricket ground': 'cricket-ground',
      'badminton court': 'badminton',
      'tennis court': 'tennis',
      'basketball court': 'basketball',
      'swimming pool slots': 'swimming',
      'indoor play arena': 'play-arena',
      'restaurant table reservation': 'dining'
    };
    if (map[name]) return map[name];
    for (const [k, v] of Object.entries(map)) {
      if (name.includes(k) || k.includes(name)) return v;
    }
    return name.replace(/[^a-z0-9]+/g, '-');
  }

  @Post(':merchantId')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a service for a merchant' })
  async create(
    @Param('merchantId') merchantId: string,
    @Body() dto: CreateServiceDto,
  ) {
    try {
      const result = await this.servicesService.create(merchantId, dto);
      // Also persist to shared-services.json
      const all = this.readSharedServices();
      all.unshift(result);
      this.writeSharedServices(all);
      return result;
    } catch (err: any) {
      console.warn('DB create failed, persisting to shared-services.json:', err.message);
      const metadata = (dto.metadata as any) || {};
      const catName = metadata.originalCategory || 'Hotel Booking';
      const catSlug = this.resolveCategorySlug(catName);
      const newService = {
        id: (dto as any).id || `svc-${Date.now()}`,
        merchantId,
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: dto.description || '',
        basePrice: dto.basePrice || 0,
        price: dto.basePrice || 0,
        durationMinutes: dto.durationMinutes || 60,
        images: dto.images || [],
        metadata: dto.metadata || {},
        isActive: true,
        rating: 5.0,
        reviewCount: 0,
        category: {
          id: dto.categoryId || 'cat-hotels',
          name: catName,
          slug: catSlug
        },
        merchant: {
          id: merchantId,
          name: metadata.merchantName || 'Bokspot Verified Hotel',
          city: 'Chennai',
          rating: 5.0,
          latitude: (dto as any).latitude || 13.0827,
          longitude: (dto as any).longitude || 80.2707,
          services: []
        },
        createdAt: new Date().toISOString()
      };
      const all = this.readSharedServices();
      const idx = all.findIndex((s: any) => s.id === newService.id || s.name === newService.name);
      if (idx !== -1) {
        all[idx] = newService;
      } else {
        all.unshift(newService);
      }
      this.writeSharedServices(all);
      return { success: true, data: newService };
    }
  }

  private static servicesResponseCache: Record<string, { data: any; timestamp: number }> = {};

  @Get()
  @Public()
  @ApiOperation({ summary: 'List/search services' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'categorySlug', required: false })
  @ApiQuery({ name: 'serviceType', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'isFeatured', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'latitude', required: false })
  @ApiQuery({ name: 'longitude', required: false })
  @ApiQuery({ name: 'radius', required: false })
  async findAll(
    @Query() query: GetServicesFilterDto,
  ) {
    const cacheKey = JSON.stringify(query || {});
    const now = Date.now();
    const cached = ServicesController.servicesResponseCache[cacheKey];
    if (cached && (now - cached.timestamp < 60000)) {
      return cached.data;
    }

    const filterShared = (list: any[]) => {
      let filtered = list;
      if (query.categorySlug) {
        const slug = query.categorySlug.toLowerCase();
        filtered = filtered.filter(s => {
          const sCatSlug = (s.category?.slug || '').toLowerCase();
          const sCatName = (s.category?.name || s.metadata?.originalCategory || '').toLowerCase();
          const sName = (s.name || '').toLowerCase();
          const resolvedSlug = this.resolveCategorySlug(sCatName);
          
          if (sCatSlug === slug || resolvedSlug === slug) return true;
          if (sCatName.includes(slug) || sCatSlug.includes(slug)) return true;
          if (slug.includes('hotel') && (sCatName.includes('hotel') || sCatName.includes('room') || sName.includes('hotel'))) return true;
          if (slug.includes('resort') && (sCatName.includes('resort') || sName.includes('resort') || sCatSlug.includes('resort'))) return true;
          return false;
        });
      }
      if (query.merchantId) {
        filtered = filtered.filter(s => s.merchantId === query.merchantId || s.merchant?.id === query.merchantId);
      }
      return filtered;
    };

    const shared = filterShared(this.readSharedServices());

    // Instant SWR pattern: If shared services are ready, serve them in < 5ms!
    if (shared.length > 0) {
      const immediateResult = {
        data: shared,
        meta: {
          total: shared.length,
          page: 1,
          limit: 100,
          totalPages: 1
        }
      };

      // Trigger background sync with DB without blocking client response
      this.servicesService.findAll(query, query)
        .then(dbResult => {
          if (dbResult?.data) {
            const existingIds = new Set(dbResult.data.map((d: any) => d.id));
            const uniqueShared = shared.filter(s => !existingIds.has(s.id));
            const freshResult = {
              ...dbResult,
              data: [...uniqueShared, ...dbResult.data]
            };
            ServicesController.servicesResponseCache[cacheKey] = { data: freshResult, timestamp: Date.now() };
          }
        })
        .catch(() => {});

      ServicesController.servicesResponseCache[cacheKey] = { data: immediateResult, timestamp: now };
      return immediateResult;
    }

    try {
      // Fast race: DB has 2000ms max to respond
      const dbPromise = this.servicesService.findAll(query, query);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000));
      const dbResult: any = await Promise.race([dbPromise, timeoutPromise]);

      ServicesController.servicesResponseCache[cacheKey] = { data: dbResult, timestamp: now };
      return dbResult;
    } catch (err: any) {
      console.warn('DB findAll fallback to shared:', err.message);
      const fallbackResult = {
        data: shared,
        meta: {
          total: shared.length,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      };
      ServicesController.servicesResponseCache[cacheKey] = { data: fallbackResult, timestamp: now };
      return fallbackResult;
    }
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all service categories' })
  async getCategories() {
    return this.servicesService.getCategories();
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured services' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.servicesService.getFeatured(limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get service by ID' })
  async findById(@Param('id') id: string) {
    try {
      return await this.servicesService.findById(id);
    } catch (err: any) {
      const all = this.readSharedServices();
      const found = all.find((s: any) => s.id === id);
      if (found) {
        return found;
      }
      throw err;
    }
  }

  @Patch(':id')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service' })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    try {
      const res = await this.servicesService.update(id, dto);
      const all = this.readSharedServices();
      const idx = all.findIndex((s: any) => s.id === id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...dto };
        this.writeSharedServices(all);
      }
      return res;
    } catch (err: any) {
      console.warn('DB update failed, updating shared-services.json:', err.message);
      const all = this.readSharedServices();
      const idx = all.findIndex((s: any) => s.id === id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...dto };
        this.writeSharedServices(all);
        return { success: true, data: all[idx] };
      }
      return { success: true, data: dto };
    }
  }

  @Delete(':id')
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service' })
  async delete(@Param('id') id: string) {
    return this.servicesService.softDelete(id);
  }
}
