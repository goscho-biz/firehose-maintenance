"use server";

import prisma from "./prisma";
import { FireHose, FireHoseDiameter } from "./types";
import { queryMinFreeHoseNumber } from "@/app/generated/prisma/sql";

function validateFireHoseDiameter(value: string): boolean {
  return ["A", "B", "C", "D"].includes(value);
}

function castToFireHoseDiameter(value: string): FireHoseDiameter {
  if (validateFireHoseDiameter(value)) {
    return value as FireHoseDiameter;
  }
  throw new Error("Invalid FireHose diameter");
}

function castFromFireHoseDiameter(value: FireHoseDiameter): string {
  return value as string;
}

/**
 * Creates a new FireHose in the database
 * @param data The FireHose data to create
 * @returns The created FireHose
 * @throws Error if the FireHose could not be created
 */
export async function createFireHose(data: {
  number: number;
  ownerId: string;
  length: number;
  diameter: FireHoseDiameter;
  commissionedAt: Date | null;
}): Promise<FireHose> {
  // Validate required fields
  if (!data.number) {
    throw new Error("FireHose number is required");
  }
  if (!data.ownerId) {
    throw new Error("Owner ID is required");
  }
  if (!data.length) {
    throw new Error("FireHose length is required");
  }
  if (!data.diameter) {
    throw new Error("FireHose diameter is required");
  }

  // Check if a FireHose with the same number and owner already exists
  const existingFireHose = await prisma.fireHose.findFirst({
    where: {
      number: data.number,
      ownerId: data.ownerId,
      decommissionedAt: null, // Only check active FireHoses
    },
  });

  if (existingFireHose) {
    throw new Error(
      `A FireHose with number ${data.number} already exists for this owner`,
    );
  }

  // Create the FireHose
  const createdFireHose = await prisma.fireHose.create({
    data: {
      number: data.number,
      ownerId: data.ownerId,
      length: data.length,
      diameter: castFromFireHoseDiameter(data.diameter),
      commissionedAt: data.commissionedAt || new Date(),
      maintenances: {
        create: [], // Initialize with empty maintenances
      },
    },
    include: {
      owner: true,
      maintenances: true,
    },
  });

  return {
    ...createdFireHose,
    diameter: castToFireHoseDiameter(createdFireHose.diameter),
  };
}

/**
 * Gets a FireHose by its ID
 * @param id The ID of the FireHose to get
 * @returns The FireHose or null if not found
 * @throws Error if there was an error fetching the FireHose
 */
export async function getFireHoseById(id: string): Promise<FireHose | null> {
  if (!id) {
    throw new Error("FireHose ID is required");
  }

  const fireHose = await prisma.fireHose.findUnique({
    where: { id },
    include: {
      owner: true,
      maintenances: true,
    },
  });

  if (!fireHose) {
    return null;
  }
  return { ...fireHose, diameter: castToFireHoseDiameter(fireHose.diameter) };
}

/**
 * Gets a FireHose by its number and owner ID
 * @param number The number of the FireHose
 * @param ownerMarker The marker of the owner
 * @returns The FireHose or null if not found
 * @throws Error if there was an error fetching the FireHose
 */
export async function getFireHoseByNumberAndOwner(
  number: number,
  ownerMarker: string,
): Promise<FireHose | null> {
  if (!number) {
    throw new Error("FireHose number is required");
  }
  if (!ownerMarker) {
    throw new Error("Owner ID is required");
  }

  const fireHose = await prisma.fireHose.findFirst({
    where: {
      number: {
        equals: number,
      },
      decommissionedAt: null,
      owner: {
        is: {
          marker: ownerMarker,
        },
      },
    },
    include: {
      owner: true,
      maintenances: {
        orderBy: {
          timestamp: "desc",
        },
      },
    },
  });

  if (!fireHose) {
    return null;
  }
  return { ...fireHose, diameter: castToFireHoseDiameter(fireHose.diameter) };
}

/**
 * Gets all FireHoses with optional filtering
 * @param options Options for filtering, pagination, and sorting
 * @returns An array of FireHoses
 * @throws Error if there was an error fetching the FireHoses
 */
// export async function getFireHoses(options?: {
//   ownerId?: string;
//   includeDecommissioned?: boolean;
//   skip?: number;
//   take?: number;
//   orderBy?: {
//     field: "number" | "commissionedAt" | "length";
//     direction: "asc" | "desc";
//   };
// }): Promise<FireHose[]> {
//   try {
//     const whereClause: {
//       ownerId?: string;
//       decommissionedAt?: null;
//     } = {};
//
//     // Filter by owner if provided
//     if (options?.ownerId) {
//       whereClause.ownerId = options.ownerId;
//     }
//
//     // Only include active FireHoses unless specified
//     if (!options?.includeDecommissioned) {
//       whereClause.decommissionedAt = null;
//     }
//
//     // Set up ordering
//     const orderBy: Record<string, "asc" | "desc"> = {};
//     if (options?.orderBy) {
//       orderBy[options.orderBy.field] = options.orderBy.direction;
//     } else {
//       // Default ordering by number ascending
//       orderBy.number = "asc";
//     }
//
//     const fireHoses = await prisma.fireHose.findMany({
//       where: whereClause,
//       include: {
//         owner: true,
//         maintenances: true,
//       },
//       skip: options?.skip || 0,
//       take: options?.take || 100, // Default limit to 100 records
//       orderBy,
//     });
//
//     return fireHoses;
//   } catch (error) {
//     console.error("Error getting FireHoses:", error);
//     throw error;
//   }
// }

/**
 * Updates an existing FireHose in the database
 * @param id The ID of the FireHose to update
 * @param data The FireHose data to update
 * @returns The updated FireHose
 * @throws Error if the FireHose could not be updated
 */
export async function updateFireHose(
  id: string,
  data: {
    number?: number;
    ownerId?: string;
    length?: number;
    diameter?: string;
    decommissionedAt?: Date | null;
  },
): Promise<FireHose> {
  if (!id) {
    throw new Error("FireHose ID is required");
  }

  // Check if the FireHose exists
  const existingFireHose = await prisma.fireHose.findUnique({
    where: { id },
  });

  if (!existingFireHose) {
    throw new Error(`FireHose with ID ${id} not found`);
  }

  // If changing number or owner, check for duplicates
  if (
    (data.number || data.ownerId) &&
    (data.number !== existingFireHose.number ||
      data.ownerId !== existingFireHose.ownerId)
  ) {
    const duplicate = await prisma.fireHose.findFirst({
      where: {
        number: data.number || existingFireHose.number,
        ownerId: data.ownerId || existingFireHose.ownerId,
        id: { not: id }, // Exclude the current FireHose
        decommissionedAt: null, // Only check active FireHoses
      },
    });

    if (duplicate) {
      throw new Error(
        `A FireHose with number ${data.number || existingFireHose.number} already exists for this owner`,
      );
    }
  }

  // Update the FireHose
  const updatedFireHose = await prisma.fireHose.update({
    where: { id },
    data,
    include: {
      owner: true,
      maintenances: true,
    },
  });

  return {
    ...updatedFireHose,
    diameter: castToFireHoseDiameter(updatedFireHose.diameter),
  };
}

/**
 * Marks a FireHose as decommissioned (soft delete)
 * @param id The ID of the FireHose to decommission
 * @param decommissionedAt The date when the FireHose was decommissioned (default: current date)
 * @returns The decommissioned FireHose
 * @throws Error if the FireHose could not be decommissioned
 */
export async function decommissionFireHose(
  id: string,
  decommissionedAt: Date = new Date(),
): Promise<FireHose> {
  if (!id) {
    throw new Error("FireHose ID is required");
  }

  // Check if the FireHose exists and is not already decommissioned
  const existingFireHose = await prisma.fireHose.findUnique({
    where: { id },
  });

  if (!existingFireHose) {
    throw new Error(`FireHose with ID ${id} not found`);
  }

  if (existingFireHose.decommissionedAt) {
    throw new Error(`FireHose with ID ${id} is already decommissioned`);
  }

  // Mark the FireHose as decommissioned
  const decommissionedFireHose = await prisma.fireHose.update({
    where: { id },
    data: {
      decommissionedAt,
    },
    include: {
      owner: true,
      maintenances: true,
    },
  });

  return {
    ...decommissionedFireHose,
    diameter: castToFireHoseDiameter(decommissionedFireHose.diameter),
  };
}

/**
 * Permanently deletes a FireHose from the database
 * @param id The ID of the FireHose to delete
 * @returns True if the FireHose was deleted successfully
 * @throws Error if the FireHose could not be deleted
 */
export async function deleteFireHose(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("FireHose ID is required");
  }

  // Check if the FireHose exists
  const existingFireHose = await prisma.fireHose.findUnique({
    where: { id },
    include: {
      maintenances: true,
    },
  });

  if (!existingFireHose) {
    throw new Error(`FireHose with ID ${id} not found`);
  }

  // Delete associated maintenances first
  if (existingFireHose.maintenances.length > 0) {
    await prisma.maintenance.deleteMany({
      where: {
        fireHoseId: id,
      },
    });
  }

  // Delete the FireHose
  await prisma.fireHose.delete({
    where: { id },
  });

  return true;
}

/**
 * Gets a FireHose ID by its number and owner ID
 * @param number The number of the FireHose
 * @param ownerId The ID of the owner
 * @returns The FireHose ID or null if not found
 * @throws Error if there was an error fetching the FireHose
 */
export async function getFireHoseIdByNumberAndOwner (
  number: number,
  ownerId: string,
): Promise<string | null> {
  if (!number) {
    throw new Error("FireHose number is required");
  }
  if (!ownerId) {
    throw new Error("Owner ID is required");
  }

  const fireHose = await prisma.fireHose.findFirst({
    where: {
      number: {
        equals: number,
      },
      decommissionedAt: null,
      ownerId: ownerId,
    },
    select: {
      id: true,
    },
  });

  return fireHose?.id || null;
}

/**
 * Finds the smallest number not assigned to an commissioned fire hose for a given owner
 * @param ownerId the owner to find the number for
 */
export async function findMinFreeHoseNumber(ownerId: string): Promise<number> {
  if (!ownerId) {
    throw new Error("FireHose ID is required");
  }
  const results = await prisma.$queryRawTyped(queryMinFreeHoseNumber(ownerId));
  const minFreeNumber = results[0];

  if (!minFreeNumber?.min_free_number) {
    throw new Error("No free FireHose numbers found");
  }
  return minFreeNumber.min_free_number;
}
