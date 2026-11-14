package com.nandakumar.savingsexpensetracker;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.BackoffPolicy;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.WorkManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notification-only background release checks. Never reads financial files, credentials or cloud data.
 * Android schedules periodic work opportunistically; Doze and permission settings can delay alerts.
 */
public final class TrackerUpdateWorker extends Worker {
    private static final String API =
        "https://api.github.com/repos/nandurpm/portfolio/releases?per_page=10";
    private static final String ROOT =
        "https://github.com/nandurpm/portfolio/releases/download/";
    private static final String CHANNEL = "tracker-software-updates";
    private static final String UNIQUE_WORK = "tracker-release-notifications";
    private static final String PREFS = "tracker-software-alerts";
    private static final Pattern VERSION = Pattern.compile("^(?:tracker-v)?([0-9]+)\\.([0-9]+)\\.([0-9]+)$");

    public TrackerUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    public static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        PeriodicWorkRequest request =
            new PeriodicWorkRequest.Builder(TrackerUpdateWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_WORK, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    static int compareVersions(String left, String right) {
        Matcher a = VERSION.matcher(left == null ? "" : left);
        Matcher b = VERSION.matcher(right == null ? "" : right);
        if (!a.matches() || !b.matches()) return 0;
        for (int i = 1; i <= 3; i++) {
            long av;
            long bv;
            try {
                av = Long.parseLong(a.group(i));
                bv = Long.parseLong(b.group(i));
            } catch (NumberFormatException invalid) {
                return 0;
            }
            if (av != bv) return av > bv ? 1 : -1;
        }
        return 0;
    }

    @NonNull @Override public Result doWork() {
        Context context = getApplicationContext();
        try {
            String installed = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0).versionName;
            if (installed == null) return Result.success();
            JSONObject available = newestVerifiedRelease(downloadReleases(), installed);
            if (available == null) return Result.success();
            String tag = available.getString("tag");
            String last = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("last-notified-tag", "");
            if (tag.equals(last)) return Result.success();
            if (!notificationsEnabled(context)) return Result.success();
            sendNotification(context, available.getString("version"), available.getString("apk"));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString("last-notified-tag", tag).apply();
        } catch (Exception ignored) {
            // No financial state is affected. Retry transient network, rate-limit,
            // and malformed-release failures instead of recording a false success.
            return Result.retry();
        }
        return Result.success();
    }

    private static JSONArray downloadReleases() throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(API).openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("Accept", "application/vnd.github+json");
            connection.setRequestProperty("User-Agent", "SavingsExpenseTracker-Android-Updates");
            if (connection.getResponseCode() != 200)
                throw new IllegalStateException("GitHub releases unavailable");
            try (InputStream stream = connection.getInputStream();
                 ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int read;
                while ((read = stream.read(buffer)) != -1) {
                    if (bytes.size() + read > 512000)
                        throw new IllegalStateException("Release response exceeds limit");
                    bytes.write(buffer, 0, read);
                }
                return new JSONArray(bytes.toString(StandardCharsets.UTF_8.name()));
            }
        } finally {
            connection.disconnect();
        }
    }

    static JSONObject newestVerifiedRelease(JSONArray releases, String installed) {
        JSONObject best = null;
        for (int i = 0; i < releases.length(); i++) {
            JSONObject release = releases.optJSONObject(i);
            if (release == null || release.optBoolean("draft", true)
                || release.optBoolean("prerelease", true)) continue;
            String tag = release.optString("tag_name", "");
            if (!tag.matches("^tracker-v[0-9]+\\.[0-9]+\\.[0-9]+$") ||
                compareVersions(tag, installed) <= 0) continue;
            String version = tag.substring("tracker-v".length());
            String apkFile = "Savings-and-Expense-Tracker-" + version + ".apk";
            String download = ROOT + tag + "/" + apkFile;
            JSONArray assets = release.optJSONArray("assets");
            if (assets == null) continue;
            boolean verified = false;
            for (int j = 0; j < assets.length(); j++) {
                JSONObject asset = assets.optJSONObject(j);
                if (asset != null && apkFile.equals(asset.optString("name"))
                    && download.equals(asset.optString("browser_download_url"))
                    && "uploaded".equals(asset.optString("state"))
                    && asset.optLong("size") > 0) {
                    verified = true;
                    break;
                }
            }
            if (!verified) continue;
            if (best == null || compareVersions(tag, best.optString("tag")) > 0) {
                best = new JSONObject();
                try {
                    best.put("tag", tag);
                    best.put("version", version);
                    best.put("apk", download);
                } catch (Exception ignored) {
                    best = null;
                }
            }
        }
        return best;
    }

    private static boolean notificationsEnabled(Context context) {
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null && manager.areNotificationsEnabled();
    }

    private static void sendNotification(Context context, String version, String download) {
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL, "Tracker software updates", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Official Savings & Expense Tracker Android releases");
            manager.createNotificationChannel(channel);
        }
        // Open Tracker's own update dialog instead of a GitHub browser download.
        // Foreground release checking will offer the verified in-app APK installer.
        Intent open = new Intent(context, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.addCategory(Intent.CATEGORY_LAUNCHER);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent intent = PendingIntent.getActivity(context, 90224, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle("Tracker update " + version + " available")
            .setContentText("Open Tracker to download and install the verified update.")
            .setStyle(new Notification.BigTextStyle().bigText(
                "Savings & Expense Tracker " + version +
                " has been released. Open Tracker to download and install it in the app. Sync pending changes and export a JSON backup first."))
            .setContentIntent(intent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_STATUS)
            .build();
        manager.notify(90224, notification);
    }
}
