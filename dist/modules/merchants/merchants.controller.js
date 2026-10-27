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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const merchants_service_1 = require("./merchants.service");
const create_merchant_dto_1 = require("./dto/create-merchant.dto");
const update_merchant_dto_1 = require("./dto/update-merchant.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let MerchantsController = class MerchantsController {
    constructor(merchantsService) {
        this.merchantsService = merchantsService;
    }
    getSharedMerchantsPath() {
        return path.join(process.cwd(), 'shared-merchants.json');
    }
    readSharedMerchants() {
        try {
            const p = this.getSharedMerchantsPath();
            if (fs.existsSync(p)) {
                return JSON.parse(fs.readFileSync(p, 'utf8'));
            }
        }
        catch (e) {
            // ignore
        }
        return [];
    }
    writeSharedMerchants(merchants) {
        try {
            const p = this.getSharedMerchantsPath();
            fs.writeFileSync(p, JSON.stringify(merchants, null, 2), 'utf8');
        }
        catch (e) {
            console.error('Error writing shared-merchants.json:', e);
        }
    }
    async create(user, dto) {
        return this.merchantsService.create(user.sub, dto);
    }
    async findAll(pagination, city) {
        try {
            return await this.merchantsService.findAll(pagination, city);
        }
        catch (e) {
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
    async getDashboard(merchantId) {
        return this.merchantsService.getMerchantDashboard(merchantId);
    }
    async findBySlug(slug) {
        try {
            return await this.merchantsService.findBySlug(slug);
        }
        catch (e) {
            const merchants = this.readSharedMerchants();
            const m = merchants.find((item) => item.slug === slug);
            if (m)
                return m;
            throw e;
        }
    }
    async findById(id) {
        try {
            return await this.merchantsService.findById(id);
        }
        catch (e) {
            const merchants = this.readSharedMerchants();
            const m = merchants.find((item) => item.id === id);
            if (m)
                return m;
            throw e;
        }
    }
    async update(id, dto) {
        try {
            const res = await this.merchantsService.update(id, 'bypass', dto);
            return res;
        }
        catch (e) {
            // Fallback to shared-merchants.json
            const merchants = this.readSharedMerchants();
            const index = merchants.findIndex((item) => item.id === id);
            let updatedMerchant;
            if (index >= 0) {
                updatedMerchant = { ...merchants[index], ...dto };
                if (dto.metadata) {
                    updatedMerchant.metadata = {
                        ...(merchants[index].metadata || {}),
                        ...(typeof dto.metadata === 'string' ? JSON.parse(dto.metadata) : dto.metadata),
                    };
                }
                merchants[index] = updatedMerchant;
            }
            else {
                updatedMerchant = { id, ...dto };
                merchants.push(updatedMerchant);
            }
            this.writeSharedMerchants(merchants);
            return updatedMerchant;
        }
    }
};
exports.MerchantsController = MerchantsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a merchant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_merchant_dto_1.CreateMerchantDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all merchants' }),
    (0, swagger_1.ApiQuery)({ name: 'city', required: false }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pagination_dto_1.PaginationDto, String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('dashboard/:merchantId'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant dashboard data' }),
    __param(0, (0, common_1.Param)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('slug/:slug'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant by slug' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "findById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, public_decorator_1.Public)() // Temporary for prototyping without auth
    ,
    (0, swagger_1.ApiOperation)({ summary: 'Update merchant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_merchant_dto_1.UpdateMerchantDto]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "update", null);
exports.MerchantsController = MerchantsController = __decorate([
    (0, swagger_1.ApiTags)('merchants'),
    (0, common_1.Controller)('merchants'),
    __metadata("design:paramtypes", [merchants_service_1.MerchantsService])
], MerchantsController);
