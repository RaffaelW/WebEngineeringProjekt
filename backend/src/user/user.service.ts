import { prisma } from "../lib/prisma.js";

export async function getUserById(id: number) {
  return await prisma.appUser.findUnique({
    where: { id },
  });
}

export async function getUserByName(name: string) {
  return await prisma.appUser.findUnique({
    where: { name },
  });
}

export async function createUser(name: string, hashedPassword: string) {
  return await prisma.appUser.create({
    data: {
      name,
      hashPassword: hashedPassword,
    },
  });
}

export async function deleteUser(id: number) {
  return await prisma.appUser.delete({
    where: { id },
  });
}
