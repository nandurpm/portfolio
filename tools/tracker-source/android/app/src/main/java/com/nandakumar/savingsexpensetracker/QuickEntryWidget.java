package com.nandakumar.savingsexpensetracker;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

public class QuickEntryWidget extends AppWidgetProvider {
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids) {
  for(int id:ids) TrackerWidgets.update(c,manager,id,false);
 }
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options) { TrackerWidgets.update(c,m,id,false); }
 @Override public void onReceive(Context c,Intent intent) {
  super.onReceive(c,intent);
  String action=intent.getAction();
  if(Intent.ACTION_DATE_CHANGED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_CONFIGURATION_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) TrackerWidgets.updateAll(c);
 }
}
