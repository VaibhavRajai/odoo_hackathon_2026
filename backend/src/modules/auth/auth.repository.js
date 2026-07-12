import prisma from "../../config/prisma.js";

/**
 * AuthRepository — all database queries for the Auth module.
 * No business logic. Only Prisma calls.
 */

/** @typedef {{ id: string, email: string, name: string, roleId: string, role: { id: string, name: string } }} UserWithRole */

/**
 * Returns all users with their role — used to populate the
 * "Select Account" dropdown on the Forgot Password page.
 *
 * @returns {Promise<UserWithRole[]>}
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Finds a user by email, including their role.
 *
 * @param {string} email
 * @returns {Promise<UserWithRole|null>}
 */
export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { role: true },
  });
}

/**
 * Finds a user by ID, including their role.
 *
 * @param {string} id
 * @returns {Promise<UserWithRole|null>}
 */
export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

/**
 * Updates a user's password hash.
 *
 * @param {string} userId
 * @param {string} passwordHash
 */
export async function updatePassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
