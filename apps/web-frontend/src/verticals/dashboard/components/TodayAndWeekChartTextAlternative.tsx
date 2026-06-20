type DailyStat = {
  eaten: number;
  limit: number;
};

type WeeklyStat = DailyStat & {
  label: string;
};

type Unit = "calorie" | "gram";

type ChartTextAlternativeProps = {
  today: DailyStat;
  describedById: string;
  metricLabel: string;
  unit: Unit;
  weeklyData: WeeklyStat[];
};

type WeeklyComparison = WeeklyStat & {
  difference: number;
  percentFromLimit: number;
};

const DAY_LABELS: Record<string, string> = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  Th: "Thursday",
  F: "Friday",
  Sa: "Saturday",
  Sn: "Sunday",
};

const formatNumber = (value: number) => value.toLocaleString();

const formatDayLabel = (label: string) => DAY_LABELS[label] ?? label;

const formatList = (values: string[]) => {
  if (values.length <= 2) {
    return values.join(" and ");
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const pluralizeUnit = (unit: Unit) => {
  switch (unit) {
    case "calorie":
      return "calories";
    case "gram":
      return "grams";
  }
};

const formatUnitAmount = (value: number, unit: Unit) => {
  const unitLabel = value === 1 ? unit : pluralizeUnit(unit);

  return `${formatNumber(value)} ${unitLabel}`;
};

const formatDeltaStatus = (delta: number, unit: Unit) => {
  if (delta === 0) {
    return "at limit";
  }

  const absoluteDelta = Math.abs(delta);
  const direction = delta > 0 ? "under" : "over";

  return `${formatUnitAmount(absoluteDelta, unit)} ${direction} limit`;
};

const toWeeklyComparison = (datum: WeeklyStat): WeeklyComparison => {
  const difference = datum.eaten - datum.limit;
  const percentFromLimit = datum.limit === 0 ? 0 : (Math.abs(difference) / datum.limit) * 100;

  return {
    ...datum,
    difference,
    percentFromLimit,
  };
};

const averagePercent = (comparisons: WeeklyComparison[]) => {
  if (!comparisons.length) {
    return 0;
  }

  const totalPercent = comparisons.reduce((sum, datum) => sum + datum.percentFromLimit, 0);

  return totalPercent / comparisons.length;
};

const maxByPercent = (comparisons: WeeklyComparison[]) =>
  comparisons.reduce((highest, datum) =>
    datum.percentFromLimit > highest.percentFromLimit ? datum : highest,
  );

const formatTrendSentence = ({
  comparisons,
  direction,
  extremumLabel,
  limitPhrase,
  unit,
}: {
  comparisons: WeeklyComparison[];
  direction: "over" | "under";
  extremumLabel: "highest" | "lowest";
  limitPhrase: string;
  unit: Unit;
}) => {
  if (!comparisons.length) {
    return `No days were ${direction} their limits.`;
  }

  const dayNames = comparisons.map(({ label }) => formatDayLabel(label));
  const daysText = formatList(dayNames);
  const verb = comparisons.length === 1 ? "was" : "were";
  const average = formatPercent(averagePercent(comparisons));
  const firstComparison = comparisons[0];

  if (comparisons.length === 1) {
    const amount = formatUnitAmount(Math.abs(firstComparison.difference), unit);

    return `${daysText} ${verb} ${direction} ${limitPhrase} by an average of ${average}, or ${amount}.`;
  }

  const extremum = maxByPercent(comparisons);
  const extremumDay = formatDayLabel(extremum.label);
  const extremumPercent = formatPercent(extremum.percentFromLimit);
  const extremumAmount = formatUnitAmount(Math.abs(extremum.difference), unit);

  return `${daysText} ${verb} ${direction} ${limitPhrase} by an average of ${average}, the ${extremumLabel} being ${extremumDay} at ${extremumPercent} ${direction}, or ${extremumAmount}.`;
};

const formatWeeklyTrendSummary = ({
  unit,
  weeklyData,
}: Pick<ChartTextAlternativeProps, "unit" | "weeklyData">) => {
  const comparisons = weeklyData.map(toWeeklyComparison);
  const overLimit = comparisons.filter(({ difference }) => difference > 0);
  const underLimit = comparisons.filter(({ difference }) => difference < 0);

  return [
    formatTrendSentence({
      comparisons: overLimit,
      direction: "over",
      extremumLabel: "highest",
      limitPhrase: overLimit.length === 1 ? "its limit" : "their limits",
      unit,
    }),
    formatTrendSentence({
      comparisons: underLimit,
      direction: "under",
      extremumLabel: "lowest",
      limitPhrase: underLimit.length === 1 ? "its limit" : "their limits",
      unit,
    }),
  ].join(" ");
};

const formatDailySummary = ({
  today,
  metricLabel,
  unit,
  weeklyData,
}: Pick<ChartTextAlternativeProps, "today" | "metricLabel" | "unit" | "weeklyData">) => {
  const delta = today.limit - today.eaten;
  const weeklySummary = formatWeeklyTrendSummary({ unit, weeklyData });
  const pluralUnit = pluralizeUnit(unit);

  if (metricLabel === "Calories") {
    return `Today: ${formatNumber(today.eaten)} ${pluralUnit} eaten out of a ${formatNumber(today.limit)} ${unit} limit, ${formatDeltaStatus(delta, unit)}. ${weeklySummary}`;
  }

  return `Today: ${formatNumber(today.eaten)} ${pluralUnit} of ${metricLabel.toLowerCase()} eaten out of a ${formatNumber(today.limit)} ${unit} limit, ${formatDeltaStatus(delta, unit)}. ${weeklySummary}`;
};

export const TodayAndWeekChartTextAlternative = ({
  today,
  describedById,
  metricLabel,
  unit,
  weeklyData,
}: ChartTextAlternativeProps) => {
  const lowerMetricLabel = metricLabel.toLowerCase();

  return (
    <div className="sr-only">
      <p id={describedById}>{formatDailySummary({ today, metricLabel, unit, weeklyData })}</p>
      <table>
        <caption>Weekly {lowerMetricLabel} eaten and limits</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Eaten</th>
            <th scope="col">Limit</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {weeklyData.map((datum) => (
            <tr key={datum.label}>
              <th scope="row">{datum.label}</th>
              <td>
                {formatNumber(datum.eaten)} {pluralizeUnit(unit)}
              </td>
              <td>
                {formatNumber(datum.limit)} {pluralizeUnit(unit)}
              </td>
              <td>{formatDeltaStatus(datum.limit - datum.eaten, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
