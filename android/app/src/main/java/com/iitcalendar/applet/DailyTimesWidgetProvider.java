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

            for (int appWidgetId : appWidgetIds) {
                Log.d(TAG, "Updating widget id: " + appWidgetId);
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_daily_times);
                views.setTextViewText(R.id.tvDawnTime, dawnText);
                views.setTextViewText(R.id.tvNoonTime, noonText);
                if (pendingIntent != null) {
                    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
                }
                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onUpdate", e);
        }
    }
}
