import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from './client'
import {
  users,
  societyConfig,
  apartments,
  guards,
  houseHelp,
  residencies,
  vehicles,
} from './schema'
import { DEV_ADMIN_ID, DEV_RESIDENT_ID, DEV_RESIDENT2_ID, seed } from './seed'

/** Stable personas for MNR Apartment local/live testing (x-user-id, no Clerk). */
export const MNR_GUARD_USER_ID = '00000000-0000-0000-0000-000000000004'
export const MNR_STAFF_USER_ID = '00000000-0000-0000-0000-000000000005'

/**
 * Registers MNR Apartment as the real local society for Gopikrishna Bhuvanam.
 * Idempotent: safe to re-run. Ensures base seed rows exist first.
 */
export async function seedMnr(db = getDb()) {
  await seed(db)

  await db
    .update(users)
    .set({
      name: 'Gopikrishna Bhuvanam',
      email: 'gopikrishna6001@gmail.com',
      phone: '9000000001',
      role: 'ADMIN',
      status: 'APPROVED',
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, DEV_ADMIN_ID))

  await db
    .update(users)
    .set({
      name: 'Pending Resident',
      email: 'pending@mnr.local',
      role: 'RESIDENT',
      status: 'PENDING',
      updatedAt: new Date(),
    })
    .where(eq(users.id, DEV_RESIDENT_ID))

  await db
    .update(users)
    .set({
      name: 'Household Co-resident',
      email: 'resident@mnr.local',
      role: 'RESIDENT',
      status: 'APPROVED',
      updatedAt: new Date(),
    })
    .where(eq(users.id, DEV_RESIDENT2_ID))

  await db
    .insert(users)
    .values([
      {
        id: MNR_GUARD_USER_ID,
        clerkId: 'mnr_guard',
        email: 'guard@mnr.local',
        name: 'MNR Gate Guard',
        phone: '9000000004',
        role: 'GUARD',
        status: 'APPROVED',
      },
      {
        id: MNR_STAFF_USER_ID,
        clerkId: 'mnr_staff',
        email: 'staff@mnr.local',
        name: 'MNR Maintenance Staff',
        phone: '9000000005',
        role: 'STAFF',
        status: 'APPROVED',
      },
    ])
    .onConflictDoNothing()

  const [society] = await db.select().from(societyConfig).limit(1)
  if (society) {
    await db
      .update(societyConfig)
      .set({
        name: 'MNR Apartment',
        address: 'MNR Apartment, Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        updatedAt: new Date(),
      })
      .where(eq(societyConfig.id, society.id))
  } else {
    await db.insert(societyConfig).values({
      name: 'MNR Apartment',
      address: 'MNR Apartment, Main Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
    })
  }

  await db
    .insert(apartments)
    .values([
      { tower: 'MNR', apartmentNo: '101', floor: 1, bhkType: '2BHK' },
      { tower: 'MNR', apartmentNo: '102', floor: 1, bhkType: '2BHK' },
      { tower: 'MNR', apartmentNo: '201', floor: 2, bhkType: '3BHK' },
      { tower: 'MNR', apartmentNo: '202', floor: 2, bhkType: '3BHK' },
    ])
    .onConflictDoNothing()

  const [home] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(and(eq(apartments.tower, 'MNR'), eq(apartments.apartmentNo, '101')))
    .limit(1)

  const [mnr102] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(and(eq(apartments.tower, 'MNR'), eq(apartments.apartmentNo, '102')))
    .limit(1)

  if (home) {
    const [adminRes] = await db
      .select({ id: residencies.id })
      .from(residencies)
      .where(and(eq(residencies.userId, DEV_ADMIN_ID), eq(residencies.apartmentId, home.id), isNull(residencies.endDate)))
      .limit(1)
    if (!adminRes) {
      await db.insert(residencies).values({
        userId: DEV_ADMIN_ID,
        apartmentId: home.id,
        relation: 'OWNER',
        isPrimary: true,
      })
    }

    await db
      .insert(vehicles)
      .values({
        apartmentId: home.id,
        registrationNumber: 'TS09MNR0001',
        type: 'CAR',
        make: 'Hyundai Creta',
        color: 'Grey',
        registeredBy: DEV_ADMIN_ID,
      })
      .onConflictDoNothing()
  }

  // Co-resident lives in MNR-102 so resident-scoped API flows use the MNR society.
  if (mnr102) {
    const [coRes] = await db
      .select({ id: residencies.id })
      .from(residencies)
      .where(and(eq(residencies.userId, DEV_RESIDENT2_ID), eq(residencies.apartmentId, mnr102.id), isNull(residencies.endDate)))
      .limit(1)
    if (!coRes) {
      await db.insert(residencies).values({
        userId: DEV_RESIDENT2_ID,
        apartmentId: mnr102.id,
        relation: 'OWNER',
        isPrimary: true,
      })
    }
  }

  const [gate] = await db.select({ id: guards.id }).from(guards).limit(1)
  if (gate) {
    await db
      .update(guards)
      .set({ name: 'MNR Gate Guard', phone: '9000000004', employeeCode: 'MNR-G-001', isActive: true })
      .where(eq(guards.id, gate.id))
  } else {
    await db.insert(guards).values({ name: 'MNR Gate Guard', phone: '9000000004', employeeCode: 'MNR-G-001' })
  }

  const [help] = await db.select({ id: houseHelp.id }).from(houseHelp).limit(1)
  if (!help) {
    await db
      .insert(houseHelp)
      .values({ name: 'Lakshmi Devi', phone: '8888888888', type: 'MAID', registeredBy: DEV_ADMIN_ID })
  }

  return {
    society: 'MNR Apartment',
    adminId: DEV_ADMIN_ID,
    pendingResidentId: DEV_RESIDENT_ID,
    approvedResidentId: DEV_RESIDENT2_ID,
    guardUserId: MNR_GUARD_USER_ID,
    staffUserId: MNR_STAFF_USER_ID,
    homeApartmentId: home?.id ?? null,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMnr()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('MNR seed failed:', err)
      process.exit(1)
    })
}
