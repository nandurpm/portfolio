package com.nandakumar.savingsexpensetracker;

import org.junit.Test;
import static org.junit.Assert.*;

public class WidgetPolicyTest {
 @Test public void oldProcessesAndOutOfOrderUpdatesCannotRestoreData() {
  assertTrue(WidgetPolicy.accept(2,3,2,2));
  assertFalse(WidgetPolicy.accept(1,100,2,2));
  assertFalse(WidgetPolicy.accept(2,2,2,2));
 }
 @Test public void cachedMonthsAndClockChangesNeverLookLikeCurrentZero() {
  assertTrue(WidgetPolicy.mayShow("ready","2026-12","2026-12",100000,100100));
  assertFalse(WidgetPolicy.mayShow("ready","2026-12","2027-01",100000,100100));
  assertFalse(WidgetPolicy.mayShow("locked","2026-12","2026-12",100000,100100));
  assertFalse(WidgetPolicy.mayShow("ready","2026-12","2026-12",200000,100100));
  assertTrue(WidgetPolicy.stale(100,WidgetPolicy.STALE_AFTER_MS+101));
 }
 @Test public void intentAllowlistHasNavigationOnly() {
  assertEquals("expense",WidgetPolicy.action("com.nandakumar.savingsexpensetracker.WIDGET_EXPENSE"));
  assertEquals("income",WidgetPolicy.action("com.nandakumar.savingsexpensetracker.WIDGET_INCOME"));
  assertEquals("refresh",WidgetPolicy.action("com.nandakumar.savingsexpensetracker.WIDGET_REFRESH"));
  assertNull(WidgetPolicy.action("save"));assertNull(WidgetPolicy.action(null));
 }
}
