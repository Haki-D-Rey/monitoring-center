/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt'
import prisma from '../src/utils/prisma'

async function main() {
  console.log('🌱 Iniciando seeding...')

  // ======== ROLES ========
  const [userAdminRole, superAdminRole, userStandardRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'UserManagment' },
      update: {},
      create: { name: 'UserManagment' },
    }),
    prisma.role.upsert({
      where: { name: 'SuperAdmin' },
      update: {},
      create: { name: 'SuperAdmin' },
    }),
    prisma.role.upsert({
      where: { name: 'UserStandard' },
      update: {},
      create: { name: 'UserStandard' },
    }),
  ])

  console.log('✅ Roles creados:', {
    superAdmin: superAdminRole.name,
    userAdmin: userAdminRole.name,
    userStandard: userStandardRole.name,
  })

  // ======== PERMISOS ========
  const permissions = [
    { name: 'manage_users' },
    { name: 'manage_buildings' },
    { name: 'view_forms' },
    { name: 'edit_forms' },
    { name: 'delete_forms' },
  ]

  // Crear permisos estándar + full_permissions
  const allPermissions = await Promise.all(
    [...permissions, { name: 'full_permissions' }].map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: { name: perm.name },
      })
    )
  )

console.log('✅ Permisos creados:', allPermissions.map((p: any) => p.name))

  // ======== RELACIONES ROLES -> PERMISOS ========

  // --- SuperAdmin solo con full_permissions ---
  const fullPermission = allPermissions.find((p: any) => p.name === 'full_permissions')!
  await prisma.roleHasPermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: superAdminRole.id,
        permissionId: fullPermission.id,
      },
    },
    update: {},
    create: {
      roleId: superAdminRole.id,
      permissionId: fullPermission.id,
    },
  })
  console.log('🔗 SuperAdmin -> full_permissions asignado')

  // --- UserAdmin con permisos completos (excepto full_permissions) ---
  const adminPermissions = allPermissions.filter((p: any) => p.name !== 'full_permissions')
  for (const perm of adminPermissions) {
    await prisma.roleHasPermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: userAdminRole.id,
        permissionId: perm.id,
      },
    })
  }
  console.log('🔗 UserAdmin -> permisos completos asignados')

  // --- UserStandard solo con view_forms ---
  const viewPermission = allPermissions.find((p: any) => p.name === 'view_forms')!
  await prisma.roleHasPermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: userStandardRole.id,
        permissionId: viewPermission.id,
      },
    },
    update: {},
    create: {
      roleId: userStandardRole.id,
      permissionId: viewPermission.id,
    },
  })
  console.log('🔗 UserStandard -> solo permiso de lectura asignado')

  // ======== CREAR USUARIOS ========
  const hashedPasswords = {
    superAdmin: await bcrypt.hash('1234', 10),
    userAdmin: await bcrypt.hash('12345', 10),
    userStandard: await bcrypt.hash('123456', 10),
  }

  const [superAdminUser, userAdminUser, userStandardUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'cesar.cuadra@gmail.com' },
      update: {},
      create: {
        email: 'cesar.cuadra@gmail.com',
        password: hashedPasswords.superAdmin,
        roleId: superAdminRole.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'useradmin@pame.com' },
      update: {},
      create: {
        email: 'useradmin@pame.com',
        password: hashedPasswords.userAdmin,
        roleId: userAdminRole.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'userstandard@pame.com' },
      update: {},
      create: {
        email: 'userstandard@pame.com',
        password: hashedPasswords.userStandard,
        roleId: userStandardRole.id,
      },
    }),
  ])

  console.log('👤 Usuarios creados:', {
    superAdmin: superAdminUser.email,
    userAdmin: userAdminUser.email,
    userStandard: userStandardUser.email,
  })

  console.log('🌱 Seeding completado con éxito!')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
