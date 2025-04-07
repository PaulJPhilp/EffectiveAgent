
import { Temporal } from '@js-temporal/polyfill';

const now: Temporal.Instant = Temporal.Now.instant();
const today: Temporal.PlainDate = Temporal.Now.plainDateISO();
const duration: Temporal.Duration = Temporal.Duration.from({ hours: 2, minutes: 30 });

console.log(now.toString());
console.log(today.toString());
console.log(duration.total("minutes"));