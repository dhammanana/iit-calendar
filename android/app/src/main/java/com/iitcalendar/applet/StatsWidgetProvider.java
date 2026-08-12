package com.iitcalendar.applet;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
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

                views.setTextViewText(R.id.tvMedStreak, formatStreak(context, medStreakVal));
                views.setTextViewText(R.id.tvMedMonth, formatDuration(context, medMonthMin));

                views.setTextViewText(R.id.tvChantStreak, formatStreak(context, chantStreakVal));
                views.setTextViewText(R.id.tvChantMonth, formatSessions(context, chantMonthSessions));

                views.setTextViewText(R.id.tvStudyStreak, formatStreak(context, studyStreakVal));
                views.setTextViewText(R.id.tvStudyMonth, formatDuration(context, studyMonthMin));

                if (pendingIntent != null) {
                    views.setOnClickPendingIntent(android.R.id.background, pendingIntent);
                }

                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onUpdate", e);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, android.os.Bundle newOptions) {
        onUpdate(context, appWidgetManager, new int[]{appWidgetId});
    }

    private static CharSequence formatStreak(Context context, int days) {
        String numStr = String.valueOf(days);
        String fullText = numStr + "d";
        SpannableString spannable = new SpannableString(fullText);
        int numLen = numStr.length();
        int fullLen = fullText.length();

        spannable.setSpan(new RelativeSizeSpan(0.70f), numLen, fullLen, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        int secondaryColor = context.getColor(R.color.widget_text_secondary);
        spannable.setSpan(new ForegroundColorSpan(secondaryColor), numLen, fullLen, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        return spannable;
    }

    private static CharSequence formatDuration(Context context, int minutes) {
        int secondaryColor = context.getColor(R.color.widget_text_secondary);

        if (minutes <= 0) {
            SpannableString spannable = new SpannableString("0m");
            spannable.setSpan(new RelativeSizeSpan(0.70f), 1, 2, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
            spannable.setSpan(new ForegroundColorSpan(secondaryColor), 1, 2, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
            return spannable;
        }

        int h = minutes / 60;
        int m = minutes % 60;

        if (h > 0) {
            if (m > 0) {
                String hStr = String.valueOf(h);
                String mStr = String.valueOf(m);
                String fullText = hStr + "h " + mStr + "m";
                SpannableString spannable = new SpannableString(fullText);
                int hUnitEnd = hStr.length() + 2;

                spannable.setSpan(new RelativeSizeSpan(0.70f), hStr.length(), hUnitEnd, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                spannable.setSpan(new ForegroundColorSpan(secondaryColor), hStr.length(), hUnitEnd, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);

                spannable.setSpan(new RelativeSizeSpan(0.70f), fullText.length() - 1, fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                spannable.setSpan(new ForegroundColorSpan(secondaryColor), fullText.length() - 1, fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);

                return spannable;
            } else {
                String hStr = String.valueOf(h);
                String fullText = hStr + "h";
                SpannableString spannable = new SpannableString(fullText);
                spannable.setSpan(new RelativeSizeSpan(0.70f), hStr.length(), fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                spannable.setSpan(new ForegroundColorSpan(secondaryColor), hStr.length(), fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                return spannable;
            }
        } else {
            String mStr = String.valueOf(m);
            String fullText = mStr + "m";
            SpannableString spannable = new SpannableString(fullText);
            spannable.setSpan(new RelativeSizeSpan(0.70f), mStr.length(), fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
            spannable.setSpan(new ForegroundColorSpan(secondaryColor), mStr.length(), fullText.length(), Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
            return spannable;
        }
    }

    private static CharSequence formatSessions(Context context, int count) {
        String numStr = String.valueOf(count);
        String fullText = numStr + " ses";
        SpannableString spannable = new SpannableString(fullText);
        int numLen = numStr.length();
        int fullLen = fullText.length();

        spannable.setSpan(new RelativeSizeSpan(0.70f), numLen, fullLen, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        int secondaryColor = context.getColor(R.color.widget_text_secondary);
        spannable.setSpan(new ForegroundColorSpan(secondaryColor), numLen, fullLen, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
        return spannable;
    }
}
