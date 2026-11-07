package com.nandakumar.savingsexpensetracker;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

public class MonthlySummaryWidget extends QuickEntryWidget {
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids) { for(int id:ids) TrackerWidgets.update(c,manager,id,true); }
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options) { TrackerWidgets.update(c,m,id,true); }
 @Override public void onDeleted(Context c,int[] ids) { WidgetStore store=new WidgetStore(c);for(int id:ids)store.remove(id); }
 @Override public void onReceive(Context c,Intent intent) {
  super.onReceive(c,intent);
  if(!TrackerWidgets.TOGGLE.equals(intent.getAction())) return;
  int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
  AppWidgetManager manager=AppWidgetManager.getInstance(c);
  android.appwidget.AppWidgetProviderInfo info=manager.getAppWidgetInfo(id);
  if(info==null || !new ComponentName(c,MonthlySummaryWidget.class).equals(info.provider)) return;
  WidgetStore store=new WidgetStore(c);store.hidden(id,!store.hidden(id));
  TrackerWidgets.update(c,manager,id,true);
 }
}
