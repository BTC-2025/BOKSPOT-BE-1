export type BookingArchetype = 
  | 'OvernightStay' 
  | 'TimeSlot' 
  | 'FacilityHourly' 
  | 'AssetRental' 
  | 'PassEntry' 
  | 'HomeCall';

export interface PriceCalculationInput {
  archetype: BookingArchetype;
  basePrice: number;
  quantity?: number; // Rooms, Courts, Passes, Units
  nights?: number;
  adults?: number;
  children?: number;
  durationHours?: number;
  isNightPeak?: boolean;
  rentalDays?: number;
  securityDeposit?: number;
  taxPercent?: number;
  convenienceFeeFixed?: number;
  addons?: Array<{ id?: string; name: string; price: number; quantity?: number; perNight?: boolean; perPerson?: boolean }>;
}

export interface PriceCalculationResult {
  archetype: BookingArchetype;
  unitPrice: number;
  multiplierText: string;
  baseTotal: number;
  addonsBreakdown: Array<{ name: string; price: number; quantity: number; total: number }>;
  addonsTotal: number;
  securityDeposit: number;
  subtotal: number;
  taxAmount: number;
  convenienceFee: number;
  finalPayable: number;
  breakdownSummary: string;
}

export class UnifiedPricingEngine {
  public static calculate(input: PriceCalculationInput): PriceCalculationResult {
    const {
      archetype,
      basePrice = 0,
      quantity = 1,
      nights = 1,
      adults = 1,
      children = 0,
      durationHours = 1,
      isNightPeak = false,
      addons = [],
      rentalDays = 1,
      securityDeposit = 0,
      taxPercent = 0,
      convenienceFeeFixed = 0
    } = input;

    let baseTotal = 0;
    let multiplierText = '';
    const totalGuests = (adults || 1) + (children || 0);

    switch (archetype) {
      case 'OvernightStay': {
        const safeNights = Math.max(1, nights);
        const safeRooms = Math.max(1, quantity);
        baseTotal = basePrice * safeNights * safeRooms;
        multiplierText = `₹${basePrice} × ${safeNights} Night${safeNights > 1 ? 's' : ''} × ${safeRooms} Room${safeRooms > 1 ? 's' : ''}`;
        break;
      }

      case 'FacilityHourly': {
        const safeHours = Math.max(1, durationHours);
        const safeCourts = Math.max(1, quantity);
        const peakSurcharge = isNightPeak ? 200 * safeHours : 0;
        baseTotal = (basePrice * safeHours * safeCourts) + peakSurcharge;
        multiplierText = `₹${basePrice}/hr × ${safeHours} hr${safeHours > 1 ? 's' : ''}${safeCourts > 1 ? ` × ${safeCourts} units` : ''}${isNightPeak ? ' (+ Night Floodlights)' : ''}`;
        break;
      }

      case 'TimeSlot': {
        const safeAttendees = Math.max(1, quantity);
        baseTotal = basePrice * safeAttendees;
        multiplierText = `₹${basePrice} per consultation/session`;
        break;
      }

      case 'AssetRental': {
        const safeDays = Math.max(1, rentalDays);
        const safeUnits = Math.max(1, quantity);
        baseTotal = basePrice * safeDays * safeUnits;
        multiplierText = `₹${basePrice}/day × ${safeDays} Day${safeDays > 1 ? 's' : ''}${safeUnits > 1 ? ` × ${safeUnits} units` : ''}`;
        break;
      }

      case 'PassEntry': {
        const safePasses = Math.max(1, quantity);
        baseTotal = basePrice * safePasses;
        multiplierText = `₹${basePrice} × ${safePasses} Ticket/Pass${safePasses > 1 ? 'es' : ''}`;
        break;
      }

      case 'HomeCall': {
        baseTotal = basePrice;
        multiplierText = `₹${basePrice} Visiting & Inspection Fee`;
        break;
      }

      default: {
        baseTotal = basePrice * Math.max(1, quantity);
        multiplierText = `₹${basePrice} × ${quantity}`;
      }
    }

    const addonsBreakdown = addons.map(addon => {
      let addonQty = addon.quantity || 1;
      if (addon.perNight && nights > 1) {
        addonQty = addonQty * nights;
      }
      if (addon.perPerson && totalGuests > 1) {
        addonQty = addonQty * totalGuests;
      }
      const total = addon.price * addonQty;
      return {
        name: addon.name,
        price: addon.price,
        quantity: addonQty,
        total: total
      };
    });

    const addonsTotal = addonsBreakdown.reduce((sum, item) => sum + item.total, 0);

    // Tax and Fee Calculation (securityDeposit is strictly non-taxed)
    const taxableSubtotal = baseTotal + addonsTotal;
    const taxAmount = taxPercent > 0 ? Math.round((taxableSubtotal * (taxPercent / 100))) : 0;
    const convenienceFee = convenienceFeeFixed || 0;
    const finalPayable = taxableSubtotal + taxAmount + convenienceFee + (securityDeposit || 0);

    return {
      archetype,
      unitPrice: basePrice,
      multiplierText,
      baseTotal,
      addonsBreakdown,
      addonsTotal,
      securityDeposit: securityDeposit || 0,
      subtotal: taxableSubtotal,
      taxAmount,
      convenienceFee,
      finalPayable,
      breakdownSummary: `${multiplierText}${addonsTotal > 0 ? ` + ₹${addonsTotal} addons` : ''}${securityDeposit > 0 ? ` + ₹${securityDeposit} deposit` : ''}`
    };
  }
}
