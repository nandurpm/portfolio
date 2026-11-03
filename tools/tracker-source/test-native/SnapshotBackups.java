package com.nandakumar.savingsexpensetracker;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.UUID;

/** Retain ten distinct byte snapshots; native Activity switches must not rotate unchanged data. */
final class SnapshotBackups {
    static File[] list(File folder) {
        File[] files = folder.listFiles((d, n) -> n.startsWith("Savings-and-Expense-Tracker-") && n.endsWith(".json"));
        if (files == null) return new File[0];
        Arrays.sort(files, (a,b) -> {
            try { return Files.getLastModifiedTime(b.toPath()).compareTo(Files.getLastModifiedTime(a.toPath())); }
            catch (IOException e) { return Long.compare(b.lastModified(),a.lastModified()); }
        });
        return files;
    }
    static File create(byte[] data, File folder) throws Exception {
        if (!folder.exists() && !folder.mkdirs()) throw new IOException("Cannot create backup folder");
        File[] before = list(folder);
        if (before.length > 0) {
            try {
                if (MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(data),
                    MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(before[0].toPath())))) return before[0];
            } catch (IOException ignored) { /* A damaged newest copy must not prevent a fresh snapshot. */ }
        }
        File dest = new File(folder, "Savings-and-Expense-Tracker-" + System.currentTimeMillis() + "-" + UUID.randomUUID() + ".json");
        File temp = new File(dest.getPath() + ".tmp");
        try {
            try (FileOutputStream out = new FileOutputStream(temp)) { out.write(data); out.getFD().sync(); }
            Files.move(temp.toPath(), dest.toPath(), StandardCopyOption.ATOMIC_MOVE);
        } finally { Files.deleteIfExists(temp.toPath()); }
        File[] all = list(folder);
        int kept = 1; // Always retain this snapshot, even on filesystems with coarse timestamp resolution.
        for (File file : all) if (!file.equals(dest) && kept++ >= 10) Files.deleteIfExists(file.toPath());
        return dest;
    }
}