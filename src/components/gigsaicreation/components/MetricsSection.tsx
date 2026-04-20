import { InfoText } from './InfoText';
import { predefinedOptions } from '../lib/guidance';

interface MetricsSectionProps {
  data: {
    kpis: string[];
    targets: { [key: string]: string };
  };
  onChange: (data: any) => void;
}

export function MetricsSection({ data, onChange }: MetricsSectionProps) {
  return (
    <div className="space-y-6">
      <InfoText>
        Select relevant KPIs and set target values for performance measurement. Consider both
        quantitative and qualitative metrics.
      </InfoText>

      <div className="space-y-4">
        {(predefinedOptions as any).metrics.kpis.map((kpi: string) => (
          <div key={kpi} className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={data.kpis.includes(kpi)}
              onChange={(e) => {
                const newKpis = e.target.checked
                  ? [...data.kpis, kpi]
                  : data.kpis.filter((k) => k !== kpi);
                onChange({
                  ...data,
                  kpis: newKpis
                });
              }}
              className="h-4 w-4 text-harx-600 rounded border-gray-300"
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">{kpi}</label>
              {data.kpis.includes(kpi) && (
                <input
                  type="text"
                  value={data.targets[kpi] || ''}
                  onChange={(e) => {
                    const newTargets = {
                      ...data.targets,
                      [kpi]: e.target.value
                    };
                    onChange({
                      ...data,
                      targets: newTargets
                    });
                  }}
                  placeholder="Enter target value"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-harx-500 focus:border-harx-500 text-sm"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
