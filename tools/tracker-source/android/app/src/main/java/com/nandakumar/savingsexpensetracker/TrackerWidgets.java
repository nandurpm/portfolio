package com.nandakumar.savingsexpensetracker;

import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.util.TypedValue;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

final class TrackerWidgets {
 static final String TOGGLE="com.nandakumar.savingsexpensetracker.WIDGET_PRIVACY";
 private static float textHeight(Context c,String text,int sp,int width) {
  TextPaint paint=new TextPaint();
  if(sp>=17)paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
  paint.setTextSize(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP,sp,c.getResources().getDisplayMetrics()));
  float density=c.getResources().getDisplayMetrics().density;
  return StaticLayout.Builder.obtain(text,0,text.length(),paint,Math.max(1,Math.round(width*density)))
   .setIncludePad(false).setBreakStrategy(android.text.Layout.BREAK_STRATEGY_SIMPLE).build().getHeight()/density;
 }
 private static float buttonHeight(Context c,int width) {
  return Math.max(48,Math.max(textHeight(c,"Refresh ↗",14,width/2-12),textHeight(c,"Add Expense",14,width/2-12))+8)+4;
 }
 static String month(long now) { return new SimpleDateFormat("yyyy-MM",Locale.US).format(new Date(now)); }
 static PendingIntent open(Context context,String action) {
  // Explicit, immutable intents contain only an allowlisted navigation action.
  Intent intent=new Intent(context,MainActivity.class).setAction(context.getPackageName()+".WIDGET_"+action)
   .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  return PendingIntent.getActivity(context,action.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 }
 static void updateAll(Context context) {
  synchronized(WidgetStore.LOCK) {
  AppWidgetManager manager=AppWidgetManager.getInstance(context);
  for(Class<?> provider:new Class<?>[]{QuickEntryWidget.class,MonthlySummaryWidget.class})
   for(int id:manager.getAppWidgetIds(new ComponentName(context,provider))) update(context,manager,id,provider==MonthlySummaryWidget.class);
  }
 }
 static void update(Context context,AppWidgetManager manager,int id,boolean summary) {
  synchronized(WidgetStore.LOCK) {
  Bundle options=manager.getAppWidgetOptions(id);
  int width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,250);
  int height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,250);
  int maxWidth=Math.max(width,options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,width));
  int maxHeight=Math.max(height,options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,height));
  WidgetStore store=new WidgetStore(context);long now=System.currentTimeMillis();
  manager.updateAppWidget(id,new RemoteViews(views(context,store,id,summary,maxWidth,height,now),views(context,store,id,summary,width,maxHeight,now)));
  }
 }
 static RemoteViews views(Context context,WidgetStore store,int id,boolean summary,int width,int height,long now) {
  float fontScale=context.getResources().getConfiguration().fontScale;
  boolean wide=summary && width>=340 && fontScale<=1.3f;
  RemoteViews views=new RemoteViews(context.getPackageName(),summary?(wide?R.layout.tracker_widget_summary_wide:R.layout.tracker_widget_summary):R.layout.tracker_widget_quick);
  views.setOnClickPendingIntent(R.id.widget_expense,open(context,"EXPENSE"));
  views.setOnClickPendingIntent(R.id.widget_income,open(context,"INCOME"));
  if(!summary) {
   String access=store.access();
   String message="signed_out".equals(access)?"Sign in in the app.":"locked".equals(access)?"Unlock your plan in the app.":"attention".equals(access)?"Review your data in the app.":"loading".equals(access)?"Open app to load your plan.":"Opens app · Review before saving";
   if(fontScale>1.3f && height<200) { views.setViewVisibility(R.id.widget_title,View.GONE);message="Open app"; }
   if(fontScale>1.3f && width<250) {
    views.setTextViewText(R.id.widget_expense,"Expense");views.setTextViewText(R.id.widget_income,"Income");
    views.setContentDescription(R.id.widget_expense,"Add expense in the app");views.setContentDescription(R.id.widget_income,"Add income in the app");
   }
   views.setTextViewText(R.id.widget_quick_status,message);
   return views;
  }
  views.setOnClickPendingIntent(R.id.widget_refresh,open(context,"REFRESH"));
  Intent privacy=new Intent(context,MonthlySummaryWidget.class).setAction(TOGGLE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);
  views.setOnClickPendingIntent(R.id.widget_privacy,PendingIntent.getBroadcast(context,id,privacy,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
  boolean hidden=store.hidden(id);
  views.setTextViewText(R.id.widget_privacy,hidden?"Show":"Hide");
  views.setContentDescription(R.id.widget_privacy,hidden?"Show widget amounts":"Hide widget amounts");
  JSONObject snapshot=store.snapshot();
  String state=store.access(), currentMonth=month(now), status;
  boolean valid=snapshot!=null && WidgetPolicy.mayShow(state,snapshot.optString("month"),currentMonth,snapshot.optLong("updatedAt"),now);
  KeyguardManager keyguard=(KeyguardManager)context.getSystemService(Context.KEYGUARD_SERVICE);
  boolean locked=keyguard!=null && keyguard.isDeviceLocked();
  views.setTextViewText(R.id.widget_title,new SimpleDateFormat("MMMM yyyy",Locale.forLanguageTag("en-IN")).format(new Date(now)));
  if(locked) { valid=false; status="Unlock your device and open the app."; }
  else if("signed_out".equals(state)) status="Sign in to refresh your summary.";
  else if("locked".equals(state)) status="Plan locked. Open the app to unlock.";
  else if("attention".equals(state)) status="Open the app to review your data.";
  else if(!valid) status=snapshot==null?"Open the app to load your summary.":"New month or clock change. Open app to refresh.";
  else if("outside_plan".equals(snapshot.optString("status"))) status="This month is outside your plan. Open app to review.";
  else if(WidgetPolicy.stale(snapshot.optLong("updatedAt"),now)) status="Cached summary · Open app to refresh";
  else if(snapshot.optBoolean("offline")) status="Offline · Cached on this device";
  else if(snapshot.optBoolean("syncPending")) status="On this device · Sync pending";
  else if("empty".equals(snapshot.optString("status"))) status="No income or expenses recorded this month.";
  else status="This month through today · Income minus expenses";
  String updated=valid?"Updated "+new SimpleDateFormat("dd MMM, HH:mm",Locale.forLanguageTag("en-IN")).format(new Date(snapshot.optLong("updatedAt"))):"Not refreshed";
  views.setTextViewText(R.id.widget_updated,updated);
  boolean amounts=valid && !hidden && !"outside_plan".equals(snapshot.optString("status"));
  int textWidth=Math.max(1,width-24),columnWidth=wide?Math.max(1,textWidth/3-4):Math.max(1,textWidth/2);
  float totalsHeight=0;
  for(int i=0;i<3;i++) {
   int target=new int[]{R.id.widget_income_value,R.id.widget_expenses_value,R.id.widget_savings_value}[i];
   String text=amounts?snapshot.optString(new String[]{"income","expenses","savings"}[i],"—"):(valid && hidden?"••••":"—");
   views.setTextViewText(target,text);
   float label=textHeight(context,new String[]{"Income received","Expenses paid","Savings"}[i],12,columnWidth),value=textHeight(context,text,18,columnWidth);
   float row=(wide?label+value:Math.max(label,value))+6;
   totalsHeight=wide?Math.max(totalsHeight,row):totalsHeight+row;
  }
  float required=24+textHeight(context,new SimpleDateFormat("MMMM yyyy",Locale.forLanguageTag("en-IN")).format(new Date(now)),17,textWidth)+6+
   totalsHeight+textHeight(context,status,12,textWidth)+3+textHeight(context,updated,11,textWidth)+buttonHeight(context,textWidth);
  boolean room=width>=170 && required<=height;
  if(!room) status="Enlarge widget to show totals, or open the app.";
  views.setTextViewText(R.id.widget_status,status);
  views.setViewVisibility(R.id.widget_totals,room?View.VISIBLE:View.GONE);
  // Quick entry appears only when the summary has room; the dedicated widget is always available.
  views.setViewVisibility(R.id.widget_entries,room && required+buttonHeight(context,textWidth)<=height?View.VISIBLE:View.GONE);
  return views;
 }
}
