package com.nandakumar.savingsexpensetracker;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * User-initiated self-update for the privately distributed Android APK.
 * Never reads the plan, authentication data or Supabase. The OS remains
 * responsible for obtaining user permission and confirming installation.
 */
final class TrackerApkUpdate {
    private static final long MAX_APK_BYTES = 200L * 1024 * 1024;
    private static final Pattern VERSION = Pattern.compile("^[0-9]+\\.[0-9]+\\.[0-9]+$");
    private static final Pattern DIGEST = Pattern.compile("^[a-fA-F0-9]{64}$");
    private static final String RELEASES =
        "https://github.com/nandurpm/portfolio/releases/download/";
    private static final String FILE_PREFIX = "Savings-and-Expense-Tracker-";
    private static final String MIME = "application/vnd.android.package-archive";

    interface Progress {
        void report(long received, long total);
    }

    private TrackerApkUpdate() {}

    static String requireVersion(String version) {
        if (version == null || !VERSION.matcher(version).matches())
            throw new IllegalArgumentException("Invalid update version");
        return version;
    }

    static String requireDigest(String sha256) {
        if (sha256 == null || !DIGEST.matcher(sha256).matches())
            throw new IllegalArgumentException("Official release SHA-256 is required");
        return sha256.toLowerCase(Locale.US);
    }

    static String requireUrl(String url, String version) {
        String expected = RELEASES + "tracker-v" + requireVersion(version) +
            "/" + FILE_PREFIX + version + ".apk";
        if (!expected.equals(url))
            throw new IllegalArgumentException("Untrusted Android release address");
        return expected;
    }

    private static File updateFolder(Context context) throws IOException {
        File folder = new File(context.getFilesDir(), "tracker-updates");
        if (!folder.isDirectory() && !folder.mkdirs())
            throw new IOException("Cannot prepare private update folder");
        return folder;
    }

    private static File updateFile(Context context, String version) throws IOException {
        return new File(updateFolder(context), FILE_PREFIX + requireVersion(version) + ".apk");
    }

    private static boolean trustedRedirect(URL url) {
        String host = url.getHost().toLowerCase(Locale.US);
        return "https".equalsIgnoreCase(url.getProtocol()) &&
            url.getPort() == -1 && url.getUserInfo() == null &&
            ("github.com".equals(host) ||
             "release-assets.githubusercontent.com".equals(host) ||
             "objects.githubusercontent.com".equals(host));
    }

    private static String hex(byte[] bytes) {
        char[] digits = "0123456789abcdef".toCharArray();
        char[] out = new char[bytes.length * 2];
        for (int i = 0; i < bytes.length; i++) {
            int value = bytes[i] & 0xff;
            out[i * 2] = digits[value >>> 4];
            out[i * 2 + 1] = digits[value & 15];
        }
        return new String(out);
    }

    private static String fileDigest(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(file)) {
            byte[] buffer = new byte[65536];
            int n;
            while ((n = in.read(buffer)) != -1) digest.update(buffer, 0, n);
        }
        return hex(digest.digest());
    }

    private static boolean sameSigners(Signature[] a, Signature[] b) {
        if (a == null || b == null || a.length == 0 || a.length != b.length) return false;
        String[] left = new String[a.length], right = new String[b.length];
        for (int i = 0; i < a.length; i++) left[i] = hex(a[i].toByteArray());
        for (int i = 0; i < b.length; i++) right[i] = hex(b[i].toByteArray());
        Arrays.sort(left);
        Arrays.sort(right);
        return Arrays.equals(left, right);
    }

    private static void validatePackage(Context context, File file, String version) throws Exception {
        PackageManager pm = context.getPackageManager();
        PackageInfo candidate = pm.getPackageArchiveInfo(
            file.getAbsolutePath(), PackageManager.GET_SIGNING_CERTIFICATES);
        PackageInfo installed = pm.getPackageInfo(
            context.getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
        if (candidate == null || !context.getPackageName().equals(candidate.packageName))
            throw new IOException("Downloaded APK has a different package identity");
        if (!version.equals(candidate.versionName) ||
            candidate.getLongVersionCode() <= installed.getLongVersionCode())
            throw new IOException("Downloaded APK is not a newer Tracker version");
        if (candidate.signingInfo == null || installed.signingInfo == null ||
            !sameSigners(candidate.signingInfo.getApkContentsSigners(),
                         installed.signingInfo.getApkContentsSigners()))
            throw new IOException("Downloaded APK is not signed with the installed Tracker certificate");
    }

    static boolean isDownloaded(Context context, String version, String sha256) {
        try {
            File file = updateFile(context, requireVersion(version));
            return file.isFile() && file.length() > 0 &&
                file.length() <= MAX_APK_BYTES &&
                fileDigest(file).equals(requireDigest(sha256)) &&
                validPackage(context, file, version);
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean validPackage(Context context, File file, String version) {
        try {
            validatePackage(context, file, version);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    static void download(Context context, String version, String url,
                         String sha256, Progress reporter) throws Exception {
        requireUrl(url, version);
        String expectedHash = requireDigest(sha256);
        File destination = updateFile(context, version);
        if (isDownloaded(context, version, expectedHash)) {
            reporter.report(destination.length(), destination.length());
            return;
        }
        File partial = new File(updateFolder(context), FILE_PREFIX + version + ".download.apk");
        Files.deleteIfExists(partial.toPath());
        HttpURLConnection connection = null;
        try {
            URL next = new URL(url);
            boolean downloaded = false;
            for (int redirects = 0; redirects <= 5; redirects++) {
                if (!trustedRedirect(next)) throw new IOException("Untrusted update redirect");
                connection = (HttpURLConnection) next.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("User-Agent", "SavingsExpenseTracker-Android-Updater");
                connection.setRequestProperty("Accept", "application/octet-stream");
                int status = connection.getResponseCode();
                if (status == 301 || status == 302 || status == 303 ||
                    status == 307 || status == 308) {
                    String location = connection.getHeaderField("Location");
                    if (location == null) throw new IOException("Update redirect was incomplete");
                    URL destinationUrl = new URL(next, location);
                    if (!trustedRedirect(destinationUrl))
                        throw new IOException("Update redirected outside trusted release hosts");
                    connection.disconnect();
                    connection = null;
                    next = destinationUrl;
                    continue;
                }
                if (status != 200) throw new IOException("Update download failed (HTTP " + status + ")");
                long total = connection.getContentLengthLong();
                if (total > MAX_APK_BYTES) throw new IOException("Update exceeds size limit");
                long downloadedBytes = 0;
                long lastReported = 0;
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                try (InputStream in = connection.getInputStream();
                     FileOutputStream out = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[65536];
                    int count;
                    while ((count = in.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted())
                            throw new IOException("Update download interrupted");
                        downloadedBytes += count;
                        if (downloadedBytes > MAX_APK_BYTES)
                            throw new IOException("Update exceeds size limit");
                        sha.update(buffer, 0, count);
                        out.write(buffer, 0, count);
                        long now = android.os.SystemClock.elapsedRealtime();
                        if (now - lastReported >= 250) {
                            reporter.report(downloadedBytes, total);
                            lastReported = now;
                        }
                    }
                    out.getFD().sync();
                }
                if (downloadedBytes == 0 ||
                    (total >= 0 && downloadedBytes != total) ||
                    !hex(sha.digest()).equals(expectedHash))
                    throw new IOException("Downloaded APK failed its official SHA-256 verification");
                validatePackage(context, partial, version);
                Files.move(partial.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING);
                reporter.report(downloadedBytes, downloadedBytes);
                downloaded = true;
                break;
            }
            if (!downloaded) throw new IOException("Too many GitHub release redirects");
        } finally {
            if (connection != null) connection.disconnect();
            Files.deleteIfExists(partial.toPath());
        }
    }

    /** Returns false when the user must first enable this app as an install source. */
    static boolean install(Activity activity, String version, String sha256) throws Exception {
        File apk = updateFile(activity, version);
        if (!apk.isFile() || apk.length() == 0 || apk.length() > MAX_APK_BYTES ||
            !fileDigest(apk).equals(requireDigest(sha256)))
            throw new IOException("Verified update is missing. Download it again.");
        validatePackage(activity, apk, version);

        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + activity.getPackageName()));
            activity.startActivity(settings);
            return false;
        }

        Uri contentUri = FileProvider.getUriForFile(activity,
            activity.getPackageName() + ".trackerupdates", apk);
        Intent installer = new Intent(Intent.ACTION_VIEW);
        installer.setDataAndType(contentUri, MIME);
        installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        activity.startActivity(installer);
        return true;
    }
}
