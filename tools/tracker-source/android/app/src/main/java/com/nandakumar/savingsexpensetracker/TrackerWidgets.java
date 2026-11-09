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
import android.widget.FrameLayout;
import android.widget.TextView;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

final class TrackerWidgets {
 static final String TOGGLE="com.nandakumar.savingsexpensetracker.WIDGET_PRIVACY";
 private static float measuredHeight(Context c,RemoteViews views,int width) {
  float density=c.getResources().getDisplayMetrics().density;
  View view=views.apply(c,new FrameLayout(c));
  view.measure(View.MeasureSpec.makeMeasureSpec(Math.max(1,Math.round(width*density)),View.MeasureSpec.EXACTLY),
   View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
  return view.getMeasuredHeight()/density;
 }
 private static boolean completeAmountsFit(Context c,RemoteViews views,int width) {
  float density=c.getResources().getDisplayMetrics().density;
  View view=views.apply(c,new FrameLayout(c));
  int pixels=Math.max(1,Math.round(width*density));
  view.measure(View.MeasureSpec.makeMeasureSpec(pixels,View.MeasureSpec.EXACTLY),
   View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
  view.layout(0,0,pixels,view.getMeasuredHeight());
  for(int id:new int[]{R.id.widget_income_value,R.id.widget_expenses_value,R.id.widget_savings_value}) {
   TextView value=view.findViewById(id);
   if(value.getLayout()==null || value.getLayout().getLineCount()!=1 || value.getLayout().getEllipsisCount(0)>0 ||
    value.getPaint().measureText(value.getText().toString())>value.getWidth()-value.getCompoundPaddingLeft()-value.getCompoundPaddingRight()+0.5f) return false;
  }
  return true;
 }
 static String month(long now) { return new SimpleDateFormat("yyyy-MM",Locale.US).format(new Date(now)); }
 static PendingIntent open(Context context,String action) {
  // Explicit, immutable intents contain only an allowlisted navigation action.
  Intent intent=new Intent(context,MainActivity.class).setAction(context.getPackageName()+".WIDGET_"+action)
   .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  return PendingIntent.getActivity(context,action.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 }
 static void updateAll(Context context) {
  if(Looper.myLooper()!=Looper.getMainLooper()) {
   Context app=context.getApplicationContext();new Handler(Looper.getMainLooper()).post(()->updateAll(app));return;
  }
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
  boolean stackedActions=fontScale>1f && width<250;
  RemoteViews views=new RemoteViews(context.getPackageName(),summary?(wide?R.layout.tracker_widget_summary_wide:stackedActions?R.layout.tracker_widget_summary_accessible:R.layout.tracker_widget_summary):(stackedActions?R.layout.tracker_widget_quick_accessible:R.layout.tracker_widget_quick));
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
   if(measuredHeight(context,views,width)>height) {
    views.setViewVisibility(R.id.widget_title,View.GONE);
    views.setTextViewText(R.id.widget_quick_status,"Open app");
    views.setTextViewText(R.id.widget_expense,"Expense");views.setTextViewText(R.id.widget_income,"Income");
    views.setContentDescription(R.id.widget_expense,"Add expense in the app");views.setContentDescription(R.id.widget_income,"Add income in the app");
   }
   if(measuredHeight(context,views,width)>height) views.setViewVisibility(R.id.widget_quick_status,View.GONE);
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
  views.setTextViewText(R.id.widget_title,new SimpleDateFormat(fontScale>1.3f && width<250?"MMM yyyy":"MMMM yyyy",Locale.forLanguageTag("en-IN")).format(new Date(now)));
  if(locked) { valid=false; status="Unlock your device and open the app."; }
  else if("signed_out".equals(state)) status="Sign in to refresh your summary.";
  else if("locked".equals(state)) status="Plan locked. Open the app to unlock.";
  else if("attention".equals(state)) status="Open the app to review your data.";
  else if(!valid) status=snapshot==null?"Open the app to load your summary.":"New month or clock change. Open app to refresh.";
  else if("outside_plan".equals(snapshot.optString("status"))) status="This month is outside your plan. Open app to review.";
  else if(WidgetPolicy.stale(snapshot.optLong("updatedAt"),now)) status="Cached summary · Open app to refresh";
  else if(snapshot.optBoolean("offline")) status="Offline · Cached on this device";
  else if(snapshot.optBoolean("syncPending")) status="On this device · Sync pending";
  else if("empty".equals(snapshot.optString("status"))) status="No net income or expenses this month.";
  else status=width<250?"Through today":"This month through today · Income minus expenses";
  String updated=valid?"Updated "+new SimpleDateFormat("dd MMM, HH:mm",Locale.forLanguageTag("en-IN")).format(new Date(snapshot.optLong("updatedAt"))):"Not refreshed";
  views.setTextViewText(R.id.widget_updated,updated);
  views.setContentDescription(R.id.widget_updated,updated);
  boolean amounts=valid && !hidden && !"outside_plan".equals(snapshot.optString("status"));
  for(int i=0;i<3;i++) {
   int target=new int[]{R.id.widget_income_value,R.id.widget_expenses_value,R.id.widget_savings_value}[i];
   String text=amounts?snapshot.optString(new String[]{"income","expenses","savings"}[i],"—"):(valid && hidden?"••••":"—");
   views.setTextViewText(target,text);
  }
  views.setTextViewText(R.id.widget_status,status);
  views.setViewVisibility(R.id.widget_entries,View.GONE);
  boolean room=width>=170 && measuredHeight(context,views,width)<=height && completeAmountsFit(context,views,width);
  views.setViewVisibility(R.id.widget_totals,room?View.VISIBLE:View.GONE);
  if(!room && valid) views.setTextViewText(R.id.widget_status,"Enlarge widget or open app.");
  if(!room && measuredHeight(context,views,width)>height) {
   views.setTextViewText(R.id.widget_status,locked?"Unlock device":"signed_out".equals(state)?"Sign in in app":"locked".equals(state)?"Unlock in app":"attention".equals(state)?"Review in app":!valid?"Open app to load":"Enlarge widget");
   views.setTextViewText(R.id.widget_updated,valid?new SimpleDateFormat("dd MMM HH:mm",Locale.forLanguageTag("en-IN")).format(new Date(snapshot.optLong("updatedAt"))):"Not refreshed");
  }
  // Summary only shows totals and privacy; use the dedicated Quick Entry
  // widget for transaction shortcuts instead of duplicating its controls.
  return views;
 }
}
