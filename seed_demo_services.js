const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedServices() {
  const hotelCat = await prisma.serviceCategory.findUnique({ where: { slug: 'hotels' } });
  const diningCat = await prisma.serviceCategory.findUnique({ where: { slug: 'dining' } });
  const turfCat = await prisma.serviceCategory.findUnique({ where: { slug: 'football-turf' } });
  const swimCat = await prisma.serviceCategory.findUnique({ where: { slug: 'swimming' } });

  const sampleServices = [
    {
      merchantId: '11111111-1111-4111-a111-111111111111',
      categoryId: hotelCat ? hotelCat.id : 'b06981f6-b12b-4905-be30-d74da4b6906b',
      name: 'Deluxe AC Room',
      slug: 'deluxe-ac-room',
      description: 'Luxury room with king bed, complimentary breakfast and high-speed Wi-Fi',
      shortDescription: 'Luxury room with king bed',
      city: 'Chennai',
      durationMinutes: 1440,
      basePrice: 2499.00,
      images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600']
    },
    {
      merchantId: '22222222-2222-4222-a222-222222222222',
      categoryId: turfCat ? turfCat.id : 'b06981f6-b12b-4905-be30-d74da4b6906b',
      name: 'FIFA 5-a-side Football Turf',
      slug: 'fifa-football-turf',
      description: 'FIFA standard artificial turf with floodlights and locker room access',
      shortDescription: 'FIFA standard turf with floodlights',
      city: 'Chennai',
      durationMinutes: 60,
      basePrice: 1200.00,
      images: ['https://images.unsplash.com/photo-1529900241944-7096e2a225ee?auto=format&fit=crop&q=80&w=600']
    },
    {
      merchantId: '33333333-3333-4333-a333-333333333333',
      categoryId: swimCat ? swimCat.id : 'b06981f6-b12b-4905-be30-d74da4b6906b',
      name: 'Olympic Swimming Pool Slot',
      slug: 'olympic-swimming-pool-slot',
      description: 'Olympic size temperature controlled swimming pool slot with coaching facility',
      shortDescription: 'Olympic size swimming pool slot',
      city: 'Chennai',
      durationMinutes: 60,
      basePrice: 350.00,
      images: ['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600']
    },
    {
      merchantId: '44444444-4444-4444-a444-444444444444',
      categoryId: diningCat ? diningCat.id : 'b06981f6-b12b-4905-be30-d74da4b6906b',
      name: 'Royal South Indian Feast Table',
      slug: 'royal-south-indian-feast-table',
      description: 'Reserve priority dining table for family with authentic Madurai traditional cuisine',
      shortDescription: 'Priority table reservation with feast',
      city: 'Madurai',
      durationMinutes: 90,
      basePrice: 500.00,
      images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600']
    }
  ];

  for (const s of sampleServices) {
    await prisma.service.upsert({
      where: { merchantId_slug: { merchantId: s.merchantId, slug: s.slug } },
      update: {},
      create: s
    });
  }
  console.log('Successfully seeded live demo services into PostgreSQL!');
}

seedServices().catch(console.error).finally(() => prisma.$disconnect());
