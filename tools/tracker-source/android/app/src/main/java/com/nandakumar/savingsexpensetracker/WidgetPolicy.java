package com.nandakumar.savingsexpensetracker;

/** Presentation/access policy only. Financial arithmetic stays in the shared TypeScript engine. */
final class WidgetPolicy {
 static final long STALE_AFTER_MS = 6 * 60 * 60 * 1000;
 static boolean accept(long epoch,long sequence,long expectedEpoch,long lastSequence) {
  return epoch == expectedEpoch && sequence > lastSequence;
 }
 static boolean mayShow(String access,String snapshotMonth,String currentMonth,long updatedAt,long now) {
  return "ready".equals(access) && currentMonth.equals(snapshotMonth) && updatedAt > 0 && updatedAt <= now + 60000;
 }
 static boolean stale(long updatedAt,long now) { return now - updatedAt > STALE_AFTER_MS; }
 static String action(String action) {
  if ("com.nandakumar.savingsexpensetracker.WIDGET_EXPENSE".equals(action)) return "expense";
  if ("com.nandakumar.savingsexpensetracker.WIDGET_INCOME".equals(action)) return "income";
  if ("com.nandakumar.savingsexpensetracker.WIDGET_REFRESH".equals(action)) return "refresh";
  return null;
 }
}
