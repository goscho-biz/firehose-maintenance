"use client";

import Numpad from "@/app/_components/numpad";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TouchButton from "@/app/_components/touch-button";
import { lookupFirehoseId } from "@/lib/hoseActions";

export default function HoseSelector() {
  const owner = { id: "uFpFjeCOZass", name: "Murrhardt", marker: "BK-31" };
  const [hoseNumber, setHoseNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleNumpadValueChange = (value: string) => {
    setHoseNumber(value);
  };

  const lookupAndNavigate = async (action: "view" | "maintain") => {
    if (!hoseNumber) return;

    setIsLoading(true);
    try {
      const firehoseId = await lookupFirehoseId(parseInt(hoseNumber), owner.id);

      if (!firehoseId) {
        alert("Schlauch nicht gefunden");
        return;
      }

      const path =
        action === "maintain"
          ? `/hose/${firehoseId}/maintain`
          : `/hose/${firehoseId}`;

      router.push(path);
    } catch (error) {
      console.error("Error looking up firehose:", error);
      alert("Fehler beim Suchen des Schlauchs");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToHosePage = () => {
    lookupAndNavigate("view");
  };

  const navigateToHoseMaintenancePage = () => {
    lookupAndNavigate("maintain");
  };

  return (
    <div className={"flex flex-col items-center gap-6"}>
      <div className={"flex flex-row gap-3 h-20 items-center"}>
        <span className={"inline-block text-3xl"}>{owner.marker}</span>
        <span
          className={
            "block font-bold text-center text-3xl min-w-40 h-full border-2 p-5"
          }
        >
          {hoseNumber}
        </span>
      </div>
      <Numpad onValueChange={handleNumpadValueChange} />
      <div className={"flex flex-row gap-3 h-20 items-center"}>
        <TouchButton
          label="Anzeigen"
          disabled={!hoseNumber || isLoading}
          onClick={navigateToHosePage}
        />
        <TouchButton
          label="Reinigen & Prüfen"
          primary
          disabled={!hoseNumber || isLoading}
          onClick={navigateToHoseMaintenancePage}
        />
      </div>
    </div>
  );
}
