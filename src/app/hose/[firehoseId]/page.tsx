import { getFireHoseById } from "@/lib/fireHoseRepository";
import TouchButton from "@/app/_components/touch-button";
import HoseDetails from "@/app/_components/hose-details";
import Link from "next/link";

export interface HosePageProps {
  params: Promise<{
    firehoseId: string;
  }>;
}

export default async function HosePage({ params }: HosePageProps) {
  const { firehoseId } = await params;

  const firehose = await getFireHoseById(firehoseId);

  if (!firehose) {
    return <div>Schlauch nicht gefunden</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 gap-6">
      <h1 className="text-3xl font-bold">
        Schlauch: {firehose.owner.marker}-{firehose.number}
      </h1>
      <HoseDetails firehose={firehose} />
      <div className="flex gap-4 mt-6">
        <Link href="/">
          <TouchButton label="Abbrechen" />
        </Link>
        <Link href={`/hose/${firehose.id}/maintain`}>
          <TouchButton label="Reinigen & Prüfen" primary />
        </Link>
      </div>
    </main>
  );
}
