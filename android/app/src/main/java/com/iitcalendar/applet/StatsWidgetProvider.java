package com.iitcalendar.applet;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class StatsWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "StatsWidget";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called for " + appWidgetIds.length + " widgets");
        try {
            SharedPreferences prefs = context.getSharedPreferences("group.iit.calendar", Context.MODE_PRIVATE);

            String medStatsRaw = prefs.getString("meditation_stats", "{}");
            if (medStatsRaw == null) medStatsRaw = "{}";
            String chantStatsRaw = prefs.getString("chant_stats", "{}");
            if (chantStatsRaw == null) chantStatsRaw = "{}";
            String studyStatsRaw = prefs.getString("study_stats", "{}");
            if (studyStatsRaw == null) studyStatsRaw = "{}";

            int medStreakVal = 0;
            int medMonthMin = 0;
            try {
                JSONObject obj = new JSONObject(medStatsRaw);
                medStreakVal = obj.optInt("streak", 0);
                medMonthMin = obj.optInt("monthMinutes", 0);
            } catch (Exception e) { Log.e(TAG, "medStats parse error", e); }

            int chantStreakVal = 0;
            int chantMonthSessions = 0;
            try {
                JSONObject obj = new JSONObject(chantStatsRaw);
                chantStreakVal = obj.optInt("streak", 0);
                chantMonthSessions = obj.optInt("monthSessions", 0);
            } catch (Exception e) { Log.e(TAG, "chantStats parse error", e); }

            int studyStreakVal = 0;
            int studyMonthMin = 0;
            try {
                JSONObject obj = new JSONObject(studyStatsRaw);
                studyStreakVal = obj.optInt("streak", 0);
                studyMonthMin = obj.optInt("monthMinutes", 0);
            } catch (Exception e) { Log.e(TAG, "studyStats parse error", e); }

            Intent launchIntent = context.getPackageName() != null ?
                context.getPackageManager().getLaunchIntentForPackage(context.getPackageName()) : null;
            android.app.PendingIntent pendingIntent = null;
            if (launchIntent != null) {
                pendingIntent = android.app.PendingIntent.getActivity(
                    context, 0, launchIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );
            }

            for (int appWidgetId : appWidgetIds) {
                Log.d(TAG, "Updating widget id: " + appWidgetId);
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_stats);

                views.setTextViewText(R.id.tvMedStreak, medStreakVal + "d");
                views.setTextViewText(R.id.tvMedMonth, formatDuration(medMonthMin));

                views.setTextViewText(R.id.tvChantStreak, chantStreakVal + "d");
                views.setTextViewText(R.id.tvChantMonth, formatSessions(chantMonthSessions));

                views.setTextViewText(R.id.tvStudyStreak, studyStreakVal + "d");
                views.setTextViewText(R.id.tvStudyMonth, formatDuration(studyMonthMin));

                if (pendingIntent != null) {
                    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
                }

                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onUpdate", e);
        }
    }

    private static String formatDuration(int minutes) {
        if (minutes <= 0) return "0m";
        int h = minutes / 60;
        int m = minutes % 60;
        if (h > 0) {
            return m > 0 ? h + "h " + m + "m" : h + "h";
        }
        return m + "m";
    }

    private static String formatSessions(int count) {
        return count + " ses";
    }
}
