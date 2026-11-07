package com.nandakumar.savingsexpensetracker;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** Private, disposable display cache. No credentials or transaction records are stored here. */
final class WidgetStore {
 static final Object LOCK = new Object();
 private final SharedPreferences prefs;
 WidgetStore(Context context) { this(context,"tracker-widgets-v1"); }
 WidgetStore(Context context,String name) { prefs=context.getSharedPreferences(name,Context.MODE_PRIVATE); }
 long begin() {
  synchronized(LOCK) {
   long epoch=prefs.getLong("epoch",0)+1;
   commit(clear(prefs.edit()).putLong("epoch",epoch).putLong("sequence",0).putString("access","loading"));
   return epoch;
  }
 }
 private SharedPreferences.Editor clear(SharedPreferences.Editor edit) {
  return edit.remove("snapshot").remove("owner");
 }
 private static void commit(SharedPreferences.Editor edit) {
  if(!edit.commit()) throw new IllegalStateException("Widget cache unavailable");
 }
 void sessionOwner(String owner) {
  synchronized(LOCK) {
   if(owner.equals(prefs.getString("sessionOwner",""))) return;
   commit(clear(prefs.edit()).putString("sessionOwner",owner).putString("access",owner.isEmpty()?"signed_out":"loading"));
  }
 }
 boolean write(long epoch,long sequence,String owner,String access,JSONObject snapshot) throws Exception {
  synchronized(LOCK) {
   if(!WidgetPolicy.accept(epoch,sequence,prefs.getLong("epoch",0),prefs.getLong("sequence",0))) return false;
   if(!java.util.Arrays.asList("ready","loading","signed_out","locked","attention").contains(access)) throw new IllegalArgumentException("Invalid widget state");
   if("ready".equals(access)) {
    String sessionOwner=prefs.getString("sessionOwner","");
    // Token removal/account switching revokes old snapshots even before JS receives its auth event.
    if(!(owner.equals(sessionOwner) && !owner.isEmpty()) && !("local".equals(owner) && sessionOwner.isEmpty())) return false;
    if(snapshot==null || !snapshot.getString("month").matches("\\d{4}-(0[1-9]|1[0-2])") || snapshot.getLong("updatedAt")<=0)
     throw new IllegalArgumentException("Invalid widget snapshot");
    for(String key:new String[]{"monthText","income","expenses","savings"})
     if(snapshot.getString(key).length()>96) throw new IllegalArgumentException("Invalid widget text");
    if(!java.util.Arrays.asList("ready","empty","outside_plan").contains(snapshot.getString("status"))) throw new IllegalArgumentException("Invalid snapshot state");
   }
   SharedPreferences.Editor edit=clear(prefs.edit()).putLong("sequence",sequence).putString("access",access);
   if("ready".equals(access)) edit.putString("owner",owner).putString("snapshot",snapshot.toString());
   commit(edit);
   return true;
  }
 }
 String access() { return prefs.getString("access","loading"); }
 JSONObject snapshot() {
  try { String value=prefs.getString("snapshot",null); return value==null?null:new JSONObject(value); }
  catch(Exception ignored) { return null; }
 }
 boolean hidden(int id) { return prefs.getBoolean("hidden-"+id,true); }
 void hidden(int id,boolean hidden) { commit(prefs.edit().putBoolean("hidden-"+id,hidden)); }
 void remove(int id) { commit(prefs.edit().remove("hidden-"+id)); }
}
