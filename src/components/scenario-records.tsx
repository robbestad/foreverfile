import { RecordRow } from "@/components/record-row";
import { SCENARIO_RECORDS } from "@/lib/examples";
import { create } from "svenjs";

export const ScenarioRecords = create({
  render() {
    return (
      <section className="mt-16 sm:mt-20">
        <h2 className="text-sm font-medium text-muted">What people publish</h2>
        <div className="mt-4 flex flex-col gap-3">
          {SCENARIO_RECORDS.map((record) => (
            <RecordRow
              key={record.id}
              record={record}
              stamp={record.stamp}
              detail={record.caption}
            />
          ))}
        </div>
      </section>
    );
  },
});
