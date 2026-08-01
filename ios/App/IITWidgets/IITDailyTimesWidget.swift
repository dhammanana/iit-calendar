//
//  IITDailyTimesWidget.swift
//  IITWidgets
//
//  Created by Antigravity.
//

import WidgetKit
import SwiftUI

struct SunTimeEntry: Codable {
    let date: String
    let dawn: String
    let noon: String
}

struct DailyTimesEntry: TimelineEntry {
    let date: Date
    let dawnTime: String
    let noonTime: String
}

struct DailyTimesProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyTimesEntry {
        DailyTimesEntry(date: Date(), dawnTime: "--:--", noonTime: "--:--")
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyTimesEntry) -> Void) {
        let entry = getTodayTimesEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyTimesEntry>) -> Void) {
        let entry = getTodayTimesEntry()
        let currentDate = Date()
        let nextUpdateDate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate) ?? currentDate
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        completion(timeline)
    }

    private func getTodayTimesEntry() -> DailyTimesEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.iit.calendar")
        guard let sunTimesRaw = sharedDefaults?.string(forKey: "sun_times"),
              let data = sunTimesRaw.data(using: .utf8) else {
            return DailyTimesEntry(date: Date(), dawnTime: "--:--", noonTime: "--:--")
        }

        do {
            let entries = try JSONDecoder().decode([SunTimeEntry].self, from: data)
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            let todayStr = formatter.string(from: Date())

            if let todayEntry = entries.first(where: { $0.date == todayStr }) {
                return DailyTimesEntry(date: Date(), dawnTime: todayEntry.dawn, noonTime: todayEntry.noon)
            } else if let firstEntry = entries.first {
                return DailyTimesEntry(date: Date(), dawnTime: firstEntry.dawn, noonTime: firstEntry.noon)
            }
        } catch {
            print("Error decoding sun_times: \(error)")
        }

        return DailyTimesEntry(date: Date(), dawnTime: "--:--", noonTime: "--:--")
    }
}

struct IITDailyTimesWidgetView: View {
    var entry: DailyTimesProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Dawn Card
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 5) {
                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.15))
                            .frame(width: 20, height: 20)
                        Image(systemName: "sun.horizon.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.orange)
                    }
                    Text("Dawn")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                    Spacer()
                }

                Text(entry.dawnTime)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            .cornerRadius(12)

            // Noon Card
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 5) {
                    ZStack {
                        Circle()
                            .fill(Color.amberAccent.opacity(0.15))
                            .frame(width: 20, height: 20)
                        Image(systemName: "sun.max.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color.amberAccent)
                    }
                    Text("Noon")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                    Spacer()
                }

                Text(entry.noonTime)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(uiColor: .secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
        .padding(0)
        .widgetURL(URL(string: "iitcalendar://"))
    }
}

private extension Color {
    static var amberAccent: Color {
        Color(red: 234/255, green: 179/255, blue: 8/255)
    }
}

struct IITDailyTimesWidget: Widget {
    let kind: String = "IITDailyTimesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyTimesProvider()) { entry in
            if #available(iOS 17.0, *) {
                IITDailyTimesWidgetView(entry: entry)
                    .containerBackground(Color(uiColor: .systemGroupedBackground), for: .widget)
            } else {
                IITDailyTimesWidgetView(entry: entry)
                    .background(Color(uiColor: .systemGroupedBackground))
            }
        }
        .configurationDisplayName("Daily Times")
        .description("Displays daily dawn and noon times.")
        .supportedFamilies([.systemSmall])
    }
}
