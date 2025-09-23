"use server";

import { getFireHoseIdByNumberAndOwner } from "./fireHoseRepository";

export async function lookupFirehoseId(
  number: number,
  ownerId: string,
): Promise<string | null> {
  return await getFireHoseIdByNumberAndOwner(number, ownerId);
}
