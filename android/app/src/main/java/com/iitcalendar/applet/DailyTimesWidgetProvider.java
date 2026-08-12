package com.iitcalendar.applet;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class DailyTimesWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "DailyTimesWidget";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called for " + appWidgetIds.length + " widgets");
        try {
            SharedPreferences prefs = context.getSharedPreferences("group.iit.calendar", Context.MODE_PRIVATE);
            String sunTimesRaw = prefs.getString("sun_times", "[]");
            if (sunTimesRaw == null) sunTimesRaw = "[]";
            Log.d(TAG, "Raw sun times: " + sunTimesRaw);

            String dawnText = "--:--";
            String noonText = "--:--";

            try {
                JSONArray sunArray = new JSONArray(sunTimesRaw);
                if (sunArray.length() > 0) {
                    // Find today's entry
                    String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
                    Log.d(TAG, "Today's date string: " + todayStr);
                    boolean found = false;
                    for (int i = 0; i < sunArray.length(); i++) {
                        JSONObject entry = sunArray.getJSONObject(i);
                        if (todayStr.equals(entry.optString("date"))) {
                            dawnText = entry.optString("dawn", "--:--");
                            noonText = entry.optString("noon", "--:--");
                            found = true;
                            Log.d(TAG, "Found today's entry: dawn=" + dawnText + ", noon=" + noonText);
                            break;
                        }
                    }
                    // Fallback to first entry if today not found
                    if (!found) {
                        Log.w(TAG, "Today's entry not found, falling back to first entry");
                        JSONObject first = sunArray.getJSONObject(0);
                        dawnText = first.optString("dawn", "--:--");
                        noonText = first.optString("noon", "--:--");
                    }
                } else {
                    Log.w(TAG, "sunArray is empty");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing JSON array", e);
            }

            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            android.app.PendingIntent pendingIntent = null;
            if (launchIntent != null) {
                pendingIntent = android.app.PendingIntent.getActivity(
                    context, 0, launchIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );
            }

            String dawnTime = dawnText;
            String dawnAmPm = "";
            if (dawnText != null) {
                String upper = dawnText.toUpperCase();
                if (upper.contains("AM")) {
                    dawnTime = dawnText.substring(0, upper.indexOf("AM")).trim();
                    dawnAmPm = "AM";
                } else if (upper.contains("PM")) {
                    dawnTime = dawnText.substring(0, upper.indexOf("PM")).trim();
                    dawnAmPm = "PM";
                }
            }

            String noonTime = noonText;
            String noonAmPm = "";
            if (noonText != null) {
                String upper = noonText.toUpperCase();
                if (upper.contains("AM")) {
                    noonTime = noonText.substring(0, upper.indexOf("AM")).trim();
                    noonAmPm = "AM";
                } else if (upper.contains("PM")) {
                    noonTime = noonText.substring(0, upper.indexOf("PM")).trim();
                    noonAmPm = "PM";
                }
            }

            for (int appWidgetId : appWidgetIds) {
                Log.d(TAG, "Updating widget id: " + appWidgetId);
                RemoteViews views;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                    RemoteViews views2x1 = new RemoteViews(context.getPackageName(), R.layout.widget_daily_times_2x1);
                    setupRemoteViews(views2x1, dawnTime, dawnAmPm, noonTime, noonAmPm, pendingIntent);

                    RemoteViews views2x2 = new RemoteViews(context.getPackageName(), R.layout.widget_daily_times);
                    setupRemoteViews(views2x2, dawnTime, dawnAmPm, noonTime, noonAmPm, pendingIntent);

                    java.util.Map<android.util.SizeF, RemoteViews> viewMap = new java.util.HashMap<>();
                    viewMap.put(new android.util.SizeF(110f, 40f), views2x1);
                    viewMap.put(new android.util.SizeF(110f, 110f), views2x2);
                    views = new RemoteViews(viewMap);
                } else {
                    android.os.Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
                    int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110) : 110;
                    int layoutRes = minHeight < 100 ? R.layout.widget_daily_times_2x1 : R.layout.widget_daily_times;
                    views = new RemoteViews(context.getPackageName(), layoutRes);
                    setupRemoteViews(views, dawnTime, dawnAmPm, noonTime, noonAmPm, pendingIntent);
                }
                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onUpdate", e);
        }
    }

    private static void setupRemoteViews(RemoteViews views, String dawnTime, String dawnAmPm, String noonTime, String noonAmPm, android.app.PendingIntent pendingIntent) {
        views.setTextViewText(R.id.tvDawnTime, dawnTime);
        views.setTextViewText(R.id.tvDawnAmPm, dawnAmPm);
        views.setTextViewText(R.id.tvNoonTime, noonTime);
        views.setTextViewText(R.id.tvNoonAmPm, noonAmPm);
        if (pendingIntent != null) {
            views.setOnClickPendingIntent(android.R.id.background, pendingIntent);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, android.os.Bundle newOptions) {
        onUpdate(context, appWidgetManager, new int[]{appWidgetId});
    }
}
