import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() categoryId!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() shortDescription!: string;
  @ApiPropertyOptional({ default: 'APPOINTMENT' }) @IsOptional() @IsString() serviceType?: string;
  @ApiProperty() @IsInt() @Min(5) durationMinutes!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) bufferMinutes?: number;
  @ApiProperty() @IsNumber() @Min(0) basePrice!: number;
  @ApiPropertyOptional({ default: 'INR' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(1000) maxCapacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: any;

  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;

  // Dynamic fields
  @ApiPropertyOptional() @IsOptional() isTimingEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() timingDetails?: string;
  @ApiPropertyOptional() @IsOptional() isCapacityEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() participantCapacity?: number;
  @ApiPropertyOptional() @IsOptional() isAddonsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() addOns?: any;
  @ApiPropertyOptional() @IsOptional() isTipsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() tipsAndGuidelines?: string;
  @ApiPropertyOptional() @IsOptional() isRestrictionsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() restrictions?: string;
  @ApiPropertyOptional() @IsOptional() isOffersEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() offersAndDiscounts?: string;
  @ApiPropertyOptional() @IsOptional() isInstructionsEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
}
