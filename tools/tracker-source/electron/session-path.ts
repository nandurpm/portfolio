import path from "node:path";
import { createHash } from "node:crypto";

/** Bound credential files to our auth namespace, never to caller-supplied paths. */
export function sessionPath(folder: string, key: string): string {
  if (
    typeof key !== "string" ||
    key.length > 160 ||
    !/^tracker-auth-v1(?:-[A-Za-z0-9._:-]+)?$/.test(key)
  )
    throw Error("Unknown session key");
  return path.join(
    folder,
    key === "tracker-auth-v1"
      ? "auth-session.bin"
      : `auth-${createHash("sha256").update(key).digest("hex")}.bin`,
  );
}
