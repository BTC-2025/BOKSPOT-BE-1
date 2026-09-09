"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
let ServicesService = class ServicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(merchantId, dto) {
        try {
            let slug = this.generateSlug(dto.name);
            // Ensure unique slug for this merchant
            let existing = await this.prisma.service.findUnique({
                where: { merchantId_slug: { merchantId, slug } }
            });
            if (existing) {
                slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
            }
            // Check if merchant exists, if not, auto-create a mock merchant profile
            // This allows infinite mock businesses from Business App without manual seeding
            const merchantExists = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
            if (!merchantExists) {
                const metadata = dto.metadata || {};
                const merchantName = metadata.merchantName || 'Dynamic Merchant';
                await this.prisma.merchant.create({
                    data: {
                        id: merchantId,
                        ownerId: '00000000-0000-0000-0000-000000000000',
                        name: merchantName,
                        slug: this.generateSlug(merchantName) + '-' + Math.random().toString(36).substring(2, 6),
                        description: 'Auto-created merchant profile',
                        email: `merchant_${merchantId.substring(0, 8)}@bokspot.com`,
                        phone: '0000000000',
                        address: 'Auto Address',
                        city: 'Chennai',
                        state: 'TN',
                        postalCode: '000000',
                        latitude: dto.latitude || 13.0827,
                        longitude: dto.longitude || 80.2707,
                    }
                });
                console.log(`Auto-created missing merchant profile: ${merchantId}`);
            }
            return await this.prisma.service.create({
                data: {
                    ...dto,
                    merchantId,
                    slug,
                },
            });
        }
        catch (e) {
            console.error('Prisma Create Error:', e);
            throw new (require('@nestjs/common').InternalServerErrorException)(e.message || 'Error creating service');
        }
    }
    async findAll(pagination, filters) {
        const where = {
            isActive: true,
            deletedAt: null,
        };
        if (filters?.categoryId)
            where.categoryId = filters.categoryId;
        if (filters?.serviceType)
            where.serviceType = filters.serviceType;
        if (filters?.merchantId)
            where.merchantId = filters.merchantId;
        if (filters?.isFeatured)
            where.isFeatured = true;
        if (filters?.categorySlug) {
            where.category = {
                slug: filters.categorySlug,
            };
        }
        if (filters?.city) {
            where.OR = [
                { city: { contains: filters.city, mode: 'insensitive' } },
                {
                    city: null,
                    merchant: { city: { contains: filters.city, mode: 'insensitive' } }
                }
            ];
        }
        if (filters?.latitude !== undefined && filters?.longitude !== undefined) {
            try {
                const radiusKm = filters.radius || 50;
                const lat = filters.latitude;
                const lng = filters.longitude;
                // Raw SQL query to find nearby service IDs AND merchant IDs using Haversine formula
                // First, find nearby services
                const nearbyServices = await this.prisma.$queryRaw `
          SELECT id FROM (
            SELECT id, (
              6371 * acos(
                cos(radians(${lat})) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(${lng})) +
                sin(radians(${lat})) *
                sin(radians(latitude))
              )
            ) AS distance_km
            FROM services
            WHERE is_active = true AND deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
          ) sub
          WHERE distance_km <= ${radiusKm}
        `;
                const serviceIds = nearbyServices.map((s) => s.id);
                // Second, find nearby merchants (for fallback)
                const nearbyMerchants = await this.prisma.$queryRaw `
          SELECT id FROM (
            SELECT id, (
              6371 * acos(
                cos(radians(${lat})) *
                cos(radians(latitude)) *
                cos(radians(longitude) - radians(${lng})) +
                sin(radians(${lat})) *
                sin(radians(latitude))
              )
            ) AS distance_km
            FROM merchants
            WHERE is_active = true AND deleted_at IS NULL
          ) sub
          WHERE distance_km <= ${radiusKm}
        `;
                const merchantIds = nearbyMerchants.map((m) => m.id);
                // Combine conditions: either service is nearby OR merchant is nearby
                const existingOR = where.OR || [];
                where.OR = [
                    ...existingOR,
                    { id: { in: serviceIds.length > 0 ? serviceIds : ['00000000-0000-0000-0000-000000000000'] } },
                    { merchantId: { in: merchantIds.length > 0 ? merchantIds : ['00000000-0000-0000-0000-000000000000'] } }
                ];
            }
            catch (geoErr) {
                // Geo query failed (e.g. pgbouncer mode) — skip geo filtering, return all services
                console.warn('Geo filter failed, skipping:', geoErr);
            }
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { tags: { has: filters.search.toLowerCase() } },
                { metadata: { path: ['merchantName'], string_contains: filters.search } }
            ];
        }
        if (filters?.minPrice || filters?.maxPrice) {
            where.basePrice = {};
            if (filters?.minPrice)
                where.basePrice.gte = filters.minPrice;
            if (filters?.maxPrice)
                where.basePrice.lte = filters.maxPrice;
        }
        const [data, total] = await Promise.all([
            this.prisma.service.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc' },
                include: {
                    merchant: {
                        select: {
                            id: true, name: true, slug: true, logoUrl: true, city: true, rating: true, latitude: true, longitude: true,
                            services: {
                                select: { category: { select: { name: true } } },
                                where: { isActive: true, deletedAt: null }
                            }
                        },
                    },
                    category: true,
                    _count: { select: { bookings: true, reviews: true } },
                },
            }),
            this.prisma.service.count({ where }),
        ]);
        const enrichedData = data.map(service => {
            const allCategories = service.merchant.services?.map((s) => s.category?.name).filter(Boolean) || [];
            const uniqueCategories = [...new Set(allCategories)];
            const { services, ...merchantWithoutServices } = service.merchant;
            return {
                ...service,
                merchant: {
                    ...merchantWithoutServices,
                    allCategories: uniqueCategories
                }
            };
        });
        return (0, pagination_dto_1.createPaginatedResponse)(enrichedData, total, pagination);
    }
    async findById(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new common_1.NotFoundException('Service not found');
        }
        const service = await this.prisma.service.findUnique({
            where: { id, deletedAt: null },
            include: {
                merchant: true,
                category: true,
                availabilityRules: { where: { isActive: true } },
                reviews: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, avatarUrl: true } } },
                },
                _count: { select: { bookings: true, reviews: true, favorites: true } },
            },
        });
        if (!service)
            throw new common_1.NotFoundException('Service not found');
        return service;
    }
    async findBySlug(merchantId, slug) {
        const service = await this.prisma.service.findUnique({
            where: { merchantId_slug: { merchantId, slug }, deletedAt: null },
            include: {
                merchant: true,
                category: true,
                availabilityRules: { where: { isActive: true } },
                reviews: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, avatarUrl: true } } },
                },
                _count: { select: { bookings: true, reviews: true, favorites: true } },
            },
        });
        if (!service)
            throw new common_1.NotFoundException('Service not found');
        return service;
    }
    async update(id, dto) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new common_1.NotFoundException('Service not found (Invalid ID)');
        }
        return this.prisma.service.update({
            where: { id },
            data: dto,
        });
    }
    async softDelete(id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new common_1.NotFoundException('Service not found (Invalid ID)');
        }
        return this.prisma.service.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }
    async getCategories() {
        return this.prisma.serviceCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { services: true } } },
        });
    }
    async getFeatured(limit = 12) {
        return this.prisma.service.findMany({
            where: { isActive: true, isFeatured: true, deletedAt: null },
            take: limit,
            orderBy: { rating: 'desc' },
            include: {
                merchant: {
                    select: { id: true, name: true, slug: true, logoUrl: true, city: true },
                },
                category: true,
            },
        });
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServicesService);
