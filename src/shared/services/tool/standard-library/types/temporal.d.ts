declare module "@js-temporal/polyfill" {
    export namespace Temporal {
        export class ZonedDateTime {
            static from(value: string): ZonedDateTime
            timeZoneId: string
            offset: string
            toString(): string
            toLocaleString(locale: string, options?: Intl.DateTimeFormatOptions): string
            withTimeZone(timeZone: string): ZonedDateTime
            add(duration: Duration): ZonedDateTime
            subtract(duration: Duration): ZonedDateTime
            until(other: ZonedDateTime | PlainDateTime): Duration
        }

        export class PlainDateTime {
            static from(value: string): PlainDateTime
            toString(): string
            toLocaleString(locale: string, options?: Intl.DateTimeFormatOptions): string
            add(duration: Duration): PlainDateTime
            subtract(duration: Duration): PlainDateTime
            until(other: ZonedDateTime | PlainDateTime): Duration
        }

        export class Duration {
            static from(durationLike: Record<string, number>): Duration
            toString(): string
            total(unit: string): number
        }

        export namespace Now {
            export function zonedDateTimeISO(timeZone: string): ZonedDateTime
        }
    }
} 