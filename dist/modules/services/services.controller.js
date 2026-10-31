"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ServicesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const services_service_1 = require("./services.service");
const create_service_dto_1 = require("./dto/create-service.dto");
const update_service_dto_1 = require("./dto/update-service.dto");
const get_services_filter_dto_1 = require("./dto/get-services-filter.dto");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pricing_engine_1 = require("./pricing-engine");
let ServicesController = ServicesController_1 = class ServicesController {
    constructor(servicesService) {
        this.servicesService = servicesService;
    }
    getSharedServicesPath() {
        return path.join(process.cwd(), 'shared-services.json');
    }
    readSharedServices() {
        try {
            const p = this.getSharedServicesPath();
            if (fs.existsSync(p)) {
                const stats = fs.statSync(p);
                if (ServicesController_1.cachedSharedServices && ServicesController_1.cachedMtime === stats.mtimeMs) {
                    return ServicesController_1.cachedSharedServices;
                }
                const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                ServicesController_1.cachedSharedServices = data;
                ServicesController_1.cachedMtime = stats.mtimeMs;
                return data;
            }
        }
        catch (e) {
            // ignore
        }
        return ServicesController_1.cachedSharedServices || [];
    }
    writeSharedServices(services) {
        try {
            const p = this.getSharedServicesPath();
            fs.writeFileSync(p, JSON.stringify(services, null, 2), 'utf8');
            ServicesController_1.cachedSharedServices = services;
            ServicesController_1.cachedMtime = fs.statSync(p).mtimeMs;
        }
        catch (e) {
            console.error('Error writing shared-services.json:', e);
        }
    }
    async syncDb() {
        try {
            const dbUrl = process.env.DATABASE_URL || '';
            const directUrl = process.env.DIRECT_URL || (dbUrl ? dbUrl.split('?')[0] : '');
            return { success: true, dbUrl: dbUrl, directUrl: directUrl };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    calculatePricing(input) {
        return {
            success: true,
            data: pricing_engine_1.UnifiedPricingEngine.calculate(input)
        };
    }
    resolveCategorySlug(categoryName) {
        const name = (categoryName || '').toLowerCase();
        const map = {
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
        if (map[name])
            return map[name];
        for (const [k, v] of Object.entries(map)) {
            if (name.includes(k) || k.includes(name))
                return v;
        }
        return name.replace(/[^a-z0-9]+/g, '-');
    }
    async create(merchantId, dto) {
        try {
            const result = await this.servicesService.create(merchantId, dto);
            // Also persist to shared-services.json
            const all = this.readSharedServices();
            all.unshift(result);
            this.writeSharedServices(all);
            return result;
        }
        catch (err) {
            console.warn('DB create failed, persisting to shared-services.json:', err.message);
            const metadata = dto.metadata || {};
            const catName = metadata.originalCategory || 'Hotel Booking';
            const catSlug = this.resolveCategorySlug(catName);
            const newService = {
                id: dto.id || `svc-${Date.now()}`,
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
                    latitude: dto.latitude || 13.0827,
                    longitude: dto.longitude || 80.2707,
                    services: []
                },
                createdAt: new Date().toISOString()
            };
            const all = this.readSharedServices();
            const idx = all.findIndex((s) => s.id === newService.id || s.name === newService.name);
            if (idx !== -1) {
                all[idx] = newService;
            }
            else {
                all.unshift(newService);
            }
            this.writeSharedServices(all);
            return { success: true, data: newService };
        }
    }
    async findAll(query) {
        const cacheKey = JSON.stringify(query || {});
        const now = Date.now();
        const cached = ServicesController_1.servicesResponseCache[cacheKey];
        if (cached && (now - cached.timestamp < 60000)) {
            return cached.data;
        }
        const filterShared = (list) => {
            let filtered = list;
            if (query.categorySlug) {
                const slug = query.categorySlug.toLowerCase();
                filtered = filtered.filter(s => {
                    const sCatSlug = (s.category?.slug || '').toLowerCase();
                    const sCatName = (s.category?.name || s.metadata?.originalCategory || '').toLowerCase();
                    const sName = (s.name || '').toLowerCase();
                    const resolvedSlug = this.resolveCategorySlug(sCatName);
                    if (sCatSlug === slug || resolvedSlug === slug)
                        return true;
                    if (sCatName.includes(slug) || sCatSlug.includes(slug))
                        return true;
                    if (slug.includes('hotel') && (sCatName.includes('hotel') || sCatName.includes('room') || sName.includes('hotel')))
                        return true;
                    if (slug.includes('resort') && (sCatName.includes('resort') || sName.includes('resort') || sCatSlug.includes('resort')))
                        return true;
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
                    const existingIds = new Set(dbResult.data.map((d) => d.id));
                    const uniqueShared = shared.filter(s => !existingIds.has(s.id));
                    const freshResult = {
                        ...dbResult,
                        data: [...uniqueShared, ...dbResult.data]
                    };
                    ServicesController_1.servicesResponseCache[cacheKey] = { data: freshResult, timestamp: Date.now() };
                }
            })
                .catch(() => { });
            ServicesController_1.servicesResponseCache[cacheKey] = { data: immediateResult, timestamp: now };
            return immediateResult;
        }
        try {
            // Fast race: DB has 2000ms max to respond
            const dbPromise = this.servicesService.findAll(query, query);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000));
            const dbResult = await Promise.race([dbPromise, timeoutPromise]);
            ServicesController_1.servicesResponseCache[cacheKey] = { data: dbResult, timestamp: now };
            return dbResult;
        }
        catch (err) {
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
            ServicesController_1.servicesResponseCache[cacheKey] = { data: fallbackResult, timestamp: now };
            return fallbackResult;
        }
    }
    async getCategories() {
        return this.servicesService.getCategories();
    }
    async getFeatured(limit) {
        return this.servicesService.getFeatured(limit);
    }
    async findById(id) {
        try {
            return await this.servicesService.findById(id);
        }
        catch (err) {
            const all = this.readSharedServices();
            const found = all.find((s) => s.id === id);
            if (found) {
                return found;
            }
            throw err;
        }
    }
    async update(id, dto) {
        try {
            const res = await this.servicesService.update(id, dto);
            const all = this.readSharedServices();
            const idx = all.findIndex((s) => s.id === id);
            if (idx !== -1) {
                all[idx] = { ...all[idx], ...dto };
                this.writeSharedServices(all);
            }
            return res;
        }
        catch (err) {
            console.warn('DB update failed, updating shared-services.json:', err.message);
            const all = this.readSharedServices();
            const idx = all.findIndex((s) => s.id === id);
            if (idx !== -1) {
                all[idx] = { ...all[idx], ...dto };
                this.writeSharedServices(all);
                return { success: true, data: all[idx] };
            }
            return { success: true, data: dto };
        }
    }
    async delete(id) {
        return this.servicesService.softDelete(id);
    }
};
exports.ServicesController = ServicesController;
ServicesController.cachedSharedServices = null;
ServicesController.cachedMtime = 0;
ServicesController.servicesResponseCache = {};
__decorate([
    (0, common_1.Get)('sync-db'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "syncDb", null);
__decorate([
    (0, common_1.Post)('calculate-pricing'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Universal Price & Multipliers Calculator across all 6 archetypes' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "calculatePricing", null);
__decorate([
    (0, common_1.Post)(':merchantId'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a service for a merchant' }),
    __param(0, (0, common_1.Param)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_service_dto_1.CreateServiceDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List/search services' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'categorySlug', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'serviceType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'merchantId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isFeatured', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'city', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'latitude', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'longitude', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'radius', required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_services_filter_dto_1.GetServicesFilterDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all service categories' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('featured'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get featured services' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "getFeatured", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get service by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a service' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_service_dto_1.UpdateServiceDto]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a service' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "delete", null);
exports.ServicesController = ServicesController = ServicesController_1 = __decorate([
    (0, swagger_1.ApiTags)('services'),
    (0, common_1.Controller)('services'),
    __metadata("design:paramtypes", [services_service_1.ServicesService])
], ServicesController);
