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

export async function updateUser(id: number, name?: string, hashedPassword?: string) {
  const data: { name?: string; hashPassword?: string } = {};
  if (name) data.name = name;
  if (hashedPassword) data.hashPassword = hashedPassword;

  return await prisma.appUser.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: number) {
  return await prisma.appUser.delete({
    where: { id },
  });
}

export async function getUserList() {
  return await prisma.appUser.findMany({
    select: {
      id: true,
      name: true,
    },
  });
}
