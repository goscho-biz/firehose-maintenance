import MaintainHoseForm from "@/app/_components/maintain-hose-form";
import { redirect } from "next/navigation";
import { createMaintenance } from "@/lib/maintenanceRepository";
import { getFireHoseById } from "@/lib/fireHoseRepository";
import { requireAuth } from "@/lib/requireAuth";

export interface HoseMaintenancePageProps {
  params: Promise<{
    firehoseId: string;
  }>;
}

export default async function HoseMaintenancePage({
  params,
}: HoseMaintenancePageProps) {
  const { firehoseId } = await params;

  const session = await requireAuth();
  const username = session?.user?.name;

  if (!username) {
    console.log(
      "no user found in session - redirecting to home",
      "session",
      session,
    );
    redirect("/");
  }

  const firehose = await getFireHoseById(firehoseId);

  if (!firehose) {
    console.log(`firehose ${firehoseId} not found`);
    redirect("/");
  }

  const defectDescriptions = [
    "Einband defekt",
    "Loch im Schlauch",
    "sonstiges",
  ];

  const success = async () => {
    "use server";
    console.log("check succeeded", firehoseId);

    await createMaintenance({
      username: username,
      fireHoseId: firehose.id,
      testPassed: true,
      failureDescription: null,
      timestamp: new Date(),
    });
    console.log("maintenance saved", firehoseId);
    redirect("/");
  };

  const failed = async (msg: string) => {
    "use server";
    console.log("check failed - reason: ", msg);
    await createMaintenance({
      username: username,
      fireHoseId: firehose.id,
      testPassed: false,
      failureDescription: msg,
      timestamp: new Date(),
    });
    redirect("/");
  };

  return (
    <div className={"flex flex-col gap-5 items-center w-full"}>
      <h2 className={"text-2xl"}>
        Schlauch {firehose.owner.marker}-{firehose.number} reinigen und prüfen
      </h2>
      <MaintainHoseForm
        defectDescriptions={defectDescriptions}
        onCheckSuccess={success}
        onCheckFailed={failed}
      />
    </div>
  );
}
