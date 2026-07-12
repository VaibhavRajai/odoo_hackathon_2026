import prisma from "../../config/prisma.js";

/**
 * AuthRepository — all Prisma/database queries for the Auth module.
 * No business logic here — only data access.
 */

/**
 * Finds a user by their email address.
 *
 * @param {string} email
 * @returns {Promise<import("../../generated/prisma").User|null>}
 */
export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/**
 * Finds a user by their primary key ID.
 *
 * @param {string} id
 * @returns {Promise<import("../../generated/prisma").User|null>}
 */
export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Creates a new user record in the database.
 *
 * @param {{ email: string, passwordHash: string, name: string }} data
 * @returns {Promise<import("../../generated/prisma").User>}
 */
export async function createUser({ email, passwordHash, name }) {
  return prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
    },
  });
}

/**
 * Updates a user's password hash (used during password reset).
 *
 * @param {string} userId
 * @param {string} passwordHash - The new bcrypt hash.
 * @returns {Promise<import("../../generated/prisma").User>}
 */
export async function updatePassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
