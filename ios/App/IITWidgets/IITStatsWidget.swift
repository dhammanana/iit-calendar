//
//  IITStatsWidget.swift
//  IITWidgets
//
//  Created by Antigravity.
//

import WidgetKit
import SwiftUI

struct MeditationStats: Codable {
    let streak: Int?
    let monthMinutes: Int?
}

struct ChantStats: Codable {
    let streak: Int?
    let monthSessions: Int?
}

struct StudyStats: Codable {
    let streak: Int?
    let monthMinutes: Int?
}

struct StatsEntry: TimelineEntry {
    let date: Date
    let meditationStreak: Int
    let meditationMonth: Int
    let chantStreak: Int
    let chantMonth: Int
    let studyStreak: Int
    let studyMonth: Int
}

struct StatsProvider: TimelineProvider {
    func placeholder(in context: Context) -> StatsEntry {
        StatsEntry(
            date: Date(),
            meditationStreak: 0,
            meditationMonth: 0,
            chantStreak: 0,
            chantMonth: 0,
            studyStreak: 0,
            studyMonth: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (StatsEntry) -> Void) {
        let entry = getStatsEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StatsEntry>) -> Void) {
        let entry = getStatsEntry()
        let currentDate = Date()
        let nextUpdateDate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate) ?? currentDate
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        completion(timeline)
    }

    private func getStatsEntry() -> StatsEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.iit.calendar")
        
        let medStreak: Int
        let medMonth: Int
        if let medStatsRaw = sharedDefaults?.string(forKey: "meditation_stats"),
           let data = medStatsRaw.data(using: .utf8),
           let stats = try? JSONDecoder().decode(MeditationStats.self, from: data) {
            medStreak = stats.streak ?? 0
            medMonth = stats.monthMinutes ?? 0
        } else {
            medStreak = 0
            medMonth = 0
        }

        let chantStreak: Int
        let chantMonth: Int
        if let chantStatsRaw = sharedDefaults?.string(forKey: "chant_stats"),
           let data = chantStatsRaw.data(using: .utf8),
           let stats = try? JSONDecoder().decode(ChantStats.self, from: data) {
            chantStreak = stats.streak ?? 0
            chantMonth = stats.monthSessions ?? 0
        } else {
            chantStreak = 0
            chantMonth = 0
        }

        let studyStreak: Int
        let studyMonth: Int
        if let studyStatsRaw = sharedDefaults?.string(forKey: "study_stats"),
           let data = studyStatsRaw.data(using: .utf8),
           let stats = try? JSONDecoder().decode(StudyStats.self, from: data) {
            studyStreak = stats.streak ?? 0
            studyMonth = stats.monthMinutes ?? 0
        } else {
            studyStreak = 0
            studyMonth = 0
        }

        return StatsEntry(
            date: Date(),
            meditationStreak: medStreak,
            meditationMonth: medMonth,
            chantStreak: chantStreak,
            chantMonth: chantMonth,
            studyStreak: studyStreak,
            studyMonth: studyMonth
        )
    }
}

struct IITStatsWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: StatsProvider.Entry

    private func formatDuration(_ minutes: Int) -> String {
        if minutes <= 0 { return "0m" }
        let h = minutes / 60
        let m = minutes % 60
        if h > 0 {
            return m > 0 ? "\(h)h \(m)m" : "\(h)h"
        }
        return "\(m)m"
    }

    private func formatSessions(_ count: Int, isShort: Bool = true) -> String {
        return isShort ? "\(count) ses" : "\(count) sessions"
    }

    var body: some View {
        if family == .systemMedium {
            mediumLayout
        } else {
            smallLayout
        }
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 5) {
            smallRow(title: "Meditation", icon: "ic_meditation", color: Color(red: 5/255, green: 150/255, blue: 105/255), streak: entry.meditationStreak, month: formatDuration(entry.meditationMonth))
            smallRow(title: "Chanting", icon: "ic_chant", color: Color(red: 225/255, green: 29/255, blue: 72/255), streak: entry.chantStreak, month: formatSessions(entry.chantMonth, isShort: true))
            smallRow(title: "Studying", icon: "ic_study", color: Color(red: 79/255, green: 70/255, blue: 229/255), streak: entry.studyStreak, month: formatDuration(entry.studyMonth))
        }
        .padding(0)
        .widgetURL(URL(string: "iitcalendar://"))
    }

    private func smallRow(title: String, icon: String, color: Color, streak: Int, month: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 16, height: 16)
                    Image(icon)
                        .renderingMode(.template)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 10, height: 10)
                        .foregroundColor(color)
                }
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 2) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                    Text("\(streak)d")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                Spacer()
                Text(month)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundColor(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .cornerRadius(10)
    }

    private var mediumLayout: some View {
        HStack(spacing: 8) {
            mediumColumn(title: "Meditation", icon: "ic_meditation", color: Color(red: 5/255, green: 150/255, blue: 105/255), streak: entry.meditationStreak, month: formatDuration(entry.meditationMonth))
            mediumColumn(title: "Chanting", icon: "ic_chant", color: Color(red: 225/255, green: 29/255, blue: 72/255), streak: entry.chantStreak, month: formatSessions(entry.chantMonth, isShort: false))
            mediumColumn(title: "Studying", icon: "ic_study", color: Color(red: 79/255, green: 70/255, blue: 229/255), streak: entry.studyStreak, month: formatDuration(entry.studyMonth))
        }
        .padding(0)
        .widgetURL(URL(string: "iitcalendar://"))
    }

    private func mediumColumn(title: String, icon: String, color: Color, streak: Int, month: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 26, height: 26)
                    Image(icon)
                        .renderingMode(.template)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 14, height: 14)
                        .foregroundColor(color)
                }
                Spacer()
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 3) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                    Text("\(streak)d")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                }
                Text(month)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundColor(color)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

struct IITStatsWidget: Widget {
    let kind: String = "IITStatsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StatsProvider()) { entry in
            if #available(iOS 17.0, *) {
                IITStatsWidgetView(entry: entry)
                    .containerBackground(Color(uiColor: .systemGroupedBackground), for: .widget)
            } else {
                IITStatsWidgetView(entry: entry)
                    .background(Color(uiColor: .systemGroupedBackground))
            }
        }
        .configurationDisplayName("My Stats")
        .description("Displays meditation, chanting, and study stats.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
